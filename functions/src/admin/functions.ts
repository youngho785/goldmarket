// Administrative booking, member, role, and exchange-rate functions.
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  db,
  ENFORCE_APP_CHECK,
  requireCurrentAdmin,
  requireCurrentSuperAdmin,
  DEFAULT_PURITY,
  DEFAULT_EXCHANGE,
  DEFAULT_GOLD_RATES_VERSION,
  setReservedTime,
} from "../core/runtime.js";
import {
  adminBonusGoldGrams,
  adminMarketingConsentAccepted,
  adminMarketingPushReady,
  loadGoldVaultActivity,
} from "./memberAnalytics.js";

/* ─────────────────────────────────────────────────────────────
 * 2) 예약 슬롯 해제 (관리자 UI용)
 * ───────────────────────────────────────────────────────────── */
export const releaseReservedSlot = onCall<{ dateKey: string; time: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);
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

      tx.set(ref, setReservedTime(raw, dateKey, time, false));
    });

    return { ok: true, removed: time, dateKey };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 관리자 역할 변경 (최고 관리자 전용)
 * ───────────────────────────────────────────────────────────── */
export const setUserRole = onCall<{ uid: string; role: "user" | "admin" }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const callerUid = req.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await requireCurrentSuperAdmin(req.auth?.uid);

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

    const previousRole = target.customClaims?.admin === true ? "admin" : "user";
    await getAuth().setCustomUserClaims(uid, nextClaims);
    if (role === "user") {
      await getAuth().revokeRefreshTokens(uid);
    }

    await Promise.all([
      db().doc(`users/${uid}`).set(
        { role, roleUpdatedAt: FieldValue.serverTimestamp(), roleUpdatedBy: callerUid },
        { merge: true }
      ),
      db().collection("adminAuditLogs").add({
        action: "user_role_changed",
        targetUid: uid,
        actorUid: callerUid,
        previousRole,
        nextRole: role,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);
    return { ok: true, uid, role };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 관리자 회원 조회 / 나의 금고 운영 통계 / 계정 상태 변경
 * 개인 금제품 상세는 관리자 UI에 반환하지 않고 개수만 집계합니다.
 * ───────────────────────────────────────────────────────────── */

export const listAdminUsers = onCall<{ pageToken?: string; pageSize?: number }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);

    const pageSize = Math.max(1, Math.min(Math.trunc(Number(req.data?.pageSize) || 50), 100));
    const pageToken = String(req.data?.pageToken || "").trim();
    if (pageToken.length > 2_000) {
      throw new HttpsError("invalid-argument", "페이지 정보를 확인해 주세요.");
    }

    const result = await getAuth().listUsers(pageSize, pageToken || undefined);
    const profileSnapshots = result.users.length
      ? await db().getAll(...result.users.map((user) => db().doc(`users/${user.uid}`)))
      : [];
    const profiles = new Map(
      profileSnapshots.map((snapshot) => [snapshot.id, snapshot.data() || {}])
    );

    const vaultCountEntries = result.users.length
      ? await Promise.all(
          result.users.map(async (user) => {
            const countSnapshot = await db()
              .collection(`users/${user.uid}/goldVaultItems`)
              .count()
              .get();
            return [user.uid, Number(countSnapshot.data().count || 0)] as const;
          })
        )
      : [];
    const vaultCounts = new Map(vaultCountEntries);

    const promotionRefs = result.users.flatMap((user) => [
      {
        uid: user.uid,
        key: "welcome" as const,
        ref: db().doc(`users/${user.uid}/promotions/welcome_gold_v1`),
      },
      {
        uid: user.uid,
        key: "quiz" as const,
        ref: db().doc(`users/${user.uid}/promotions/gold_bonus_v1`),
      },
      {
        uid: user.uid,
        key: "marketingPush" as const,
        ref: db().doc(`users/${user.uid}/promotions/marketing_push_bonus_v1`),
      },
    ]);
    const promotionSnapshots = promotionRefs.length
      ? await db().getAll(...promotionRefs.map((entry) => entry.ref))
      : [];
    const bonusRewards = new Map<
      string,
      { welcome: boolean; quiz: boolean; marketingPush: boolean }
    >();

    promotionSnapshots.forEach((snapshot, index) => {
      const meta = promotionRefs[index];
      if (!meta) return;
      const current = bonusRewards.get(meta.uid) || {
        welcome: false,
        quiz: false,
        marketingPush: false,
      };
      current[meta.key] = snapshot.exists;
      bonusRewards.set(meta.uid, current);
    });

    return {
      users: result.users.map((user) => {
        const profile = profiles.get(user.uid) || {};
        const isSuperAdmin = user.customClaims?.superAdmin === true;
        const isAdmin = isSuperAdmin || user.customClaims?.admin === true;
        return {
          uid: user.uid,
          email: user.email || String(profile.email || ""),
          displayName:
            user.displayName ||
            String(profile.displayName || profile.nickname || ""),
          phoneNumber: user.phoneNumber || String(profile.phone || ""),
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          role: isSuperAdmin ? "superAdmin" : isAdmin ? "admin" : "user",
          createdAt: user.metadata.creationTime || null,
          lastSignInAt: user.metadata.lastSignInTime || null,
          bonusGoldG: adminBonusGoldGrams(profile),
          vaultItemCount: vaultCounts.get(user.uid) || 0,
          bonusRewards: bonusRewards.get(user.uid) || {
            welcome: false,
            quiz: false,
            marketingPush: false,
          },
        };
      }),
      nextPageToken: result.pageToken || null,
    };
  }
);

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function startOfKstDayUtc(now = new Date()): Date {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate()
    ) - KST_OFFSET_MS
  );
}

function startOfKstWeekUtc(now = new Date()): Date {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  const mondayOffset = (shifted.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() - mondayOffset
    ) - KST_OFFSET_MS
  );
}

function firestoreDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (!value || typeof value !== "object") return null;
  const candidate = value as { toDate?: () => Date };
  if (typeof candidate.toDate !== "function") return null;
  try {
    const result = candidate.toDate();
    return result instanceof Date && Number.isFinite(result.getTime()) ? result : null;
  } catch {
    return null;
  }
}

export const getAdminMyGoldOverview = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);

    const now = new Date();
    const todayStart = startOfKstDayUtc(now);
    const weekStart = startOfKstWeekUtc(now);
    const groups = db().collection("goldExchangeGroups");

    const [
      usersSnapshot,
      vaultActivity,
      todayExchangeRequests,
      weekExchangeRequests,
      todayExchangeCompleted,
      weekExchangeCompleted,
    ] = await Promise.all([
      db()
        .collection("users")
        .select(
          "bonusGoldMilliGrams",
          "bonusGoldG",
          "createdAt",
          "consents",
          "notificationPreferences",
          "marketingFcmToken",
          "fcmTokens"
        )
        .get(),
      loadGoldVaultActivity({ todayStart, weekStart }),
      groups.where("createdAt", ">=", todayStart).count().get(),
      groups.where("createdAt", ">=", weekStart).count().get(),
      groups.where("completedAt", ">=", todayStart).count().get(),
      groups.where("completedAt", ">=", weekStart).count().get(),
    ]);

    let bonusBalanceG = 0;
    let bonusHolderCount = 0;
    let todayNewUserCount = 0;
    let weekNewUserCount = 0;
    let marketingConsentCount = 0;
    let marketingPushReadyCount = 0;

    usersSnapshot.docs.forEach((document) => {
      const data = document.data();
      const balanceG = adminBonusGoldGrams(data);
      bonusBalanceG += balanceG;
      if (balanceG > 0) bonusHolderCount += 1;

      const createdAt = firestoreDate(data.createdAt);
      if (createdAt && createdAt >= todayStart) todayNewUserCount += 1;
      if (createdAt && createdAt >= weekStart) weekNewUserCount += 1;

      if (adminMarketingConsentAccepted(data)) marketingConsentCount += 1;
      if (adminMarketingPushReady(data)) marketingPushReadyCount += 1;
    });

    const userCount = usersSnapshot.size;
    const vaultUserCount = vaultActivity.activeUids.size;

    return {
      ok: true,
      asOf: now.toISOString(),
      period: {
        todayStart: todayStart.toISOString(),
        weekStart: weekStart.toISOString(),
      },
      userCount,
      todayNewUserCount,
      weekNewUserCount,
      vaultUserCount,
      vaultItemCount: vaultActivity.itemCount,
      todayVaultItemCount: vaultActivity.todayItemCount,
      weekVaultItemCount: vaultActivity.weekItemCount,
      vaultUsageRate:
        userCount > 0 ? Math.round((vaultUserCount / userCount) * 1000) / 10 : 0,
      bonusHolderCount,
      bonusBalanceG: Math.round(bonusBalanceG * 1000) / 1000,
      marketingConsentCount,
      marketingPushReadyCount,
      todayExchangeRequestCount: Number(todayExchangeRequests.data().count || 0),
      weekExchangeRequestCount: Number(weekExchangeRequests.data().count || 0),
      todayExchangeCompletedCount: Number(todayExchangeCompleted.data().count || 0),
      weekExchangeCompletedCount: Number(weekExchangeCompleted.data().count || 0),
    };
  }
);

export const setAdminUserDisabled = onCall<{ uid: string; disabled: boolean }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const callerUid = req.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await requireCurrentSuperAdmin(req.auth?.uid);

    const uid = String(req.data?.uid || "").trim();
    const disabled = req.data?.disabled;
    if (!uid || typeof disabled !== "boolean") {
      throw new HttpsError("invalid-argument", "사용자와 계정 상태를 확인해 주세요.");
    }
    if (uid === callerUid) {
      throw new HttpsError("failed-precondition", "현재 사용 중인 계정은 정지할 수 없습니다.");
    }

    const target = await getAuth().getUser(uid);
    if (target.customClaims?.superAdmin === true) {
      throw new HttpsError("failed-precondition", "최고 관리자 계정 상태는 변경할 수 없습니다.");
    }

    await getAuth().updateUser(uid, { disabled });
    if (disabled) {
      await getAuth().revokeRefreshTokens(uid);
    }
    await Promise.all([
      db().doc(`users/${uid}`).set(
        {
          disabled,
          accountStatusUpdatedAt: FieldValue.serverTimestamp(),
          accountStatusUpdatedBy: callerUid,
        },
        { merge: true }
      ),
      db().collection("adminAuditLogs").add({
        action: disabled ? "user_disabled" : "user_enabled",
        targetUid: uid,
        actorUid: callerUid,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);
    return { ok: true, uid, disabled };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 금교환 환산율 변경 (관리자, 버전 충돌 방지 + 감사 이력)
 * ───────────────────────────────────────────────────────────── */
function normalizeRateTable(
  value: unknown,
  defaults: Record<string, number>,
  label: string
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", `${label} 형식이 올바르지 않습니다.`);
  }
  const raw = value as Record<string, unknown>;
  const expectedKeys = Object.keys(defaults);
  if (
    Object.keys(raw).length !== expectedKeys.length ||
    expectedKeys.some((key) => !(key in raw))
  ) {
    throw new HttpsError("invalid-argument", `${label} 항목이 기본 품목과 일치하지 않습니다.`);
  }

  return Object.fromEntries(
    expectedKeys.map((key) => {
      const rate = Number(raw[key]);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
        throw new HttpsError(
          "invalid-argument",
          `${key} 환산율은 0보다 크고 1 이하여야 합니다.`
        );
      }
      return [key, Math.round(rate * 100_000) / 100_000];
    })
  );
}

export const updateGoldRates = onCall<{
  purity: Record<string, number>;
  exchange: Record<string, number>;
  expectedVersion: number;
  reason: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);
    const actorUid = req.auth?.uid || "system";
    const purity = normalizeRateTable(req.data?.purity, DEFAULT_PURITY, "품목별 환산율");
    const exchange = normalizeRateTable(req.data?.exchange, DEFAULT_EXCHANGE, "교환율");
    const expectedVersion = Math.trunc(Number(req.data?.expectedVersion));
    const reason = String(req.data?.reason || "").trim();
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new HttpsError("invalid-argument", "현재 환산율 버전을 확인해 주세요.");
    }
    if (reason.length < 5 || reason.length > 200) {
      throw new HttpsError("invalid-argument", "변경 사유는 5자 이상 200자 이하로 입력해 주세요.");
    }

    const ratesRef = db().doc("appConfig/goldRates");
    const historyRef = db().collection("goldRateHistory").doc();
    const nextVersion = await db().runTransaction(async (tx) => {
      const snapshot = await tx.get(ratesRef);
      const before = snapshot.exists ? snapshot.data() || {} : {};
      const currentVersion = Number(before.version) || DEFAULT_GOLD_RATES_VERSION;
      if (currentVersion !== expectedVersion) {
        throw new HttpsError(
          "aborted",
          "다른 관리자가 먼저 환산율을 변경했습니다. 새로고침 후 다시 확인해 주세요."
        );
      }
      const version = currentVersion + 1;
      const updatedAt = FieldValue.serverTimestamp();
      tx.set(ratesRef, {
        purity,
        exchange,
        version,
        reason,
        updatedAt,
        updatedBy: actorUid,
      });
      tx.set(historyRef, {
        version,
        reason,
        actorUid,
        before: {
          purity: { ...DEFAULT_PURITY, ...(before.purity || {}) },
          exchange: { ...DEFAULT_EXCHANGE, ...(before.exchange || {}) },
          version: currentVersion,
        },
        after: { purity, exchange, version },
        createdAt: updatedAt,
      });
      return version;
    });

    return { ok: true, version: nextVersion };
  }
);

