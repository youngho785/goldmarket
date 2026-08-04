// functions/src/index.ts
// Cloud Functions (ESM + TypeScript)
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type BatchResponse, type SendResponse } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { randomInt } from "node:crypto";

/* ── App init (중복 방지) */
if (!getApps().length) initializeApp();

/* ── Lazy getters */
const db = (): Firestore => getFirestore();
const msg = () => getMessaging();
const IN_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";

function hasAdminClaim(token: Record<string, unknown> | undefined): boolean {
  return token?.admin === true || token?.superAdmin === true;
}

function requireAdmin(token: Record<string, unknown> | undefined): void {
  if (!hasAdminClaim(token)) {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
}

function requireSuperAdmin(token: Record<string, unknown> | undefined): void {
  if (token?.superAdmin !== true) {
    throw new HttpsError("permission-denied", "최고 관리자 권한이 필요합니다.");
  }
}

/* ── 공통 상수/유틸 */
const DON_TO_GRAMS = 3.75 as const;
const DEFAULT_PURITY: Record<string, number> = {
  "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.53,
  "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.70,
  "순금 995제품(목걸이,팔찌,반지,귀걸이)": 0.945,
  "순금 999제품(팔찌,목걸이, 반지,귀걸이)": 0.95,
  "순금 열쇠": 0.943,
  "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)": 0.94,
  "순금 마고자 단추 / 색상이 들어있는 제품": 0.93,
  "999,24k 순금덩어리(순도 측정후 999일 경우)": 0.96,
};
const DEFAULT_EXCHANGE: Record<string, number> = { "999.9골드바": 1 };

const roundTo3 = (n: number): number => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8);
  let thousands = Math.floor(t / 10);
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};

function computeFinalWeightFromRates(params: {
  grams: number;
  goldType?: string;
  exchangeType?: string;
  purity?: Record<string, number>;
  exchange?: Record<string, number>;
}): number {
  const { grams, goldType, exchangeType, purity, exchange } = params;
  const p =
    typeof purity?.[goldType ?? ""] === "number"
      ? (purity as Record<string, number>)[goldType as string]
      : (DEFAULT_PURITY[goldType ?? ""] ?? 0);
  const e =
    typeof exchange?.[exchangeType ?? ""] === "number"
      ? (exchange as Record<string, number>)[exchangeType as string]
      : (DEFAULT_EXCHANGE[exchangeType ?? ""] ?? 1);
  return roundTo3(grams * p * e);
}

async function addNotificationForUser(
  uid: string | undefined,
  payload: {
    type: string;
    title: string;
    body: string;
    link?: string;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  if (!uid) return;
  const ref = db().collection("notifications").doc(uid).collection("items").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  });
}

async function addNotificationForAdmins(payload: {
  type: string;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
}): Promise<number> {
  const users = db().collection("users");
  const snapshots = await Promise.all([
    users.where("role", "in", ["admin", "superAdmin"]).get(),
    users.where("admin", "==", true).get(),
    users.where("superAdmin", "==", true).get(),
  ]);
  const adminUids = new Set<string>();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => adminUids.add(document.id));
  });
  if (adminUids.size === 0) {
    console.warn("[addNotificationForAdmins] 알림을 받을 관리자 계정을 찾지 못했습니다.");
    return 0;
  }

  const batch = db().batch();
  adminUids.forEach((uid) => {
    const ref = db().collection("notifications").doc(uid).collection("items").doc();
    batch.set(ref, {
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
  });
  await batch.commit();
  return adminUids.size;
}

/* ─────────────────────────────────────────────────────────────
 * 1) 채팅 메시지 생성 시: 미읽음/최근메시지 메타 갱신 + 푸시 발송
 * ───────────────────────────────────────────────────────────── */
export const onChatMessageCreate = onDocumentCreated(
  { region: "asia-northeast3", document: "chats/{chatId}/messages/{messageId}" },
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) return;

      const message = (snap.data() || {}) as {
        sender?: string;
        text?: string;
        imageUrl?: string | null;
      };
      const { chatId } = event.params as { chatId: string; messageId: string };

      const chatRef = db().doc(`chats/${chatId}`);
      const chatSnap = await chatRef.get();
      if (!chatSnap.exists) return;

      const chat = (chatSnap.data() || {}) as {
        participants?: string[];
        participantsMap?: Record<string, boolean>;
      };

      const participants = Array.isArray(chat.participants)
        ? chat.participants
        : Object.keys(chat.participantsMap || {});
      const sender = message.sender || "";
      const receivers = participants.filter((u) => u && u !== sender);

      // (A) 채팅 메타 업데이트
      const lastMessage =
        (message.imageUrl && "[이미지]") ||
        (typeof message.text === "string" && message.text.trim().slice(0, 200)) ||
        "새 메시지";

      await db().runTransaction(async (tx) => {
        const cur = await tx.get(chatRef);
        if (!cur.exists) return;

        const updates: FirebaseFirestore.DocumentData = {
          lastMessage,
          lastMessageAt: FieldValue.serverTimestamp(),
          lastUpdated: FieldValue.serverTimestamp(),
        };
        receivers.forEach((uid) => {
          updates[`unreadCount.${uid}`] = FieldValue.increment(1);
        });

        tx.set(chatRef, updates, { merge: true });

        receivers.forEach((uid) => {
          const threadRef = db().doc(`chatSummaries/${uid}/threads/${chatId}`);
          tx.set(
            threadRef,
            {
              unread: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
              lastMessage,
              lastMessageAt: FieldValue.serverTimestamp(),
            } as FirebaseFirestore.DocumentData,
            { merge: true }
          );

          const metaRef = db().doc(`chatMeta/${uid}`);
          tx.set(
            metaRef,
            { unreadTotal: FieldValue.increment(1) } as FirebaseFirestore.DocumentData,
            { merge: true }
          );
        });
      });

      // (B) 푸시 발송 — 에뮬레이터에서는 스킵
      if (!receivers.length || IN_EMULATOR) return;

      // 수신자들의 FCM 토큰 수집 (중복 제거)
      const tokenSet = new Set<string>();
      await Promise.all(
        receivers.map(async (uid) => {
          const uSnap = await db().doc(`users/${uid}`).get();
          const tokens = (uSnap.get("fcmTokens") || []) as unknown[];
          (tokens || []).forEach((t) => {
            if (typeof t === "string" && t) tokenSet.add(t);
          });
        })
      );

      const tokens = [...tokenSet];
      if (!tokens.length) return;

      const title = "새 채팅 메시지";
      const body =
        message.imageUrl ? "이미지를 보냈습니다." : message.text || "새 메시지가 도착했습니다.";
      const link = `/chat/${chatId}`;

      // ✅ data + notification 동시 전송 (웹 자동 표시 + 앱 라우팅 유지)
      const res: BatchResponse = await msg().sendEachForMulticast({
        tokens,
        data: {
          type: "chat_message",
          chatId,
          sender,
          title,
          body,
          preferBadge: "true",
          link,
        },
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png",
            data: { url: link },
          },
          fcmOptions: { link },
          headers: { Urgency: "high" },
        },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });

      // 토큰 정리
      const bad: string[] = [];
      res.responses.forEach((r: SendResponse, i: number) => {
        if (!r.success) {
          const code = (r.error as { code?: string } | undefined)?.code || "";
          if (
            code.includes("registration-token-not-registered") ||
            code.includes("messaging/registration-token-not-registered") ||
            code.includes("invalid-argument")
          ) {
            bad.push(tokens[i]);
          }
        }
      });
      if (bad.length) {
        await Promise.all(
          receivers.map((uid) =>
            db().doc(`users/${uid}`).update({ fcmTokens: FieldValue.arrayRemove(...bad) })
          )
        );
      }
    } catch (err) {
      console.error("[onChatMessageCreate] error:", err);
    }
  }
);

/* ───────── 1-b) 채팅 읽음 처리 callable ───────── */
export const markChatAsRead = onCall<{ chatId: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const chatId = (req.data?.chatId || "").trim();
    if (!chatId) throw new HttpsError("invalid-argument", "chatId가 필요합니다.");

    const chatRef = db().doc(`chats/${chatId}`);
    const threadRef = db().doc(`chatSummaries/${uid}/threads/${chatId}`);
    const metaRef = db().doc(`chatMeta/${uid}`);

    let cleared = 0;

    await db().runTransaction(async (tx) => {
      // ---- 모든 READ를 먼저 수행 ----
      const [chatSnap, tSnap, mSnap] = await Promise.all([
        tx.get(chatRef),
        tx.get(threadRef),
        tx.get(metaRef),
      ]);
      if (!chatSnap.exists) {
        throw new HttpsError("not-found", "채팅방을 찾을 수 없습니다.");
      }
      const chatData = chatSnap.data() || {};
      const participants = Array.isArray(chatData.participants) ? chatData.participants : [];
      const participantsMap =
        chatData.participantsMap && typeof chatData.participantsMap === "object"
          ? (chatData.participantsMap as Record<string, unknown>)
          : {};
      if (!participants.includes(uid) && participantsMap[uid] !== true) {
        throw new HttpsError("permission-denied", "채팅 참여자만 읽음 처리할 수 있습니다.");
      }
      const prevUnread = (tSnap.exists ? Number(tSnap.get("unread") || 0) : 0) || 0;
      const curTotal = (mSnap.exists ? Number(mSnap.get("unreadTotal") || 0) : 0) || 0;
      cleared = prevUnread;

      // ---- 이후는 WRITE만 수행 ----
      const now = FieldValue.serverTimestamp();

      // 1) 쓰레드 읽음/최근 본 시각 갱신
      tx.set(
        threadRef,
        {
          unread: 0,
          updatedAt: now,
          lastSeenAt: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      // 2) 전체 미읽음 합계 차감
      if (prevUnread > 0) {
        tx.set(
          metaRef,
          { unreadTotal: Math.max(0, curTotal - prevUnread) } as FirebaseFirestore.DocumentData,
          { merge: true }
        );
      }

      // 3) 원본 chats 문서의 나의 미읽음 카운트/lastSeen 동기화
      tx.set(
        chatRef,
        {
          [`unreadCount.${uid}`]: 0,
          [`lastSeenAt.${uid}`]: now,
          lastUpdated: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );
    });

    // (옵션) 해당 채팅 관련 알림 문서가 있으면 읽음 처리
    const itemsRef = db().collection(`notifications/${uid}/items`);
    const qs = await itemsRef.where("chatId", "==", chatId).where("read", "==", false).limit(200).get();
    if (!qs.empty) {
      const batch = db().batch();
      qs.docs.forEach((d) => batch.update(d.ref, { read: true, readAt: FieldValue.serverTimestamp() }));
      await batch.commit();
    }

    return { ok: true, cleared };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 2) 예약 슬롯 해제 (관리자 UI용)
 * ───────────────────────────────────────────────────────────── */
export const releaseReservedSlot = onCall<{ dateKey: string; time: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    const { dateKey, time } = (req.data || {}) as Partial<{ dateKey: string; time: string }>;
    if (
      !dateKey ||
      !time ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      throw new HttpsError("invalid-argument", "날짜와 시간을 올바른 형식으로 입력해 주세요.");
    }
    const ref = db().doc("appConfig/reservedSlots");

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.exists ? (snap.data() as Record<string, unknown>) : {};

      // array 또는 map 두 형태 모두 호환
      if (Array.isArray(raw?.[dateKey])) {
        const next = ((raw[dateKey] as unknown[]) || []).filter((t) => t !== time);
        tx.set(ref, { [dateKey]: next } as FirebaseFirestore.DocumentData, { merge: true });
      } else {
        tx.set(
          ref,
          { [`${dateKey}.${time}`]: FieldValue.delete() } as FirebaseFirestore.DocumentData,
          { merge: true }
        );
      }
    });

    return { ok: true, removed: time, dateKey };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 관리자 역할 변경 (최고 관리자 전용)
 * ───────────────────────────────────────────────────────────── */
export const setUserRole = onCall<{ uid: string; role: "user" | "admin" }>(
  { region: "asia-northeast3" },
  async (req) => {
    const callerUid = req.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    requireSuperAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const uid = String(req.data?.uid || "").trim();
    const role = req.data?.role;
    if (!uid || !["user", "admin"].includes(String(role))) {
      throw new HttpsError("invalid-argument", "사용자와 역할을 확인해 주세요.");
    }
    if (uid === callerUid) {
      throw new HttpsError("failed-precondition", "현재 계정의 역할은 직접 변경할 수 없습니다.");
    }

    const target = await getAuth().getUser(uid);
    if (target.customClaims?.superAdmin === true) {
      throw new HttpsError("failed-precondition", "최고 관리자 역할은 이 기능으로 변경할 수 없습니다.");
    }

    const nextClaims: Record<string, unknown> = { ...(target.customClaims || {}) };
    if (role === "admin") nextClaims.admin = true;
    else delete nextClaims.admin;

    await getAuth().setCustomUserClaims(uid, nextClaims);
    await db().doc(`users/${uid}`).set(
      { role, roleUpdatedAt: FieldValue.serverTimestamp(), roleUpdatedBy: callerUid },
      { merge: true }
    );
    return { ok: true, uid, role };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 3) 그룹 생성 + 슬롯 선점 (사용자 제출)
 * ───────────────────────────────────────────────────────────── */
export const requestGoldExchangeGroup = onCall<{
  visitDate: string;
  visitTime: string;
  name: string;
  phone: string;
  email?: string | null;
  privacyConsent: boolean;
  privacyConsentVersion: string;
  products?: Array<{
    goldType?: string;
    quantity?: number;
    inputUnit?: "g" | "don";
    exchangeType?: string;
  }>;
  barsPlan?: Record<string, unknown> | null;
}>({ region: "asia-northeast3" }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const {
    visitDate,
    visitTime,
    name,
    phone,
    email = null,
    privacyConsent,
    privacyConsentVersion,
    products = [],
    barsPlan = null,
  } = (req.data || {}) as {
    visitDate?: string;
    visitTime?: string;
    name?: string;
    phone?: string;
    email?: string | null;
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

  if (!visitDate || !visitTime || !name || !phone) {
    throw new HttpsError("invalid-argument", "방문일/시간, 성명/전화번호는 필수입니다.");
  }
  if (privacyConsent !== true || !privacyConsentVersion) {
    throw new HttpsError("invalid-argument", "개인정보 수집·이용 동의가 필요합니다.");
  }

  const ratesSnap = await db().doc("appConfig/goldRates").get();
  const rates = ratesSnap.exists
    ? (ratesSnap.data() as {
        purity?: Record<string, number>;
        exchange?: Record<string, number>;
      })
    : { purity: DEFAULT_PURITY, exchange: DEFAULT_EXCHANGE };

  const slotsRef = db().doc("appConfig/reservedSlots");
  const exchanges = db().collection("goldExchanges");

  // 첫 문서 ref를 미리 만들어서 groupId로 사용
  const firstRef = exchanges.doc();
  const groupId = firstRef.id;
  const now = FieldValue.serverTimestamp();

  await db().runTransaction(async (tx) => {
    // 1) 슬롯 중복 확인
    const sSnap = await tx.get(slotsRef);
    const sData = sSnap.exists ? (sSnap.data() as Record<string, unknown>) : {};
    const v = sData?.[visitDate];
    const taken = Array.isArray(v)
      ? (v as string[]).includes(visitTime)
      : !!(v && typeof v === "object" && (v as Record<string, boolean>)[visitTime]);
    if (taken) throw new HttpsError("aborted", "이미 예약된 시간입니다.");

    // 2) 슬롯 선점
    tx.set(
      slotsRef,
      { [visitDate]: { [visitTime]: true } } as FirebaseFirestore.DocumentData,
      { merge: true }
    );

    // 3) 문서 생성
    if (Array.isArray(products) && products.length > 0) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i] || {};
        const qty = Number(p.quantity || 0);
        const unit: "g" | "don" = p.inputUnit === "don" ? "don" : "g";
        const gramsInput = unit === "g" ? qty : qty * DON_TO_GRAMS;
        const gramsRounded = roundTo3(gramsInput);
        const finalG = computeFinalWeightFromRates({
          grams: gramsRounded,
          goldType: p.goldType,
          exchangeType: p.exchangeType || "999.9골드바",
          purity: rates.purity,
          exchange: rates.exchange,
        });

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
            // 예약자
            name,
            phone,
            email,
            visitDate,
            visitTime,
            privacyConsent: true,
            privacyConsentVersion,
            privacyConsentAt: now,
            // 입력/환산 저장
            originalQuantity: qty,
            inputUnit: unit,
            quantity: roundTo3(gramsRounded),
            goldType: p.goldType,
            exchangeType: p.exchangeType || "999.9골드바",
            finalWeight: roundTo3(finalG),
            finalWeightDon: roundTo3(finalG / DON_TO_GRAMS),
            purityUsed: rates.purity?.[p.goldType ?? ""] ?? null,
            exchangeRatioUsed: rates.exchange?.[p.exchangeType ?? "999.9골드바"] ?? 1,
            calcVersion: 4,
            ...(barsPlan ? { barsPlan } : {}),
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
          name,
          phone,
          email,
          visitDate,
          visitTime,
          privacyConsent: true,
          privacyConsentVersion,
          privacyConsentAt: now,
          goldType: "미확인",
          exchangeType: "999.9골드바",
          originalQuantity: 0,
          inputUnit: "g",
          quantity: 0,
          finalWeight: 0,
          finalWeightDon: 0,
          calcVersion: 4,
          ...(barsPlan ? { barsPlan } : {}),
        } as FirebaseFirestore.DocumentData
      );
    }
  });

  // 사용자와 관리자 알림은 예약 저장 성공 여부에 영향을 주지 않도록 분리합니다.
  const notificationResults = await Promise.allSettled([
    addNotificationForUser(uid, {
      type: "exchange_requested",
      title: "금 교환 요청 접수",
      body: `방문 예약이 접수되었습니다. (${visitDate} ${visitTime})`,
      link: "/my-exchanges",
      meta: { groupId },
    }),
    addNotificationForAdmins({
      type: "admin_exchange_requested",
      title: "새 금교환 예약이 접수되었습니다",
      body: `${name}님 · ${visitDate} ${visitTime} 방문 요청`,
      link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
      meta: { groupId, visitDate, visitTime, customerUid: uid },
    }),
  ]);
  notificationResults.forEach((result) => {
    if (result.status === "rejected") {
      console.error("[requestGoldExchangeGroup] 알림 생성 실패", result.reason);
    }
  });

  return { ok: true, groupId };
});

/* ─────────────────────────────────────────────────────────────
 * 4) 그룹 상태 일괄 변경 (관리자)
 * ───────────────────────────────────────────────────────────── */
export const setExchangeGroupStatus = onCall<{
  groupId: string;
  status: "requested" | "scheduled" | "in_progress" | "completed" | "canceled" | "rejected";
}>(
  { region: "asia-northeast3" },
  async (req) => {
    const claims = (req.auth?.token || {}) as Record<string, unknown>;
    if (!(claims.admin === true || claims.superAdmin === true)) {
      throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { groupId, status } = (req.data || {}) as {
      groupId?: string;
      status?: "requested" | "scheduled" | "in_progress" | "completed" | "canceled" | "rejected";
    };
    if (!groupId || !status) throw new HttpsError("invalid-argument", "groupId와 status가 필요합니다.");

    const now = FieldValue.serverTimestamp();
    const extra: Record<string, unknown> = {};
    if (status === "scheduled") extra.scheduledAt = now;
    if (status === "in_progress") extra.startedAt = now;
    if (status === "completed") extra.completedAt = now;
    if (status === "canceled") extra.canceledAt = now;
    if (status === "rejected") extra.rejectedAt = now;

    const col = db().collection("goldExchanges");
    let qs = await col.where("groupId", "==", groupId).get();

    // 혹시 옛 데이터에서 groupId가 없는 단일 문서 케이스 보완
    if (qs.empty) {
      const single = await col.doc(groupId).get();
      if (!single.exists) {
        throw new HttpsError("not-found", "그룹을 찾을 수 없습니다.");
      }
      qs = { empty: false, docs: [single] } as unknown as typeof qs;
    }

    const groupMetaSnap = await db().doc(`goldExchangeGroups/${groupId}`).get();
    const bonusUsageStatus = String(groupMetaSnap.get("bonusGoldUsageStatus") || "");
    if (status === "completed" && bonusUsageStatus === "requested") {
      throw new HttpsError(
        "failed-precondition",
        "적립 순금 사용 신청을 먼저 확정하거나 취소해 주세요."
      );
    }

    const batch = db().batch();
    let targetUid: string | null = null;
    let targetVisitDate = "";
    let targetVisitTime = "";
    qs.docs.forEach((d) => {
      const data = (d.data() || {}) as {
        userId?: string;
        visitDate?: string;
        visitTime?: string;
      };
      targetUid = targetUid || data.userId || null;
      targetVisitDate = targetVisitDate || data.visitDate || "";
      targetVisitTime = targetVisitTime || data.visitTime || "";
      batch.update(d.ref, { status, updatedAt: now, ...extra } as FirebaseFirestore.DocumentData);
    });
    await batch.commit();

    if (
      status === "canceled" ||
      status === "rejected" ||
      (status === "requested" && bonusUsageStatus === "used")
    ) {
      await reconcileBonusUsageForGroup({
        groupId,
        targetStatus: status,
        adminUid: req.auth?.uid || "system",
      });
    }

    if (targetUid) {
      const visitSchedule = [targetVisitDate, targetVisitTime].filter(Boolean).join(" ");
      const notifications = {
        requested: {
          type: "exchange_requested",
          title: "금 교환 예약이 접수되었습니다",
          body: visitSchedule
            ? `${visitSchedule} 방문 요청을 확인하고 있습니다.`
            : "방문 요청을 확인하고 있습니다.",
        },
        scheduled: {
          type: "exchange_scheduled",
          title: "방문 예약이 확정되었습니다",
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
          title: "방문 예약이 취소되었습니다",
          body: "취소된 예약은 교환내역에서 확인할 수 있습니다.",
        },
        rejected: {
          type: "exchange_rejected",
          title: "금 교환 요청 확인이 필요합니다",
          body: "교환내역을 확인하거나 원일귀금속으로 문의해 주세요.",
        },
      } as const;
      const notification = notifications[status];

      await addNotificationForUser(targetUid, {
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

    qs.docs.forEach((d) => {
      const x = (d.data() || {}) as {
        userId?: string;
        finalWeight?: number;
        status?: (typeof priority)[number];
        createdAt?: FirebaseFirestore.Timestamp | Date;
        updatedAt?: FirebaseFirestore.Timestamp | Date;
        visitDate?: string;
        visitTime?: string;
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
      } as FirebaseFirestore.DocumentData,
      { merge: true }
    );
  }
);

/* ─────────────────────────────────────────────────────────────
 * 6) 알림 문서 생성 시 FCM 발송
 * ───────────────────────────────────────────────────────────── */
export const onNotificationCreate = onDocumentCreated(
  { region: "asia-northeast3", document: "notifications/{uid}/items/{docId}" },
  async (event) => {
    try {
      if (IN_EMULATOR) return;
      const { uid } = event.params as { uid: string };
      const notif = (event.data?.data() || {}) as {
        title?: string;
        body?: string;
        type?: string;
        link?: string;
      };

      const userSnap = await db().doc(`users/${uid}`).get();
      const tokens = ((userSnap.get("fcmTokens") || []) as unknown[]).filter(
        (t): t is string => typeof t === "string" && t.length > 0
      );
      if (!tokens.length) return;

      const title = notif.title || "알림";
      const body = notif.body || "";
      const link = String(notif.link || "/");

      const res: BatchResponse = await msg().sendEachForMulticast({
        tokens,
        data: {
          type: String(notif.type || "notification"),
          link,
        },
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png",
            data: { url: link },
          },
          fcmOptions: { link },
          headers: { Urgency: "high" },
        },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });

      const bad: string[] = [];
      res.responses.forEach((r: SendResponse, i: number) => {
        if (!r.success) {
          const code = (r.error as { code?: string } | undefined)?.code || "";
          if (
            code.includes("registration-token-not-registered") ||
            code.includes("messaging/registration-token-not-registered") ||
            code.includes("invalid-argument")
          ) {
            bad.push(tokens[i]);
          }
        }
      });

      if (bad.length) {
        await db()
          .doc(`users/${uid}`)
          .update({ fcmTokens: FieldValue.arrayRemove(...bad) })
          .catch(() => {});
      }
    } catch (e) {
      console.error("[onNotificationCreate] error:", e);
    }
  }
);

/* ─────────────────────────────────────────────────────────────
 * 7) 예약 슬롯 청소 (스케줄러)
 * ───────────────────────────────────────────────────────────── */
export const cleanReservedSlots = onSchedule(
  { schedule: "every 60 minutes", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const toYmdSeoul = (): string => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .reduce<Record<string, string>>((acc, p) => {
          acc[p.type] = p.value;
          return acc;
        }, {});
      return `${parts.year}-${parts.month}-${parts.day}`;
    };
    const today = toYmdSeoul();

    const ref = db().doc("appConfig/reservedSlots");
    const snap = await ref.get();
    if (!snap.exists) return;
    const data = (snap.data() || {}) as Record<string, unknown>;

    const updates: FirebaseFirestore.DocumentData = {};
    Object.keys(data).forEach((dateKey) => {
      if (dateKey < today)
        (updates as Record<string, FirebaseFirestore.FieldValue>)[dateKey] = FieldValue.delete();
    });
    if (Object.keys(updates).length) {
      await ref.set(updates, { merge: true });
    }
  }
);

/* ─────────────────────────────────────────────────────────────
 * 8) 닉네임 유니크 인덱스 (콜러블)
 * ───────────────────────────────────────────────────────────── */
const normalizeNickname = (raw: string): { lower: string; original: string } => {
  const original = String(raw || "").trim();
  const lower = original.toLocaleLowerCase();
  return { lower, original };
};

/** 회원가입 직후 닉네임 선점 */
export const claimNickname = onCall<{ nickname: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (req.data?.nickname || "").trim();
    if (!raw) throw new HttpsError("invalid-argument", "nickname이 필요합니다.");
    if (raw.length > 16) throw new HttpsError("invalid-argument", "닉네임은 16자 이내여야 합니다.");

    const { lower, original } = normalizeNickname(raw);
    const nickRef = db().doc(`nicknames/${lower}`);
    const profileRef = db().doc(`profiles/${uid}`);

    await db().runTransaction(async (tx) => {
      const nickSnap = await tx.get(nickRef);

      if (nickSnap.exists) {
        const owner = (nickSnap.data() || {}).ownerUid as string | undefined;
        if (owner && owner !== uid) {
          throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
        }
      } else {
        tx.set(nickRef, {
          ownerUid: uid,
          original,
          createdAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData);
      }

      // 프로필 동기화
      tx.set(
        profileRef,
        {
          nickname: original,
          nicknameLower: lower,
          nicknameUpdatedAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );
    });

    return { ok: true, nickname: original };
  }
);

/** 닉네임 변경 */
export const changeNickname = onCall<{ newNickname: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (req.data?.newNickname || "").trim();
    if (!raw) throw new HttpsError("invalid-argument", "newNickname이 필요합니다.");
    if (raw.length > 16) throw new HttpsError("invalid-argument", "닉네임은 16자 이내여야 합니다.");

    const { lower: newLower, original: newOriginal } = normalizeNickname(raw);
    const profileRef = db().doc(`profiles/${uid}`);
    const newNickRef = db().doc(`nicknames/${newLower}`);

    await db().runTransaction(async (tx) => {
      // ---- READ FIRST ----
      const pSnap = await tx.get(profileRef);
      const prevLower =
        (pSnap.exists ? (pSnap.get("nicknameLower") as string | undefined) : undefined) || undefined;

      const newSnap = await tx.get(newNickRef);

      let prevRef: FirebaseFirestore.DocumentReference | null = null;
      let prevSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      if (prevLower && prevLower !== newLower) {
        prevRef = db().doc(`nicknames/${prevLower}`);
        prevSnap = await tx.get(prevRef);
      }

      // 점유 가능 검사
      if (newSnap.exists) {
        const owner = (newSnap.data() || {}).ownerUid as string | undefined;
        if (owner && owner !== uid) {
          throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
        }
      }

      // ---- WRITE ONLY AFTER ALL READS ----
      tx.set(
        newNickRef,
        {
          ownerUid: uid,
          original: newOriginal,
          createdAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      tx.set(
        profileRef,
        {
          nickname: newOriginal,
          nicknameLower: newLower,
          nicknameUpdatedAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      if (prevLower && prevLower !== newLower && prevRef && prevSnap?.exists) {
        const prevOwner = (prevSnap.data() || {}).ownerUid as string | undefined;
        if (prevOwner === uid) {
          tx.delete(prevRef);
        }
      }
    });

    return { ok: true, nickname: newOriginal };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 9) 계정 탈퇴(데이터 비식별 + 채팅/알림 정리) — 클라이언트가 reauth 후 호출
 * ───────────────────────────────────────────────────────────── */
async function deleteCollectionInBatches(
  colRef: FirebaseFirestore.CollectionReference,
  whereField?: string,
  whereEq?: unknown,
  batchSize = 250
) {
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = colRef.orderBy("__name__").limit(batchSize) as FirebaseFirestore.Query;
    if (whereField) q = q.where(whereField as never, "==", whereEq as never);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    const batch = db().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }
}

export const deleteMyAccount = onCall<unknown>(
  { region: "asia-northeast3", timeoutSeconds: 540 },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    // 1) 프로필/유저 비식별화 + 닉네임 인덱스 반납
    const userRef = db().doc(`users/${uid}`);
    const profRef = db().doc(`profiles/${uid}`);

    const profSnap = await profRef.get();
    const prevLower = profSnap.exists ? (profSnap.get("nicknameLower") as string | null) : null;

    await db().runTransaction(async (tx) => {
      // ---- READ FIRST (조건부) ----
      let nickRef: FirebaseFirestore.DocumentReference | null = null;
      let nSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      if (prevLower) {
        nickRef = db().doc(`nicknames/${prevLower}`);
        nSnap = await tx.get(nickRef);
      }

      // ---- WRITE(S) ----
      tx.set(
        userRef,
        {
          displayName: "(탈퇴한 사용자)",
          email: "",
          phone: "",
          profileImage: "",
          fcmTokens: [],
          deleted: true,
          deletedAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      tx.set(
        profRef,
        {
          displayName: "탈퇴한 사용자",
          photoURL: "",
          nickname: FieldValue.delete(),
          nicknameLower: FieldValue.delete(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      if (prevLower && nickRef && nSnap?.exists) {
        const owner = (nSnap.data() || {}).ownerUid as string | undefined;
        if (owner === uid) tx.delete(nickRef);
      }
    });

    // 2) 나의 채팅 스레드 요약/메타 삭제
    await deleteCollectionInBatches(db().collection(`chatSummaries/${uid}/threads`));
    await db().doc(`chatMeta/${uid}`).delete().catch(() => {});

    // 3) 알림 문서/아이템 삭제
    await deleteCollectionInBatches(db().collection(`notifications/${uid}/items`));
    await db().doc(`notifications/${uid}`).delete().catch(() => {});

    // 4) 참여중인 채팅에 나 자신 상태 마킹(숨김+나감+미읽음 0, 마지막 본 시각 기록)
    const chatQs = await db().collection("chats").where("participants", "array-contains", uid).get();
    if (!chatQs.empty) {
      const now = FieldValue.serverTimestamp();
      const batches: FirebaseFirestore.WriteBatch[] = [];
      let batch = db().batch();
      let count = 0;

      chatQs.docs.forEach((d) => {
        const ref = d.ref;
        batch.set(
          ref,
          {
            [`hidden.${uid}`]: true,
            [`hiddenAt.${uid}`]: now,
            [`left.${uid}`]: true,
            [`leftAt.${uid}`]: now,
            [`unreadCount.${uid}`]: 0,
            [`lastSeenAt.${uid}`]: now,
            lastUpdated: now,
          } as FirebaseFirestore.DocumentData,
          { merge: true }
        );
        count += 1;
        if (count % 400 === 0) {
          batches.push(batch);
          batch = db().batch();
        }
      });
      batches.push(batch);
      for (const b of batches) {
        await b.commit();
      }
    }

    // ✅ 5) 내가 올린 상품 전부 '아카이브' 처리 (가격 숨김 + 보존)
    const prods = await db().collection("products").where("sellerId", "==", uid).get();
    if (!prods.empty) {
      const now = FieldValue.serverTimestamp();
      const batches: FirebaseFirestore.WriteBatch[] = [];
      let batch = db().batch();
      let count = 0;

      prods.docs.forEach((d) => {
        const data = d.data() as { price?: number | null; completed?: boolean };
        const curPrice = typeof data?.price === "number" ? data.price : null;

        batch.set(
          d.ref,
          {
            status: "archived",
            sellerDeleted: true,          // ← 프론트/백 양쪽에서 거래 차단 신호
            archivedReason: "seller_deleted",
            archivedAt: now,
            updatedAt: now,

            archivedPrice: curPrice,      // ← 현재가 보존
            price: null,                  // ← 노출 가격 제거
            // 선택) 이미 completed가 아니라면 표시용 완료처리도 가능
            completed: data?.completed === true ? true : true,
            completedAt: FieldValue.serverTimestamp(),
          } as FirebaseFirestore.DocumentData,
          { merge: true }
        );

        count += 1;
        if (count % 400 === 0) {
          batches.push(batch);
          batch = db().batch();
        }
      });

      batches.push(batch);
      for (const b of batches) await b.commit();
    }

    // 최종 응답
    return { ok: true };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 완료된 주문의 거래 후기 등록 (구매자 1회)
 * ───────────────────────────────────────────────────────────── */
export const submitTransactionReview = onCall<{
  orderId: string;
  rating: number;
  comment: string;
}>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const orderId = String(req.data?.orderId || "").trim();
    const rating = Number(req.data?.rating);
    const comment = String(req.data?.comment || "").trim();
    if (!orderId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpsError("invalid-argument", "주문과 평점을 확인해 주세요.");
    }
    if (!comment || comment.length > 1000) {
      throw new HttpsError("invalid-argument", "후기는 1자 이상 1,000자 이하로 입력해 주세요.");
    }

    const orderRef = db().doc(`orders/${orderId}`);
    const reviewRef = db().doc(`transactionReviews/${orderId}`);
    let sellerId = "";

    await db().runTransaction(async (tx) => {
      const [orderSnap, reviewSnap] = await Promise.all([
        tx.get(orderRef),
        tx.get(reviewRef),
      ]);
      if (!orderSnap.exists) throw new HttpsError("not-found", "주문을 찾을 수 없습니다.");
      if (reviewSnap.exists) throw new HttpsError("already-exists", "이미 후기를 작성했습니다.");

      const order = orderSnap.data() || {};
      sellerId = String(order.sellerId || "");
      const productId = String(order.productId || "");
      const completed = order.status === "completed" || order.completed === true;
      if (order.buyerId !== uid || !sellerId || !productId || !completed) {
        throw new HttpsError("failed-precondition", "완료된 구매 주문만 평가할 수 있습니다.");
      }

      const profileRef = db().doc(`profiles/${sellerId}`);
      const userRef = db().doc(`users/${sellerId}`);
      const [profileSnap, userSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(userRef),
      ]);
      const profile = profileSnap.data() || {};
      const privateUser = userSnap.data() || {};
      const previousCount = Number(profile.sellerRatingCount ?? privateUser.sellerRatingCount ?? 0);
      const previousAverage = Number(profile.sellerRatingAvg ?? privateUser.sellerRatingAvg ?? 0);
      const nextCount = previousCount + 1;
      const nextAverage = Math.round(((previousAverage * previousCount + rating) / nextCount) * 100) / 100;
      const now = FieldValue.serverTimestamp();

      tx.create(reviewRef, {
        orderId,
        productId,
        sellerId,
        buyerId: uid,
        reviewerId: uid,
        userName: String(req.auth?.token?.name || "구매자").slice(0, 40),
        rating,
        comment,
        createdAt: now,
      });
      tx.set(profileRef, { sellerRatingAvg: nextAverage, sellerRatingCount: nextCount }, { merge: true });
      tx.set(userRef, { sellerRatingAvg: nextAverage, sellerRatingCount: nextCount }, { merge: true });
      tx.set(orderRef, { reviewed: true, reviewedAt: now }, { merge: true });
    });

    await addNotificationForUser(sellerId, {
      type: "transaction_review",
      title: "새 거래 후기가 등록되었습니다.",
      body: `구매자가 ${rating}점 후기를 남겼습니다.`,
      link: `/transactionReviews/${sellerId}`,
      meta: { orderId, rating },
    });
    return { ok: true, reviewId: orderId };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 완료된 금교환 후기 등록
 * - 교환 완료·본인 소유 여부를 서버에서 확인
 * - 거래당 1회, 공개 문서에는 회원 식별자를 저장하지 않음
 * ───────────────────────────────────────────────────────────── */
export const submitGoldExchangeReview = onCall<{
  exchangeId: string;
  rating: number;
  comment: string;
}>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const exchangeId = String(req.data?.exchangeId || "").trim();
    const rating = Number(req.data?.rating);
    const comment = String(req.data?.comment || "").trim();

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(exchangeId)) {
      throw new HttpsError("invalid-argument", "교환 번호를 확인해 주세요.");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpsError("invalid-argument", "평점은 1점부터 5점까지 선택해 주세요.");
    }
    if (comment.length < 10 || comment.length > 500) {
      throw new HttpsError("invalid-argument", "후기는 10자 이상 500자 이하로 입력해 주세요.");
    }

    const exchanges = db().collection("goldExchanges");
    const groupedSnap = await exchanges.where("groupId", "==", exchangeId).limit(50).get();
    const exchangeDocs: FirebaseFirestore.DocumentSnapshot[] = [...groupedSnap.docs];

    if (exchangeDocs.length === 0) {
      const directSnap = await exchanges.doc(exchangeId).get();
      if (directSnap.exists) exchangeDocs.push(directSnap);
    }
    if (exchangeDocs.length === 0) {
      throw new HttpsError("not-found", "교환 내역을 찾을 수 없습니다.");
    }

    const ownedDocs = exchangeDocs.filter((item) => item.data()?.userId === uid);
    if (ownedDocs.length === 0) {
      throw new HttpsError("permission-denied", "본인의 교환 내역만 평가할 수 있습니다.");
    }

    const completedDoc = ownedDocs.find((item) => item.data()?.status === "completed");
    if (!completedDoc) {
      throw new HttpsError("failed-precondition", "교환 완료 처리된 건만 후기를 작성할 수 있습니다.");
    }

    const claimRef = db().doc(`goldExchangeReviewClaims/${exchangeId}`);
    const publicReviewRef = db().collection("verifiedGoldExchangeReviews").doc();

    await db().runTransaction(async (tx) => {
      const [claimSnap, completedSnap] = await Promise.all([
        tx.get(claimRef),
        tx.get(completedDoc.ref),
      ]);

      if (claimSnap.exists) {
        throw new HttpsError("already-exists", "이미 후기를 작성했습니다.");
      }

      const completedExchange = completedSnap.data() || {};
      if (
        completedExchange.userId !== uid ||
        completedExchange.status !== "completed"
      ) {
        throw new HttpsError("failed-precondition", "교환 완료 상태를 다시 확인해 주세요.");
      }

      const now = FieldValue.serverTimestamp();
      tx.create(publicReviewRef, {
        rating,
        comment,
        reviewerLabel: "교환 완료 고객",
        serviceType: "골드바 교환",
        verified: true,
        createdAt: now,
      });
      tx.create(claimRef, {
        ownerUid: uid,
        reviewId: publicReviewRef.id,
        createdAt: now,
      });

      for (const exchangeDoc of ownedDocs) {
        tx.set(
          exchangeDoc.ref,
          { reviewed: true, reviewedAt: now },
          { merge: true }
        );
      }
    });

    return { ok: true, reviewId: publicReviewRef.id };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 퀵퀴즈 0.01g 보너스 지급 (1인 1회)
 * 서버가 답안을 직접 채점하고, 수령 기록·잔액·원장을 한 트랜잭션으로 반영합니다.
 * ───────────────────────────────────────────────────────────── */
const QUIZ_BONUS_PROMO_ID = "gold_bonus_v1";
const QUIZ_BONUS_CREDIT_MG = 10;
const QUIZ_BONUS_CREDIT_G = QUIZ_BONUS_CREDIT_MG / 1000;
const WELCOME_BONUS_PROMO_ID = "welcome_gold_v1";
const WELCOME_BONUS_CREDIT_MG = 10;
const WELCOME_BONUS_CREDIT_G = WELCOME_BONUS_CREDIT_MG / 1000;

type QuizBonusState = {
  ok: true;
  claimed: boolean;
  alreadyClaimed: boolean;
  claimedNow: boolean;
  creditedG: number;
  balanceG: number;
};

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function bonusBalanceMilliGrams(data: FirebaseFirestore.DocumentData | undefined): number {
  if (Number.isFinite(Number(data?.bonusGoldMilliGrams))) {
    return toNonNegativeInteger(data?.bonusGoldMilliGrams);
  }
  const legacyG = Number(data?.bonusGoldG || 0);
  return Number.isFinite(legacyG) && legacyG > 0 ? Math.round(legacyG * 1000) : 0;
}

type WelcomeBonusState = {
  ok: true;
  claimed: true;
  alreadyClaimed: boolean;
  claimedNow: boolean;
  creditedG: number;
  balanceG: number;
};

async function resolveWelcomeBonusState(uid: string): Promise<WelcomeBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(WELCOME_BONUS_PROMO_ID);
  const ledgerRef = userRef.collection("ledger").doc(`welcome_${WELCOME_BONUS_PROMO_ID}`);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap, ledgerSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
      tx.get(ledgerRef),
    ]);

    let balanceMg = bonusBalanceMilliGrams(userSnap.data());

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(Number(promo.creditedG || WELCOME_BONUS_CREDIT_G) * 1000)
      );

      if (!ledgerSnap.exists) {
        balanceMg += creditedMg;
        tx.set(userRef, {
          bonusGoldMilliGrams: balanceMg,
          bonusGoldG: balanceMg / 1000,
          bonusGoldUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(ledgerRef, {
          direction: "credit",
          amountMilliGrams: creditedMg,
          amountG: creditedMg / 1000,
          source: WELCOME_BONUS_PROMO_ID,
          createdAt: FieldValue.serverTimestamp(),
          migratedFromLegacyClaim: true,
        });
      }

      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    balanceMg += WELCOME_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();
    tx.set(userRef, {
      bonusGoldMilliGrams: balanceMg,
      bonusGoldG: balanceMg / 1000,
      bonusGoldUpdatedAt: now,
    }, { merge: true });
    tx.create(promoRef, {
      creditedMilliGrams: WELCOME_BONUS_CREDIT_MG,
      creditedG: WELCOME_BONUS_CREDIT_G,
      claimedAt: now,
      source: WELCOME_BONUS_PROMO_ID,
      balanceApplied: true,
      balanceAppliedAt: now,
    });
    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: WELCOME_BONUS_CREDIT_MG,
      amountG: WELCOME_BONUS_CREDIT_G,
      source: WELCOME_BONUS_PROMO_ID,
      createdAt: now,
    });

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: WELCOME_BONUS_CREDIT_G,
      balanceG: balanceMg / 1000,
    };
  });
}

async function resolveQuizBonusState(
  uid: string,
  claim?: { score: number; attemptId: string }
): Promise<QuizBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(QUIZ_BONUS_PROMO_ID);
  const ledgerRef = userRef.collection("ledger").doc(`quiz_${QUIZ_BONUS_PROMO_ID}`);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap, ledgerSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
      tx.get(ledgerRef),
    ]);

    let balanceMg = bonusBalanceMilliGrams(userSnap.data());

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(Number(promo.creditedG || QUIZ_BONUS_CREDIT_G) * 1000)
      );

      // 예전 구현은 수령 문서만 만들었으므로, 원장이 없는 경우 한 번만 잔액을 보정합니다.
      if (!ledgerSnap.exists) {
        balanceMg += creditedMg;
        tx.set(userRef, {
          bonusGoldMilliGrams: balanceMg,
          bonusGoldG: balanceMg / 1000,
          bonusGoldUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(ledgerRef, {
          direction: "credit",
          amountMilliGrams: creditedMg,
          amountG: creditedMg / 1000,
          source: QUIZ_BONUS_PROMO_ID,
          createdAt: FieldValue.serverTimestamp(),
          migratedFromLegacyClaim: true,
        });
      }

      if (
        promo.balanceApplied !== true ||
        promo.creditedMilliGrams !== creditedMg ||
        promo.creditedG !== creditedMg / 1000
      ) {
        tx.set(promoRef, {
          creditedMilliGrams: creditedMg,
          creditedG: creditedMg / 1000,
          balanceApplied: true,
          balanceAppliedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    if (!claim) {
      return {
        ok: true,
        claimed: false,
        alreadyClaimed: false,
        claimedNow: false,
        creditedG: 0,
        balanceG: balanceMg / 1000,
      };
    }

    balanceMg += QUIZ_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();
    tx.set(userRef, {
      bonusGoldMilliGrams: balanceMg,
      bonusGoldG: balanceMg / 1000,
      bonusGoldUpdatedAt: now,
    }, { merge: true });
    tx.create(promoRef, {
      creditedMilliGrams: QUIZ_BONUS_CREDIT_MG,
      creditedG: QUIZ_BONUS_CREDIT_G,
      score: claim.score,
      attemptId: claim.attemptId || null,
      claimedAt: now,
      source: QUIZ_BONUS_PROMO_ID,
      balanceApplied: true,
      balanceAppliedAt: now,
    });
    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: QUIZ_BONUS_CREDIT_MG,
      amountG: QUIZ_BONUS_CREDIT_G,
      source: QUIZ_BONUS_PROMO_ID,
      createdAt: now,
    });

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: QUIZ_BONUS_CREDIT_G,
      balanceG: balanceMg / 1000,
    };
  });
}

export const welcomeClaimGoldBonus = onCall(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const res = await resolveWelcomeBonusState(uid);
    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "welcome_bonus",
          title: "웰컴 순금 적립 완료",
          body: `회원가입 웰컴 순금 ${res.creditedG.toFixed(2)}g이 적립되었습니다. 골드바 교환 시 사용할 수 있습니다.`,
          link: "/profile",
          meta: { event: WELCOME_BONUS_PROMO_ID, creditedG: res.creditedG },
        });
      } catch (error) {
        console.error("[welcomeClaimGoldBonus] 지급 알림 생성 실패", error);
      }
    }
    return res;
  }
);

export const quizGetGoldBonusStatus = onCall(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    return resolveQuizBonusState(uid);
  }
);

export const quizClaimGoldBonus = onCall<{
  answers: Record<string, number>;
  attemptId?: string;
}>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const answerKey: Record<string, number> = { q1: 0, q2: 0, q3: 1, q4: 0, q5: 0 };
    const answers = req.data?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      throw new HttpsError("invalid-argument", "퀴즈 답안이 필요합니다.");
    }
    const answerIds = Object.keys(answerKey);
    if (
      Object.keys(answers).length !== answerIds.length ||
      !answerIds.every((id) => Number.isInteger(Number(answers[id])))
    ) {
      throw new HttpsError("invalid-argument", "모든 퀴즈 답안을 제출해 주세요.");
    }
    const score = answerIds.reduce(
      (total, id) => total + (Number(answers[id]) === answerKey[id] ? 1 : 0),
      0
    );
    const attemptId =
      req.data?.attemptId ? String(req.data.attemptId).slice(0, 64) : "";

    if (score !== answerIds.length) {
      throw new HttpsError("failed-precondition", "아쉽지만 기준 점수 미달입니다.");
    }

    const res = await resolveQuizBonusState(uid, { score, attemptId });

    // 이미 수령한 계정에는 중복 알림을 만들지 않습니다.
    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "promo_bonus",
          title: "퀵퀴즈 보너스 지급",
          body: `축하합니다! ${res.creditedG.toFixed(2)}g 보너스가 적립되었습니다.`,
          link: "/profile",
          meta: { event: QUIZ_BONUS_PROMO_ID, creditedG: res.creditedG, score },
        });
      } catch (error) {
        console.error("[quizClaimGoldBonus] 보너스 지급 알림 생성 실패", error);
      }
    }

    return res;
  }
);

/* ─────────────────────────────────────────────────────────────
 * 적립 순금 사용 신청·매장 확정·복구
 * 잔액은 mg 정수로 보관하며, 모든 차감과 복구를 서버 트랜잭션으로 처리합니다.
 * ───────────────────────────────────────────────────────────── */
type BonusUsageStatus = "requested" | "used" | "canceled" | "restored";

function cleanGroupId(value: unknown): string {
  return String(value || "").trim().slice(0, 128);
}

function cleanUsageCode(value: unknown): string {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

function requestCreatedMillis(value: unknown): number | null {
  if (value && typeof (value as FirebaseFirestore.Timestamp).toMillis === "function") {
    return (value as FirebaseFirestore.Timestamp).toMillis();
  }
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function publicBonusUsageRequest(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data?.status) return null;
  const amountMg = toNonNegativeInteger(data.amountMilliGrams);
  return {
    status: String(data.status) as BonusUsageStatus,
    amountG: amountMg / 1000,
    groupId: String(data.groupId || ""),
    requestCode: data.status === "requested" ? String(data.requestCode || "") : "",
    visitDate: String(data.visitDate || ""),
    visitTime: String(data.visitTime || ""),
    finalRecognizedG: Number(data.finalRecognizedG || 0),
    finalAppliedG: Number(data.finalAppliedG || 0),
    createdAtMillis: requestCreatedMillis(data.createdAt),
    usedAtMillis: requestCreatedMillis(data.usedAt),
    canceledAtMillis: requestCreatedMillis(data.canceledAt),
    restoredAtMillis: requestCreatedMillis(data.restoredAt),
  };
}

export const bonusGetGoldUsageState = onCall(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const userRef = db().doc(`users/${uid}`);
    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const groupsQuery = db().collection("goldExchangeGroups").where("ownerUid", "==", uid);
    const [userSnap, requestSnap, groupsSnap] = await Promise.all([
      userRef.get(),
      requestRef.get(),
      groupsQuery.get(),
    ]);

    const balanceMg = bonusBalanceMilliGrams(userSnap.data());
    const requestData = requestSnap.exists ? requestSnap.data() : undefined;
    const requestStatus = String(requestData?.status || "");
    const requestedMg = requestStatus === "requested"
      ? toNonNegativeInteger(requestData?.amountMilliGrams)
      : 0;

    const eligibleGroups = groupsSnap.docs
      .map((document) => {
        const data = document.data() || {};
        return {
          groupId: document.id,
          status: String(data.repStatus || "requested"),
          visitDate: String(data.visitDate || ""),
          visitTime: String(data.visitTime || ""),
          totalG: Number(data.totalG || 0),
        };
      })
      .filter((group) => !["completed", "canceled", "rejected"].includes(group.status))
      .sort((a, b) => `${a.visitDate} ${a.visitTime}`.localeCompare(`${b.visitDate} ${b.visitTime}`));

    return {
      ok: true,
      balanceG: balanceMg / 1000,
      spendableG: Math.max(0, balanceMg - requestedMg) / 1000,
      request: publicBonusUsageRequest(requestData),
      eligibleGroups,
    };
  }
);

export const bonusRequestGoldUsage = onCall<{ groupId: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const groupId = cleanGroupId(req.data?.groupId);
    if (!groupId) {
      throw new HttpsError("invalid-argument", "적립 순금을 사용할 금교환 예약을 선택해 주세요.");
    }

    const userRef = db().doc(`users/${uid}`);
    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);

    const result = await db().runTransaction(async (tx) => {
      const [userSnap, requestSnap, groupSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(requestRef),
        tx.get(groupRef),
      ]);

      if (!groupSnap.exists || String(groupSnap.get("ownerUid") || "") !== uid) {
        throw new HttpsError("not-found", "본인의 금교환 예약을 찾을 수 없습니다.");
      }
      const groupStatus = String(groupSnap.get("repStatus") || "requested");
      if (["completed", "canceled", "rejected"].includes(groupStatus)) {
        throw new HttpsError("failed-precondition", "종료된 금교환 예약에는 사용할 수 없습니다.");
      }

      const existing = requestSnap.exists ? requestSnap.data() : undefined;
      if (existing?.status === "requested") {
        if (String(existing.groupId || "") !== groupId) {
          throw new HttpsError("failed-precondition", "이미 다른 예약에 사용 신청 중입니다.");
        }
        return {
          createdNow: false,
          balanceMg: bonusBalanceMilliGrams(userSnap.data()),
          request: publicBonusUsageRequest(existing),
        };
      }

      const balanceMg = bonusBalanceMilliGrams(userSnap.data());
      if (balanceMg <= 0) {
        throw new HttpsError("failed-precondition", "사용 가능한 적립 순금이 없습니다.");
      }

      const now = FieldValue.serverTimestamp();
      const requestCode = String(randomInt(100000, 1000000));
      const visitDate = String(groupSnap.get("visitDate") || "");
      const visitTime = String(groupSnap.get("visitTime") || "");
      const requestData = {
        uid,
        groupId,
        status: "requested" as BonusUsageStatus,
        amountMilliGrams: balanceMg,
        amountG: balanceMg / 1000,
        requestCode,
        visitDate,
        visitTime,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(requestRef, requestData);
      tx.set(groupRef, {
        bonusGoldUsageStatus: "requested",
        bonusGoldRequestUid: uid,
        bonusGoldRequestedMilliGrams: balanceMg,
        bonusGoldRequestedG: balanceMg / 1000,
        bonusGoldRequestedAt: now,
        updatedAt: now,
      }, { merge: true });

      return {
        createdNow: true,
        balanceMg,
        request: {
          status: "requested" as BonusUsageStatus,
          amountG: balanceMg / 1000,
          groupId,
          requestCode,
          visitDate,
          visitTime,
        },
      };
    });

    if (result.createdNow) {
      const amountG = result.balanceMg / 1000;
      await Promise.allSettled([
        addNotificationForUser(uid, {
          type: "bonus_gold_usage_requested",
          title: "적립 순금 사용 신청 완료",
          body: `${amountG.toFixed(2)}g 사용 신청을 매장에서 확인합니다. 6자리 확인 코드를 준비해 주세요.`,
          link: "/profile",
          meta: { groupId, amountG },
        }),
        addNotificationForAdmins({
          type: "admin_bonus_gold_usage_requested",
          title: "적립 순금 사용 신청",
          body: `${amountG.toFixed(2)}g 사용 확인이 필요한 금교환 예약입니다.`,
          link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
          meta: { groupId, customerUid: uid, amountG },
        }),
      ]);
    }

    return {
      ok: true,
      balanceG: result.balanceMg / 1000,
      spendableG: 0,
      request: result.request,
    };
  }
);

export const bonusCancelGoldUsage = onCall(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const result = await db().runTransaction(async (tx) => {
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) {
        throw new HttpsError("not-found", "적립 순금 사용 신청을 찾을 수 없습니다.");
      }
      const data = requestSnap.data() || {};
      if (data.status !== "requested") {
        throw new HttpsError("failed-precondition", "매장 확정 전 신청만 취소할 수 있습니다.");
      }

      const groupId = cleanGroupId(data.groupId);
      const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
      const groupSnap = await tx.get(groupRef);
      const now = FieldValue.serverTimestamp();
      tx.update(requestRef, { status: "canceled", canceledAt: now, updatedAt: now });
      if (groupSnap.exists && String(groupSnap.get("bonusGoldRequestUid") || "") === uid) {
        tx.set(groupRef, {
          bonusGoldUsageStatus: "canceled",
          bonusGoldCanceledAt: now,
          updatedAt: now,
        }, { merge: true });
      }
      return {
        groupId,
        amountG: toNonNegativeInteger(data.amountMilliGrams) / 1000,
      };
    });

    await Promise.allSettled([
      addNotificationForUser(uid, {
        type: "bonus_gold_usage_canceled",
        title: "적립 순금 사용 신청 취소",
        body: `${result.amountG.toFixed(2)}g이 다시 사용 가능한 상태입니다.`,
        link: "/profile",
        meta: { groupId: result.groupId, amountG: result.amountG },
      }),
      addNotificationForAdmins({
        type: "admin_bonus_gold_usage_canceled",
        title: "적립 순금 사용 신청 취소",
        body: "고객이 적립 순금 사용 신청을 취소했습니다.",
        link: `/admin/gold-exchange?groupId=${encodeURIComponent(result.groupId)}`,
        meta: { groupId: result.groupId, customerUid: uid },
      }),
    ]);

    return { ok: true, ...result };
  }
);

export const bonusAdminConfirmGoldUsage = onCall<{
  groupId: string;
  requestCode: string;
  finalRecognizedG: number;
}>(
  { region: "asia-northeast3" },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    const adminUid = req.auth?.uid || "admin";
    const groupId = cleanGroupId(req.data?.groupId);
    const requestCode = cleanUsageCode(req.data?.requestCode);
    const finalRecognizedG = Number(req.data?.finalRecognizedG);

    if (!groupId || requestCode.length !== 6) {
      throw new HttpsError("invalid-argument", "교환번호와 고객의 6자리 확인 코드가 필요합니다.");
    }
    if (!Number.isFinite(finalRecognizedG) || finalRecognizedG <= 0 || finalRecognizedG > 1000000) {
      throw new HttpsError("invalid-argument", "현장에서 확인한 인정 순금 중량을 입력해 주세요.");
    }

    const exchangeQuery = db().collection("goldExchanges").where("groupId", "==", groupId);
    let exchangeDocs: FirebaseFirestore.DocumentSnapshot[] = (await exchangeQuery.get()).docs;
    if (exchangeDocs.length === 0) {
      const single = await db().doc(`goldExchanges/${groupId}`).get();
      if (single.exists) exchangeDocs = [single];
    }
    if (exchangeDocs.length === 0) throw new HttpsError("not-found", "금교환 예약을 찾을 수 없습니다.");

    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
    const result = await db().runTransaction(async (tx) => {
      const groupSnap = await tx.get(groupRef);
      if (!groupSnap.exists) throw new HttpsError("not-found", "금교환 예약 요약을 찾을 수 없습니다.");
      const groupData = groupSnap.data() || {};
      const uid = String(groupData.bonusGoldRequestUid || groupData.ownerUid || "");
      if (!uid || groupData.bonusGoldUsageStatus !== "requested") {
        throw new HttpsError("failed-precondition", "확인 대기 중인 적립 순금 신청이 없습니다.");
      }

      const userRef = db().doc(`users/${uid}`);
      const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
      const ledgerRef = userRef.collection("ledger").doc(`redeem_${groupId}`);
      const [userSnap, requestSnap, ledgerSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(requestRef),
        tx.get(ledgerRef),
      ]);
      const requestData = requestSnap.exists ? requestSnap.data() || {} : {};
      if (requestData.status === "used" && String(requestData.groupId || "") === groupId) {
        return {
          alreadyUsed: true,
          uid,
          amountG: Number(requestData.amountG || 0),
          finalRecognizedG: Number(requestData.finalRecognizedG || 0),
          finalAppliedG: Number(requestData.finalAppliedG || 0),
        };
      }
      if (
        requestData.status !== "requested" ||
        String(requestData.groupId || "") !== groupId ||
        cleanUsageCode(requestData.requestCode) !== requestCode
      ) {
        throw new HttpsError("failed-precondition", "고객의 6자리 확인 코드가 일치하지 않습니다.");
      }
      if (ledgerSnap.exists) {
        throw new HttpsError("already-exists", "이미 차감 처리된 적립 순금입니다.");
      }

      const amountMg = toNonNegativeInteger(requestData.amountMilliGrams);
      const balanceMg = bonusBalanceMilliGrams(userSnap.data());
      if (amountMg <= 0 || balanceMg < amountMg) {
        throw new HttpsError("failed-precondition", "고객의 적립 순금 잔액을 다시 확인해 주세요.");
      }

      const nextBalanceMg = balanceMg - amountMg;
      const amountG = amountMg / 1000;
      const recognizedG = roundTo3(finalRecognizedG);
      const finalAppliedG = roundTo3(recognizedG + amountG);
      const now = FieldValue.serverTimestamp();

      tx.set(userRef, {
        bonusGoldMilliGrams: nextBalanceMg,
        bonusGoldG: nextBalanceMg / 1000,
        bonusGoldUpdatedAt: now,
      }, { merge: true });
      tx.update(requestRef, {
        status: "used",
        finalRecognizedG: recognizedG,
        finalAppliedG,
        usedAt: now,
        usedBy: adminUid,
        updatedAt: now,
      });
      tx.create(ledgerRef, {
        direction: "debit",
        amountMilliGrams: amountMg,
        amountG,
        source: "gold_exchange_redemption",
        groupId,
        finalRecognizedG: recognizedG,
        finalAppliedG,
        createdAt: now,
        createdBy: adminUid,
      });
      tx.set(groupRef, {
        bonusGoldUsageStatus: "used",
        bonusGoldUsedMilliGrams: amountMg,
        bonusGoldUsedG: amountG,
        bonusGoldUsedAt: now,
        bonusGoldUsedBy: adminUid,
        finalRecognizedG: recognizedG,
        finalAppliedG,
        updatedAt: now,
      }, { merge: true });
      exchangeDocs.forEach((document) => {
        tx.set(document.ref, {
          bonusGoldUsageStatus: "used",
          bonusGoldUsedMilliGrams: amountMg,
          bonusGoldUsedG: amountG,
          bonusGoldUsedAt: now,
          bonusGoldUsedBy: adminUid,
          finalRecognizedG: recognizedG,
          finalAppliedG,
          updatedAt: now,
        }, { merge: true });
      });

      return { alreadyUsed: false, uid, amountG, finalRecognizedG: recognizedG, finalAppliedG };
    });

    if (!result.alreadyUsed) {
      await addNotificationForUser(result.uid, {
        type: "bonus_gold_usage_completed",
        title: "적립 순금 사용 완료",
        body: `적립 순금 ${result.amountG.toFixed(2)}g을 적용해 최종 ${result.finalAppliedG.toFixed(3)}g으로 확인했습니다.`,
        link: "/my-exchanges",
        meta: { groupId, amountG: result.amountG, finalAppliedG: result.finalAppliedG },
      });
    }
    return { ok: true, groupId, ...result };
  }
);

export const bonusAdminCancelGoldUsage = onCall<{ groupId: string; reason?: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    const groupId = cleanGroupId(req.data?.groupId);
    const reason = String(req.data?.reason || "매장 확인 중 신청 취소").trim().slice(0, 200);
    if (!groupId) throw new HttpsError("invalid-argument", "교환번호가 필요합니다.");

    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
    const result = await db().runTransaction(async (tx) => {
      const groupSnap = await tx.get(groupRef);
      if (!groupSnap.exists || groupSnap.get("bonusGoldUsageStatus") !== "requested") {
        throw new HttpsError("failed-precondition", "취소할 적립 순금 사용 신청이 없습니다.");
      }
      const uid = String(groupSnap.get("bonusGoldRequestUid") || "");
      const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists || requestSnap.get("status") !== "requested") {
        throw new HttpsError("failed-precondition", "고객의 사용 신청 상태를 다시 확인해 주세요.");
      }
      const amountG = toNonNegativeInteger(requestSnap.get("amountMilliGrams")) / 1000;
      const now = FieldValue.serverTimestamp();
      tx.update(requestRef, { status: "canceled", reason, canceledAt: now, updatedAt: now });
      tx.set(groupRef, {
        bonusGoldUsageStatus: "canceled",
        bonusGoldCanceledAt: now,
        bonusGoldCanceledBy: req.auth?.uid || "admin",
        bonusGoldCancelReason: reason,
        updatedAt: now,
      }, { merge: true });
      return { uid, amountG };
    });

    await addNotificationForUser(result.uid, {
      type: "bonus_gold_usage_canceled",
      title: "적립 순금 사용 신청 취소",
      body: `${result.amountG.toFixed(2)}g 사용 신청이 취소되어 다시 사용할 수 있습니다.`,
      link: "/profile",
      meta: { groupId, amountG: result.amountG, reason },
    });
    return { ok: true, groupId, ...result };
  }
);

async function reconcileBonusUsageForGroup(args: {
  groupId: string;
  targetStatus: string;
  adminUid: string;
}): Promise<void> {
  const { groupId, targetStatus, adminUid } = args;
  const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
  const result = await db().runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) return null;
    const groupData = groupSnap.data() || {};
    const usageStatus = String(groupData.bonusGoldUsageStatus || "");
    const uid = String(groupData.bonusGoldRequestUid || groupData.ownerUid || "");
    if (!uid || !["requested", "used"].includes(usageStatus)) return null;

    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const requestSnap = await tx.get(requestRef);
    const requestData = requestSnap.exists ? requestSnap.data() || {} : {};
    const now = FieldValue.serverTimestamp();

    if (usageStatus === "requested") {
      if (!["canceled", "rejected"].includes(targetStatus)) return null;
      if (requestData.status === "requested" && String(requestData.groupId || "") === groupId) {
        tx.update(requestRef, {
          status: "canceled",
          reason: `exchange_${targetStatus}`,
          canceledAt: now,
          updatedAt: now,
        });
      }
      tx.set(groupRef, {
        bonusGoldUsageStatus: "canceled",
        bonusGoldCanceledAt: now,
        bonusGoldCanceledBy: adminUid,
        updatedAt: now,
      }, { merge: true });
      return {
        uid,
        amountG: toNonNegativeInteger(groupData.bonusGoldRequestedMilliGrams) / 1000,
        restored: false,
      };
    }

    const amountMg = toNonNegativeInteger(groupData.bonusGoldUsedMilliGrams);
    if (amountMg <= 0) return null;
    const userRef = db().doc(`users/${uid}`);
    const restoreLedgerRef = userRef.collection("ledger").doc(`restore_${groupId}`);
    const [userSnap, restoreLedgerSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(restoreLedgerRef),
    ]);
    if (restoreLedgerSnap.exists) return null;

    const nextBalanceMg = bonusBalanceMilliGrams(userSnap.data()) + amountMg;
    tx.set(userRef, {
      bonusGoldMilliGrams: nextBalanceMg,
      bonusGoldG: nextBalanceMg / 1000,
      bonusGoldUpdatedAt: now,
    }, { merge: true });
    if (requestSnap.exists && String(requestData.groupId || "") === groupId) {
      tx.update(requestRef, {
        status: "restored",
        restoredAt: now,
        restoredBy: adminUid,
        restoreReason: `exchange_${targetStatus}`,
        updatedAt: now,
      });
    }
    tx.create(restoreLedgerRef, {
      direction: "credit",
      amountMilliGrams: amountMg,
      amountG: amountMg / 1000,
      source: "gold_exchange_redemption_restore",
      groupId,
      reason: `exchange_${targetStatus}`,
      createdAt: now,
      createdBy: adminUid,
    });
    tx.set(groupRef, {
      bonusGoldUsageStatus: "restored",
      bonusGoldRestoredAt: now,
      bonusGoldRestoredBy: adminUid,
      updatedAt: now,
    }, { merge: true });
    return { uid, amountG: amountMg / 1000, restored: true };
  });

  if (!result) return;
  await addNotificationForUser(result.uid, {
    type: result.restored ? "bonus_gold_usage_restored" : "bonus_gold_usage_canceled",
    title: result.restored ? "적립 순금이 복구되었습니다" : "적립 순금 사용 신청 취소",
    body: result.restored
      ? `교환 상태 변경으로 ${result.amountG.toFixed(2)}g이 다시 적립되었습니다.`
      : `${result.amountG.toFixed(2)}g 사용 신청이 취소되었습니다.`,
    link: "/profile",
    meta: { groupId, amountG: result.amountG, targetStatus },
  });
}
