// Gold-exchange booking, reschedule/cancel, status, aggregation, and availability functions.
import { FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  canTransitionExchangeStatus,
  normalizeExchangeStatus,
  type ExchangeStatus,
} from "../bookingPolicy.js";
import {
  db,
  ENFORCE_APP_CHECK,
  requireCurrentAdmin,
  requireVerifiedUser,
  DON_TO_GRAMS,
  DEFAULT_PURITY,
  DEFAULT_EXCHANGE,
  DEFAULT_GOLD_RATES_VERSION,
  roundTo3,
  BOOKING_TIME_SLOTS,
  CUSTOMER_EDITABLE_EXCHANGE_STATUSES,
  ACTIVE_EXCHANGE_STATUSES,
  MAX_ACTIVE_BOOKING_GROUPS_PER_USER,
  MAX_NAME_LENGTH,
  MAX_CONSENT_VERSION_LENGTH,
  BOOKING_AVAILABILITY_REF,
  assertBookingOpen,
  validateBookingSchedule,
  normalizeRequiredString,
  normalizePhone,
  validateProducts,
  buildValidatedBarsPlan,
  normalizeCustomerReason,
  reservedTimesForDate,
  setReservedTime,
  computeFinalWeightFromRates,
  addNotificationForUser,
  addNotificationForAdmins,
} from "../core/runtime.js";
import { reconcileBonusUsageForGroup } from "../rewards/reconciliation.js";

/* ─────────────────────────────────────────────────────────────
 * 3) 그룹 생성 + 슬롯 선점 (사용자 제출)
 * ───────────────────────────────────────────────────────────── */
export const requestGoldExchangeGroup = onCall<{
  visitDate: string;
  visitTime: string;
  name: string;
  phone: string;
  privacyConsent: boolean;
  privacyConsentVersion: string;
  products?: Array<{
    goldType?: string;
    quantity?: number;
    inputUnit?: "g" | "don";
    exchangeType?: string;
  }>;
  barsPlan?: Record<string, unknown> | null;
}>({ region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const uid = await requireVerifiedUser(req.auth?.uid);

  const {
    visitDate,
    visitTime,
    name,
    phone,
    privacyConsent,
    privacyConsentVersion,
    products = [],
    barsPlan = null,
  } = (req.data || {}) as {
    visitDate?: string;
    visitTime?: string;
    name?: string;
    phone?: string;
    privacyConsent?: boolean;
    privacyConsentVersion?: string;
    products?: Array<{
      goldType?: string;
      quantity?: number;
      inputUnit?: "g" | "don";
      exchangeType?: string;
    }>;
    barsPlan?: Record<string, unknown> | null;
  };

  const normalizedVisitDate = normalizeRequiredString(visitDate, "방문 날짜", 10, 10);
  const normalizedVisitTime = normalizeRequiredString(visitTime, "방문 시간", 5, 5);
  const normalizedName = normalizeRequiredString(name, "성명", MAX_NAME_LENGTH, 2);
  const normalizedPhone = normalizePhone(phone);
  const normalizedConsentVersion = normalizeRequiredString(
    privacyConsentVersion,
    "개인정보 동의 버전",
    MAX_CONSENT_VERSION_LENGTH
  );
  const validatedProducts = validateProducts(products);

  validateBookingSchedule(normalizedVisitDate, normalizedVisitTime);
  if (privacyConsent !== true) {
    throw new HttpsError("invalid-argument", "개인정보 수집·이용 동의가 필요합니다.");
  }

  const ratesSnap = await db().doc("appConfig/goldRates").get();
  const rates = ratesSnap.exists
    ? (ratesSnap.data() as {
        purity?: Record<string, number>;
        exchange?: Record<string, number>;
        version?: number;
      })
    : {
        purity: DEFAULT_PURITY,
        exchange: DEFAULT_EXCHANGE,
        version: DEFAULT_GOLD_RATES_VERSION,
      };
  const rateVersion = Number(rates.version) || DEFAULT_GOLD_RATES_VERSION;

  const slotsRef = db().doc("appConfig/reservedSlots");
  const availabilityRef = db().doc(BOOKING_AVAILABILITY_REF);
  const exchanges = db().collection("goldExchanges");

  // 첫 문서 ref를 미리 만들어서 groupId로 사용
  const firstRef = exchanges.doc();
  const groupId = firstRef.id;
  const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
  const now = FieldValue.serverTimestamp();

  const calculatedProducts = validatedProducts.map((product) => {
    const finalWeight = computeFinalWeightFromRates({
      grams: product.grams,
      goldType: product.goldType,
      exchangeType: product.exchangeType,
      purity: rates.purity,
      exchange: rates.exchange,
    });
    return { ...product, finalWeight };
  });
  const totalFinalGrams = roundTo3(
    calculatedProducts.reduce((sum, product) => sum + product.finalWeight, 0)
  );
  const validatedBarsPlan =
    calculatedProducts.length > 0
      ? buildValidatedBarsPlan(barsPlan, totalFinalGrams)
      : null;

  await db().runTransaction(async (tx) => {
    const [sSnap, availabilitySnap, userBookingsSnapshot] = await Promise.all([
      tx.get(slotsRef),
      tx.get(availabilityRef),
      tx.get(exchanges.where("userId", "==", uid)),
    ]);
    const sData = sSnap.exists ? (sSnap.data() as Record<string, unknown>) : {};
    assertBookingOpen(
      availabilitySnap.exists ? availabilitySnap.data() : {},
      normalizedVisitDate,
      normalizedVisitTime
    );

    const activeGroupIds = new Set<string>();
    userBookingsSnapshot.docs.forEach((document) => {
      const row = document.data() || {};
      if (ACTIVE_EXCHANGE_STATUSES.has(String(row.status || "requested"))) {
        activeGroupIds.add(String(row.groupId || document.id));
      }
    });
    if (activeGroupIds.size >= MAX_ACTIVE_BOOKING_GROUPS_PER_USER) {
      throw new HttpsError(
        "resource-exhausted",
        `진행 중인 예약은 계정당 최대 ${MAX_ACTIVE_BOOKING_GROUPS_PER_USER}건까지 가능합니다.`
      );
    }

    const taken = reservedTimesForDate(sData, normalizedVisitDate).has(normalizedVisitTime);
    if (taken) throw new HttpsError("aborted", "이미 예약된 시간입니다.");

    tx.set(
      slotsRef,
      setReservedTime(sData, normalizedVisitDate, normalizedVisitTime, true)
    );

    if (calculatedProducts.length > 0) {
      for (let i = 0; i < calculatedProducts.length; i++) {
        const p = calculatedProducts[i];
        const docRef = i === 0 ? firstRef : exchanges.doc();
        tx.set(
          docRef,
          {
            userId: uid,
            groupId,
            createdAt: now,
            updatedAt: now,
            status: "requested",
            unknown: false,
            name: normalizedName,
            phone: normalizedPhone,
            visitDate: normalizedVisitDate,
            visitTime: normalizedVisitTime,
            privacyConsent: true,
            privacyConsentVersion: normalizedConsentVersion,
            privacyConsentAt: now,
            originalQuantity: p.quantity,
            inputUnit: p.inputUnit,
            quantity: p.grams,
            goldType: p.goldType,
            exchangeType: p.exchangeType,
            finalWeight: roundTo3(p.finalWeight),
            finalWeightDon: roundTo3(p.finalWeight / DON_TO_GRAMS),
            purityUsed: rates.purity?.[p.goldType] ?? DEFAULT_PURITY[p.goldType],
            exchangeRatioUsed:
              rates.exchange?.[p.exchangeType] ?? DEFAULT_EXCHANGE[p.exchangeType],
            calcVersion: 5,
            rateVersion,
            ...(validatedBarsPlan ? { barsPlan: validatedBarsPlan } : {}),
          } as FirebaseFirestore.DocumentData
        );
      }
    } else {
      // 현장 확인 only
      tx.set(
        firstRef,
        {
          userId: uid,
          groupId,
          createdAt: now,
          updatedAt: now,
          status: "requested",
          unknown: true,
          name: normalizedName,
          phone: normalizedPhone,
          visitDate: normalizedVisitDate,
          visitTime: normalizedVisitTime,
          privacyConsent: true,
          privacyConsentVersion: normalizedConsentVersion,
          privacyConsentAt: now,
          goldType: "미확인",
          exchangeType: "999.9골드바",
          originalQuantity: 0,
          inputUnit: "g",
          quantity: 0,
          finalWeight: 0,
          finalWeightDon: 0,
          calcVersion: 5,
          rateVersion,
        } as FirebaseFirestore.DocumentData
      );
    }

    // 고객/관리자 화면이 집계 트리거를 기다리지 않고 즉시 바뀌도록
    // 그룹 요약 문서도 같은 트랜잭션에서 함께 갱신합니다.
    tx.set(
      groupMetaRef,
      {
        ownerUid: uid,
        repStatus: "requested",
        visitDate: normalizedVisitDate,
        visitTime: normalizedVisitTime,
        totalG: totalFinalGrams,
        totalDon: roundTo3(totalFinalGrams / DON_TO_GRAMS),
        createdAt: now,
        updatedAt: now,
        ...(validatedBarsPlan ? { barsPlan: validatedBarsPlan } : {}),
      } as FirebaseFirestore.DocumentData,
      { merge: true }
    );
  });

  // 사용자와 관리자 알림은 예약 저장 성공 여부에 영향을 주지 않도록 분리합니다.
  const notificationResults = await Promise.allSettled([
    addNotificationForUser(uid, {
      type: "exchange_requested",
      title: "금교환 예약 신청이 접수되었습니다",
      body: `${normalizedVisitDate} ${normalizedVisitTime} 방문 예약 신청이 접수되었습니다. 관리자 확인 후 예약 확정 알림을 보내드립니다.`,
      link: "/my-exchanges",
      meta: { groupId },
    }),
    addNotificationForAdmins({
      type: "admin_exchange_requested",
      title: "새 금교환 예약 확인이 필요합니다",
      body: `${normalizedName}님 · ${normalizedVisitDate} ${normalizedVisitTime} 방문 예약 신청`,
      link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
      meta: {
        groupId,
        visitDate: normalizedVisitDate,
        visitTime: normalizedVisitTime,
        customerUid: uid,
      },
    }),
  ]);
  notificationResults.forEach((result) => {
    if (result.status === "rejected") {
      console.error("[requestGoldExchangeGroup] 알림 생성 실패", result.reason);
    }
  });

  return { ok: true, groupId };
});

type CustomerEditableGroup = {
  documents: FirebaseFirestore.DocumentSnapshot[];
  visitDate: string;
  visitTime: string;
  customerName: string;
};

async function getCustomerEditableGroup(
  tx: FirebaseFirestore.Transaction,
  groupId: string,
  uid: string
): Promise<CustomerEditableGroup> {
  const collection = db().collection("goldExchanges");
  const groupSnapshot = await tx.get(collection.where("groupId", "==", groupId));
  const documents: FirebaseFirestore.DocumentSnapshot[] = [...groupSnapshot.docs];
  if (documents.length === 0) {
    const single = await tx.get(collection.doc(groupId));
    if (single.exists) documents.push(single);
  }
  if (documents.length === 0) {
    throw new HttpsError("not-found", "금교환 예약을 찾을 수 없습니다.");
  }

  const rows = documents.map((document) => document.data() || {});
  if (rows.some((row) => String(row.userId || "") !== uid)) {
    throw new HttpsError("permission-denied", "본인의 예약만 변경하거나 취소할 수 있습니다.");
  }
  if (
    rows.some(
      (row) => !CUSTOMER_EDITABLE_EXCHANGE_STATUSES.has(String(row.status || "requested"))
    )
  ) {
    throw new HttpsError(
      "failed-precondition",
      "접수 대기 또는 예약 승인 상태에서만 일정 변경과 취소가 가능합니다."
    );
  }

  const visitDates = new Set(rows.map((row) => String(row.visitDate || "")).filter(Boolean));
  const visitTimes = new Set(rows.map((row) => String(row.visitTime || "")).filter(Boolean));
  if (visitDates.size !== 1 || visitTimes.size !== 1) {
    throw new HttpsError("failed-precondition", "현재 예약 일정을 확인할 수 없습니다.");
  }

  return {
    documents,
    visitDate: [...visitDates][0],
    visitTime: [...visitTimes][0],
    customerName: String(rows.find((row) => row.name)?.name || "고객"),
  };
}

export const rescheduleGoldExchangeGroup = onCall<{
  groupId: string;
  visitDate: string;
  visitTime: string;
  reason: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = await requireVerifiedUser(req.auth?.uid);

    const groupId = String(req.data?.groupId || "").trim();
    const visitDate = String(req.data?.visitDate || "").trim();
    const visitTime = String(req.data?.visitTime || "").trim();
    const reason = normalizeCustomerReason(req.data?.reason);
    if (!groupId) throw new HttpsError("invalid-argument", "예약 정보를 확인해 주세요.");
    validateBookingSchedule(visitDate, visitTime);

    const slotsRef = db().doc("appConfig/reservedSlots");
    const availabilityRef = db().doc(BOOKING_AVAILABILITY_REF);
    const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
    const now = FieldValue.serverTimestamp();
    const result = await db().runTransaction(async (tx) => {
      const group = await getCustomerEditableGroup(tx, groupId, uid);
      const [slotsSnapshot, availabilitySnapshot] = await Promise.all([
        tx.get(slotsRef),
        tx.get(availabilityRef),
      ]);
      const slots = slotsSnapshot.exists
        ? (slotsSnapshot.data() as Record<string, unknown>)
        : {};
      assertBookingOpen(
        availabilitySnapshot.exists ? availabilitySnapshot.data() : {},
        visitDate,
        visitTime
      );

      if (group.visitDate === visitDate && group.visitTime === visitTime) {
        throw new HttpsError("invalid-argument", "현재 예약과 다른 날짜 또는 시간을 선택해 주세요.");
      }
      if (reservedTimesForDate(slots, visitDate).has(visitTime)) {
        throw new HttpsError("aborted", "이미 예약된 시간입니다. 다른 시간을 선택해 주세요.");
      }

      const releasedSlots = setReservedTime(
        slots,
        group.visitDate,
        group.visitTime,
        false
      );
      tx.set(slotsRef, setReservedTime(releasedSlots, visitDate, visitTime, true));
      group.documents.forEach((document) => {
        tx.update(document.ref, {
          status: "requested",
          visitDate,
          visitTime,
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "rescheduled",
          scheduleChangeReason: reason,
          scheduleChangeRequestedAt: now,
          scheduleChangeRequestedBy: uid,
          scheduledAt: FieldValue.delete(),
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: uid,
        });
      });

      tx.set(
        groupMetaRef,
        {
          ownerUid: uid,
          repStatus: "requested",
          visitDate,
          visitTime,
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "rescheduled",
          scheduleChangeReason: reason,
          scheduleChangeRequestedAt: now,
          scheduleChangeRequestedBy: uid,
          scheduledAt: FieldValue.delete(),
          updatedAt: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      return {
        previousVisitDate: group.visitDate,
        previousVisitTime: group.visitTime,
        customerName: group.customerName,
      };
    });

    await reconcileBonusUsageForGroup({ groupId, targetStatus: "requested", adminUid: uid });
    const notificationResults = await Promise.allSettled([
      addNotificationForUser(uid, {
        type: "exchange_reschedule_requested",
        title: "예약 일정 변경 요청이 접수되었습니다",
        body: `${visitDate} ${visitTime} 일정으로 변경 요청이 접수되었습니다. 관리자 확인 후 변경된 예약 확정 알림을 보내드립니다.`,
        link: "/my-exchanges",
        meta: {
          groupId,
          previousVisitDate: result.previousVisitDate,
          previousVisitTime: result.previousVisitTime,
          visitDate,
          visitTime,
          reason,
        },
      }),
      addNotificationForAdmins({
        type: "admin_exchange_rescheduled",
        title: "예약 일정 변경 확인이 필요합니다",
        body: `${result.customerName}님 · ${result.previousVisitDate} ${result.previousVisitTime} → ${visitDate} ${visitTime} · ${reason}`,
        link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
        meta: {
          groupId,
          customerUid: uid,
          previousVisitDate: result.previousVisitDate,
          previousVisitTime: result.previousVisitTime,
          visitDate,
          visitTime,
          reason,
        },
      }),
    ]);
    notificationResults.forEach((notificationResult) => {
      if (notificationResult.status === "rejected") {
        console.error("[rescheduleGoldExchangeGroup] 알림 생성 실패", notificationResult.reason);
      }
    });

    return { ok: true, groupId, visitDate, visitTime };
  }
);

export const cancelGoldExchangeGroup = onCall<{ groupId: string; reason: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const groupId = String(req.data?.groupId || "").trim();
    const reason = normalizeCustomerReason(req.data?.reason);
    if (!groupId) throw new HttpsError("invalid-argument", "예약 정보를 확인해 주세요.");

    const slotsRef = db().doc("appConfig/reservedSlots");
    const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
    const now = FieldValue.serverTimestamp();
    const result = await db().runTransaction(async (tx) => {
      const group = await getCustomerEditableGroup(tx, groupId, uid);
      const slotsSnapshot = await tx.get(slotsRef);
      const slots = slotsSnapshot.exists
        ? (slotsSnapshot.data() as Record<string, unknown>)
        : {};
      tx.set(slotsRef, setReservedTime(slots, group.visitDate, group.visitTime, false));
      group.documents.forEach((document) => {
        tx.update(document.ref, {
          status: "canceled",
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "canceled",
          cancellationReason: reason,
          cancellationRequestedAt: now,
          cancellationRequestedBy: uid,
          canceledAt: now,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: uid,
        });
      });

      tx.set(
        groupMetaRef,
        {
          ownerUid: uid,
          repStatus: "canceled",
          visitDate: group.visitDate,
          visitTime: group.visitTime,
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "canceled",
          cancellationReason: reason,
          cancellationRequestedAt: now,
          cancellationRequestedBy: uid,
          canceledAt: now,
          updatedAt: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      return {
        visitDate: group.visitDate,
        visitTime: group.visitTime,
        customerName: group.customerName,
      };
    });

    await reconcileBonusUsageForGroup({ groupId, targetStatus: "canceled", adminUid: uid });
    const notificationResults = await Promise.allSettled([
      addNotificationForUser(uid, {
        type: "exchange_canceled_by_customer",
        title: "금교환 예약이 취소되었습니다",
        body: `${result.visitDate} ${result.visitTime} 방문 예약이 취소되었습니다.`,
        link: "/my-exchanges",
        meta: { groupId, ...result, reason },
      }),
      addNotificationForAdmins({
        type: "admin_exchange_canceled_by_customer",
        title: "고객이 금교환 예약을 취소했습니다",
        body: `${result.customerName}님 · ${result.visitDate} ${result.visitTime} · ${reason}`,
        link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
        meta: { groupId, customerUid: uid, ...result, reason },
      }),
    ]);
    notificationResults.forEach((notificationResult) => {
      if (notificationResult.status === "rejected") {
        console.error("[cancelGoldExchangeGroup] 알림 생성 실패", notificationResult.reason);
      }
    });

    return { ok: true, groupId };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 4) 그룹 상태 일괄 변경 (관리자)
 * ───────────────────────────────────────────────────────────── */
export const setExchangeGroupStatus = onCall<{
  groupId: string;
  status: "requested" | "scheduled" | "in_progress" | "completed" | "canceled" | "rejected";
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);

    const groupId = String(req.data?.groupId || "").trim();
    const status = String(req.data?.status || "").trim() as
      | "requested"
      | "scheduled"
      | "in_progress"
      | "completed"
      | "canceled"
      | "rejected";
    const allowedStatuses = new Set([
      "requested",
      "scheduled",
      "in_progress",
      "completed",
      "canceled",
      "rejected",
    ]);
    if (!groupId || !allowedStatuses.has(status)) {
      throw new HttpsError("invalid-argument", "교환 그룹과 변경 상태를 확인해 주세요.");
    }

    const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
    const col = db().collection("goldExchanges");
    const slotsRef = db().doc("appConfig/reservedSlots");
    const now = FieldValue.serverTimestamp();
    const adminUid = req.auth?.uid || "system";

    const result = await db().runTransaction(async (tx) => {
      const groupQuery = col.where("groupId", "==", groupId);
      const [groupMetaSnap, groupSnapshot] = await Promise.all([
        tx.get(groupMetaRef),
        tx.get(groupQuery),
      ]);
      const bonusUsageStatus = String(groupMetaSnap.get("bonusGoldUsageStatus") || "");
      if (status === "completed" && bonusUsageStatus === "requested") {
        throw new HttpsError(
          "failed-precondition",
          "적립 순금 사용 신청을 먼저 확정하거나 취소해 주세요."
        );
      }

      let documents: FirebaseFirestore.DocumentSnapshot[] = [...groupSnapshot.docs];

      if (documents.length === 0) {
        const single = await tx.get(col.doc(groupId));
        if (single.exists) documents = [single];
      }
      if (documents.length === 0) {
        throw new HttpsError("not-found", "그룹을 찾을 수 없습니다.");
      }

      const rows = documents.map((document) => document.data() || {});
      const visitDates = new Set(rows.map((row) => String(row.visitDate || "")).filter(Boolean));
      const visitTimes = new Set(rows.map((row) => String(row.visitTime || "")).filter(Boolean));
      if (visitDates.size !== 1 || visitTimes.size !== 1) {
        throw new HttpsError("failed-precondition", "예약 날짜와 시간이 일치하지 않습니다.");
      }

      const visitDate = [...visitDates][0];
      const visitTime = [...visitTimes][0];
      const currentStatuses = new Set(
        rows.map((row) => String(row.status || "requested"))
      );

      const normalizedCurrentStatuses = [...currentStatuses].map((value) =>
        normalizeExchangeStatus(value)
      );
      if (normalizedCurrentStatuses.some((value) => !value)) {
        throw new HttpsError("failed-precondition", "현재 예약 상태를 확인할 수 없습니다.");
      }
      const current = normalizedCurrentStatuses[0] as ExchangeStatus;
      if (normalizedCurrentStatuses.some((value) => value !== current)) {
        throw new HttpsError("failed-precondition", "그룹 내 예약 상태가 서로 달라 확인이 필요합니다.");
      }
      const target = status as ExchangeStatus;
      if (!canTransitionExchangeStatus(current, target)) {
        throw new HttpsError(
          "failed-precondition",
          `${current} 상태에서 ${target} 상태로 변경할 수 없습니다.`
        );
      }
      if (current === target) {
        return {
          targetUid: String(rows.find((row) => row.userId)?.userId || ""),
          visitDate,
          visitTime,
          scheduleChangeType: "",
          previousVisitDate: "",
          previousVisitTime: "",
          bonusUsageStatus,
          changed: false,
        };
      }

      const targetUid = String(rows.find((row) => row.userId)?.userId || "");
      const scheduleRow =
        rows.find((row) => String(row.scheduleChangeType || "") === "rescheduled") ||
        rows.find((row) => row.scheduleChangeType);
      const scheduleChangeType = String(scheduleRow?.scheduleChangeType || "");
      const previousVisitDate = String(scheduleRow?.previousVisitDate || "");
      const previousVisitTime = String(scheduleRow?.previousVisitTime || "");

      const [slotsSnapshot, availabilitySnapshot] = await Promise.all([
        tx.get(slotsRef),
        tx.get(db().doc(BOOKING_AVAILABILITY_REF)),
      ]);
      const slots = slotsSnapshot.exists
        ? (slotsSnapshot.data() as Record<string, unknown>)
        : {};

      let nextSlots = slots;
      if (status === "requested") {
        const isRestoringReleasedReservation = [...currentStatuses].some(
          (currentStatus) => currentStatus === "rejected"
        );
        if (isRestoringReleasedReservation) {
          assertBookingOpen(
            availabilitySnapshot.exists ? availabilitySnapshot.data() : {},
            visitDate,
            visitTime
          );
          if (reservedTimesForDate(slots, visitDate).has(visitTime)) {
            throw new HttpsError(
              "already-exists",
              "해당 시간은 이미 다른 고객이 예약했습니다. 다른 시간으로 변경한 뒤 복구해 주세요."
            );
          }
          nextSlots = setReservedTime(slots, visitDate, visitTime, true);
        }
      } else if (status === "canceled" || status === "rejected") {
        nextSlots = setReservedTime(slots, visitDate, visitTime, false);
      }

      if (nextSlots !== slots) {
        tx.set(slotsRef, nextSlots);
      }

      const extra: Record<string, unknown> = {};
      if (status === "scheduled") {
        extra.scheduledAt = now;
        if (scheduleChangeType === "rescheduled") {
          extra.scheduleChangeConfirmedAt = now;
        }
      }
      if (status === "in_progress") extra.startedAt = now;
      if (status === "completed") extra.completedAt = now;
      if (status === "canceled") extra.canceledAt = now;
      if (status === "rejected") extra.rejectedAt = now;

      documents.forEach((document) => {
        tx.update(document.ref, {
          status,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: adminUid,
          ...extra,
        } as FirebaseFirestore.DocumentData);
      });

      tx.set(
        groupMetaRef,
        {
          repStatus: status,
          visitDate,
          visitTime,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: adminUid,
          ...(scheduleChangeType
            ? {
                scheduleChangeType,
                previousVisitDate,
                previousVisitTime,
              }
            : {}),
          ...extra,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      return {
        targetUid,
        visitDate,
        visitTime,
        scheduleChangeType,
        previousVisitDate,
        previousVisitTime,
        bonusUsageStatus,
        changed: true,
      };
    });

    if (!result.changed) {
      return { ok: true, unchanged: true };
    }

    if (
      status === "canceled" ||
      status === "rejected" ||
      (status === "requested" && result.bonusUsageStatus === "used")
    ) {
      await reconcileBonusUsageForGroup({
        groupId,
        targetStatus: status,
        adminUid,
      });
    }

    if (result.targetUid) {
      const visitSchedule = [result.visitDate, result.visitTime].filter(Boolean).join(" ");
      const notifications = {
        requested: {
          type: "exchange_requested",
          title: "금교환 예약 확인 대기 상태입니다",
          body: visitSchedule
            ? `${visitSchedule} 방문 예약을 관리자 확인 중입니다.`
            : "방문 예약을 관리자 확인 중입니다.",
        },
        scheduled:
          result.scheduleChangeType === "rescheduled"
            ? {
                type: "exchange_reschedule_scheduled",
                title: "변경된 예약이 확정되었습니다",
                body: visitSchedule
                  ? `${visitSchedule} 원일귀금속 방문 예약으로 변경 확정되었습니다.`
                  : "변경 요청한 원일귀금속 방문 예약이 확정되었습니다.",
              }
            : {
                type: "exchange_scheduled",
                title: "금교환 예약이 확정되었습니다",
                body: visitSchedule
                  ? `${visitSchedule} 원일귀금속 방문 예약이 확정되었습니다.`
                  : "원일귀금속 방문 예약이 확정되었습니다.",
              },
        in_progress: {
          type: "exchange_in_progress",
          title: "금 교환을 확인하고 있습니다",
          body: "순도·중량과 골드바 교환 내용을 확인하고 있습니다.",
        },
        completed: {
          type: "exchange_completed",
          title: "금 교환이 완료되었습니다",
          body: "교환 내역을 확인하고 후기를 남길 수 있습니다.",
        },
        canceled: {
          type: "exchange_canceled",
          title: "금교환 예약이 취소되었습니다",
          body: visitSchedule
            ? `${visitSchedule} 방문 예약이 취소되었습니다.`
            : "방문 예약이 취소되었습니다.",
        },
        rejected: {
          type: "exchange_rejected",
          title: "금 교환 요청 확인이 필요합니다",
          body: "교환내역을 확인하거나 원일귀금속으로 문의해 주세요.",
        },
      } as const;
      const notification = notifications[status];

      await addNotificationForUser(result.targetUid, {
        ...notification,
        link: "/my-exchanges",
        meta: { groupId, newStatus: status },
      });
    }

    return { ok: true };
  }
);


/* ─────────────────────────────────────────────────────────────
 * 5) 그룹 요약 집계
 * ───────────────────────────────────────────────────────────── */
export const aggregateGoldExchangeGroup = onDocumentWritten(
  { region: "asia-northeast3", document: "goldExchanges/{docId}" },
  async (event) => {
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const groupId =
      (after?.["groupId"] as string | undefined) || (before?.["groupId"] as string | undefined);
    if (!groupId) return;

    const qs = await db().collection("goldExchanges").where("groupId", "==", groupId).get();
    if (qs.empty) {
      await db().doc(`goldExchangeGroups/${groupId}`).delete().catch(() => {});
      return;
    }

    const priority = [
      "rejected",
      "canceled",
      "completed",
      "scheduled",
      "in_progress",
      "requested",
    ] as const;

    let totalG = 0;
    let repStatus: (typeof priority)[number] = "requested";
    let createdAt: Date | null = null;
    let updatedAt: Date | null = null;
    let visitDate = "";
    let visitTime = "";
    let ownerUid: string | null = null;
    let scheduleChangeType = "";
    let previousVisitDate = "";
    let previousVisitTime = "";
    let scheduleChangeReason = "";
    let cancellationReason = "";
    let scheduleChangeRequestedAt: FirebaseFirestore.Timestamp | Date | null = null;
    let cancellationRequestedAt: FirebaseFirestore.Timestamp | Date | null = null;

    qs.docs.forEach((d) => {
      const x = (d.data() || {}) as {
        userId?: string;
        finalWeight?: number;
        status?: (typeof priority)[number];
        createdAt?: FirebaseFirestore.Timestamp | Date;
        updatedAt?: FirebaseFirestore.Timestamp | Date;
        visitDate?: string;
        visitTime?: string;
        scheduleChangeType?: string;
        previousVisitDate?: string;
        previousVisitTime?: string;
        scheduleChangeReason?: string;
        cancellationReason?: string;
        scheduleChangeRequestedAt?: FirebaseFirestore.Timestamp | Date;
        cancellationRequestedAt?: FirebaseFirestore.Timestamp | Date;
      };

      totalG += Number(x.finalWeight || 0);

      const idx = priority.indexOf((x.status || "requested") as (typeof priority)[number]);
      const ridx = priority.indexOf(repStatus);
      if (idx > -1 && (ridx === -1 || idx < ridx)) {
        repStatus = (x.status || "requested") as (typeof priority)[number];
      }

      const c =
        x.createdAt instanceof Date
          ? x.createdAt
          : (x.createdAt as FirebaseFirestore.Timestamp | undefined)?.toDate?.() ?? null;
      const u =
        x.updatedAt instanceof Date
          ? x.updatedAt
          : (x.updatedAt as FirebaseFirestore.Timestamp | undefined)?.toDate?.() ?? null;

      if (!createdAt || (c && c < createdAt)) createdAt = c;
      if (!updatedAt || (u && u > updatedAt)) updatedAt = u;

      if (!ownerUid && x.userId) ownerUid = x.userId;

      if (!visitDate && x.visitDate) visitDate = x.visitDate;
      if (!visitTime && x.visitTime) visitTime = x.visitTime;

      if (!scheduleChangeType && x.scheduleChangeType) {
        scheduleChangeType = String(x.scheduleChangeType);
        previousVisitDate = String(x.previousVisitDate || "");
        previousVisitTime = String(x.previousVisitTime || "");
        scheduleChangeReason = String(x.scheduleChangeReason || "");
        cancellationReason = String(x.cancellationReason || "");
        scheduleChangeRequestedAt = x.scheduleChangeRequestedAt || null;
        cancellationRequestedAt = x.cancellationRequestedAt || null;
      }
    });

    await db().doc(`goldExchangeGroups/${groupId}`).set(
      {
        totalG: roundTo3(totalG),
        totalDon: roundTo3(totalG / DON_TO_GRAMS),
        repStatus,
        createdAt: createdAt || FieldValue.serverTimestamp(),
        updatedAt: updatedAt || FieldValue.serverTimestamp(),
        visitDate,
        visitTime,
        ownerUid: ownerUid || null,
        ...(scheduleChangeType
          ? {
              scheduleChangeType,
              previousVisitDate,
              previousVisitTime,
              scheduleChangeReason,
              cancellationReason,
              ...(scheduleChangeRequestedAt ? { scheduleChangeRequestedAt } : {}),
              ...(cancellationRequestedAt ? { cancellationRequestedAt } : {}),
            }
          : {}),
      } as FirebaseFirestore.DocumentData,
      { merge: true }
    );
  }
);


/* ─────────────────────────────────────────────────────────────
 * 6) 관리자 예약 가능일/시간 관리
 * ───────────────────────────────────────────────────────────── */
export const setBookingAvailability = onCall<{
  dateKey: string;
  closed?: boolean;
  blockedSlots?: string[];
  reason?: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);

    const dateKey = String(req.data?.dateKey || "").trim();
    const closed = req.data?.closed === true;
    const reason = String(req.data?.reason || "").trim().slice(0, 120);
    const blockedSlots = [...new Set(
      (Array.isArray(req.data?.blockedSlots) ? req.data.blockedSlots : [])
        .map((slot) => String(slot || "").trim())
        .filter((slot) => BOOKING_TIME_SLOTS.has(slot))
    )].sort();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new HttpsError("invalid-argument", "관리할 날짜를 확인해 주세요.");
    }
    const [year, month, day] = dateKey.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new HttpsError("invalid-argument", "관리할 날짜를 확인해 주세요.");
    }

    const ref = db().doc(BOOKING_AVAILABILITY_REF);
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() || {}) : {};
      const currentDates = data.dates && typeof data.dates === "object" && !Array.isArray(data.dates)
        ? { ...(data.dates as Record<string, unknown>) }
        : {};

      if (!closed && blockedSlots.length === 0) {
        delete currentDates[dateKey];
      } else {
        currentDates[dateKey] = { closed, blockedSlots, reason };
      }

      tx.set(ref, {
        version: 1,
        dates: currentDates,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: req.auth?.uid || "system",
      }, { merge: true });
    });

    return { ok: true, dateKey, closed, blockedSlots, reason };
  }
);
