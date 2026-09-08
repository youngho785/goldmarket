// MY GOLD personal goal alerts.
// Goals are saved through a callable and evaluated automatically once per day.
import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  ALLOWED_BAR_DENOMS,
  DEFAULT_EXCHANGE,
  DEFAULT_PURITY,
  DON_TO_GRAMS,
  ENFORCE_APP_CHECK,
  computeFinalWeightFromRates,
  db,
  koreaDateKey,
  roundTo3,
} from "../core/runtime.js";
import {
  marketingPushEnabled,
  normalizeNotificationPreferences,
} from "./shared.js";

type PriceDirection = "up" | "down";

type AlertGoals = {
  enabled: boolean;
  valueTargetWon: number | null;
  priceTargetPerDon: number | null;
  priceDirection: PriceDirection;
  targetGoldBarG: number | null;
};

type AlertMetrics = {
  currentValueWon: number;
  currentPricePerDon: number;
  registeredItemCount: number;
  registeredPureGoldG: number;
  bonusGoldG: number;
  exchangeReadyG: number;
};

const EMPTY_GOALS: AlertGoals = {
  enabled: false,
  valueTargetWon: null,
  priceTargetPerDon: null,
  priceDirection: "up",
  targetGoldBarG: null,
};

const BAR_GRAMS = ALLOWED_BAR_DENOMS
  .map((item) => Number(item.grams))
  .filter((value) => Number.isFinite(value) && value > 0);

function nullableInteger(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpsError("invalid-argument", `${fieldName} 값을 확인해 주세요.`);
  }
  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} 범위를 확인해 주세요.`
    );
  }
  return rounded;
}

function nullableBarGrams(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  const match = BAR_GRAMS.find((grams) => Math.abs(grams - parsed) < 0.0001);
  if (!match) {
    throw new HttpsError("invalid-argument", "골드바 목표 규격을 확인해 주세요.");
  }
  return match;
}

function normalizePriceDirection(value: unknown, strict = false): PriceDirection {
  if (value === "down") return "down";
  if (value === "up" || value === null || value === undefined || value === "") return "up";
  if (strict) {
    throw new HttpsError("invalid-argument", "순금 가격 알림 방향을 확인해 주세요.");
  }
  return "up";
}

function normalizeGoals(value: unknown, strict = false): AlertGoals {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  if (!strict) {
    const valueTargetWon = Number(raw.valueTargetWon);
    const priceTargetPerDon = Number(raw.priceTargetPerDon);
    const targetGoldBarG = Number(raw.targetGoldBarG);
    const normalized: AlertGoals = {
      enabled: raw.enabled === true,
      valueTargetWon:
        Number.isFinite(valueTargetWon) && valueTargetWon > 0
          ? Math.round(valueTargetWon)
          : null,
      priceTargetPerDon:
        Number.isFinite(priceTargetPerDon) && priceTargetPerDon > 0
          ? Math.round(priceTargetPerDon)
          : null,
      priceDirection: normalizePriceDirection(raw.priceDirection),
      targetGoldBarG:
        Number.isFinite(targetGoldBarG) &&
        BAR_GRAMS.some((grams) => Math.abs(grams - targetGoldBarG) < 0.0001)
          ? targetGoldBarG
          : null,
    };
    if (
      !normalized.valueTargetWon &&
      !normalized.priceTargetPerDon &&
      !normalized.targetGoldBarG
    ) {
      normalized.enabled = false;
    }
    return normalized;
  }

  const normalized: AlertGoals = {
    enabled: raw.enabled !== false,
    valueTargetWon: nullableInteger(
      raw.valueTargetWon,
      1_000,
      100_000_000_000,
      "MY GOLD 가치 목표"
    ),
    priceTargetPerDon: nullableInteger(
      raw.priceTargetPerDon,
      10_000,
      100_000_000,
      "순금 시세 목표"
    ),
    priceDirection: normalizePriceDirection(raw.priceDirection, true),
    targetGoldBarG: nullableBarGrams(raw.targetGoldBarG),
  };

  if (
    !normalized.valueTargetWon &&
    !normalized.priceTargetPerDon &&
    !normalized.targetGoldBarG
  ) {
    normalized.enabled = false;
  }

  return normalized;
}

function hasMarketingPushTarget(
  userData: FirebaseFirestore.DocumentData | undefined
): boolean {
  if (!userData) return false;
  const hasExplicitTarget = Object.prototype.hasOwnProperty.call(
    userData,
    "marketingFcmToken"
  );
  if (hasExplicitTarget) {
    return typeof userData.marketingFcmToken === "string" &&
      userData.marketingFcmToken.trim().length >= 20;
  }
  return Array.isArray(userData.fcmTokens) &&
    userData.fcmTokens.some(
      (token: unknown) => typeof token === "string" && token.trim().length >= 20
    );
}

function goalPushReady(
  userData: FirebaseFirestore.DocumentData | undefined
): boolean {
  const preferences = normalizeNotificationPreferences(
    userData?.notificationPreferences
  );
  return marketingPushEnabled(userData, preferences) && hasMarketingPushTarget(userData);
}

function readBonusGoldG(data: FirebaseFirestore.DocumentData | undefined): number {
  const milliGrams = Number(data?.bonusGoldMilliGrams);
  if (Number.isFinite(milliGrams) && milliGrams >= 0) return milliGrams / 1000;
  const grams = Number(data?.bonusGoldG);
  return Number.isFinite(grams) && grams > 0 ? grams : 0;
}

function goldValueWon(pureGoldG: number, pricePerDon: number): number {
  if (pureGoldG <= 0 || pricePerDon <= 0) return 0;
  return Math.round((pureGoldG / DON_TO_GRAMS) * pricePerDon);
}

function goalKey(prefix: string, value: number | null): string {
  if (!value || value <= 0) return "";
  const normalized = Number.isInteger(value)
    ? String(value)
    : String(value).replace(".", "p");
  return `${prefix}:${normalized}`;
}

function notificationDocumentId(revision: number, reachedCodes: string[]): string {
  const code = reachedCodes
    .map((value) => String(value || "").replace(/[^a-z0-9_-]/gi, ""))
    .filter(Boolean)
    .join("-")
    .slice(0, 60);
  return `my-gold-goal-r${Math.max(0, Math.round(revision || 0))}-${code || "reached"}`;
}

function formatWon(value: number): string {
  return `${Math.round(Number(value) || 0).toLocaleString("ko-KR")}원`;
}

function formatGrams(value: number): string {
  const numeric = Number(value) || 0;
  const precision = numeric < 1 ? 3 : numeric < 10 ? 2 : 1;
  return `${numeric.toFixed(precision)}g`;
}

async function loadRates(): Promise<{
  purity: Record<string, number>;
  exchange: Record<string, number>;
}> {
  const snap = await db().doc("appConfig/goldRates").get();
  const data = snap.exists ? snap.data() || {} : {};
  return {
    purity: {
      ...DEFAULT_PURITY,
      ...(data.purity && typeof data.purity === "object" ? data.purity : {}),
    } as Record<string, number>,
    exchange: {
      ...DEFAULT_EXCHANGE,
      ...(data.exchange && typeof data.exchange === "object" ? data.exchange : {}),
    } as Record<string, number>,
  };
}

async function loadUserMetrics(
  uid: string,
  userData: FirebaseFirestore.DocumentData,
  currentPricePerDon: number,
  purity: Record<string, number>,
  exchange: Record<string, number>
): Promise<AlertMetrics> {
  const items = await db().collection(`users/${uid}/goldVaultItems`).get();
  let registeredItemCount = 0;
  let registeredPureGoldG = 0;

  items.docs.forEach((document) => {
    const data = document.data() || {};
    const weightG = Number(data.weightG) || 0;
    const goldType = String(data.goldType || "");
    if (weightG <= 0 || !goldType) return;

    const recognizedG = computeFinalWeightFromRates({
      grams: weightG,
      goldType,
      exchangeType: "999.9골드바",
      purity,
      exchange,
    });
    if (recognizedG <= 0) return;

    registeredItemCount += 1;
    registeredPureGoldG += recognizedG;
  });

  registeredPureGoldG = roundTo3(registeredPureGoldG);
  const bonusGoldG = roundTo3(readBonusGoldG(userData));
  const exchangeReadyG = roundTo3(registeredPureGoldG + bonusGoldG);

  return {
    currentValueWon: goldValueWon(exchangeReadyG, currentPricePerDon),
    currentPricePerDon,
    registeredItemCount,
    registeredPureGoldG,
    bonusGoldG,
    exchangeReadyG,
  };
}

function buildVaultAggregateByUid(
  documents: FirebaseFirestore.QueryDocumentSnapshot[],
  purity: Record<string, number>,
  exchange: Record<string, number>
): Map<string, { registeredItemCount: number; registeredPureGoldG: number }> {
  const result = new Map<string, { registeredItemCount: number; registeredPureGoldG: number }>();
  documents.forEach((document) => {
    const uid = document.ref.parent.parent?.id || "";
    if (!uid) return;
    const data = document.data() || {};
    const weightG = Number(data.weightG) || 0;
    const goldType = String(data.goldType || "");
    if (weightG <= 0 || !goldType) return;

    const recognizedG = computeFinalWeightFromRates({
      grams: weightG,
      goldType,
      exchangeType: "999.9골드바",
      purity,
      exchange,
    });
    if (recognizedG <= 0) return;

    const current = result.get(uid) || { registeredItemCount: 0, registeredPureGoldG: 0 };
    current.registeredItemCount += 1;
    current.registeredPureGoldG = roundTo3(current.registeredPureGoldG + recognizedG);
    result.set(uid, current);
  });
  return result;
}

function metricsFromAggregate(
  aggregate: { registeredItemCount: number; registeredPureGoldG: number } | undefined,
  userData: FirebaseFirestore.DocumentData,
  currentPricePerDon: number
): AlertMetrics {
  const registeredItemCount = aggregate?.registeredItemCount || 0;
  const registeredPureGoldG = roundTo3(aggregate?.registeredPureGoldG || 0);
  const bonusGoldG = roundTo3(readBonusGoldG(userData));
  const exchangeReadyG = roundTo3(registeredPureGoldG + bonusGoldG);
  return {
    currentValueWon: goldValueWon(exchangeReadyG, currentPricePerDon),
    currentPricePerDon,
    registeredItemCount,
    registeredPureGoldG,
    bonusGoldG,
    exchangeReadyG,
  };
}

async function evaluateUserGoals(
  uid: string,
  metrics: AlertMetrics,
  source: "save" | "daily"
): Promise<{ notified: boolean; reached: string[]; pushReady: boolean }> {
  const userRef = db().doc(`users/${uid}`);
  const result = { notified: false, reached: [] as string[], pushReady: false };

  await db().runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) return;

    const userData = userSnap.data() || {};
    const goals = normalizeGoals(userData.myGoldAlertGoals);
    const pushReady = goalPushReady(userData);
    result.pushReady = pushReady;

    if (!goals.enabled) return;

    const rawState =
      userData.myGoldAlertState &&
      typeof userData.myGoldAlertState === "object" &&
      !Array.isArray(userData.myGoldAlertState)
        ? userData.myGoldAlertState as Record<string, unknown>
        : {};

    const valueKey = goalKey("value", goals.valueTargetWon);
    // Keep the legacy upward key unchanged so existing reached state remains valid.
    const priceKey = goalKey(
      goals.priceDirection === "down" ? "price-down" : "price",
      goals.priceTargetPerDon
    );
    const barKey = goalKey("bar", goals.targetGoldBarG);

    const valueAlreadyReached =
      String(rawState.valueGoalKey || "") === valueKey && rawState.valueReached === true;
    const priceAlreadyReached =
      String(rawState.priceGoalKey || "") === priceKey && rawState.priceReached === true;
    const barAlreadyReached =
      String(rawState.barGoalKey || "") === barKey && rawState.barReached === true;

    const reached: string[] = [];
    const reachedCodes: string[] = [];
    let valueReached = valueAlreadyReached;
    let priceReached = priceAlreadyReached;
    let barReached = barAlreadyReached;

    // Consent/push can be enabled later. Do not consume a one-time goal while push is unavailable.
    if (pushReady) {
      if (
        goals.valueTargetWon &&
        !valueReached &&
        metrics.currentValueWon >= goals.valueTargetWon
      ) {
        valueReached = true;
        reachedCodes.push("value");
        reached.push(`MY GOLD 참고가치 ${formatWon(goals.valueTargetWon)} 목표`);
      }

      const priceTargetReached = goals.priceTargetPerDon
        ? goals.priceDirection === "down"
          ? metrics.currentPricePerDon <= goals.priceTargetPerDon
          : metrics.currentPricePerDon >= goals.priceTargetPerDon
        : false;

      if (goals.priceTargetPerDon && !priceReached && priceTargetReached) {
        priceReached = true;
        reachedCodes.push("price");
        reached.push(
          `순금 참고시세 1돈 ${formatWon(goals.priceTargetPerDon)} ${
            goals.priceDirection === "down" ? "이하 도달" : "이상 도달"
          }`
        );
      }

      if (
        goals.targetGoldBarG &&
        !barReached &&
        metrics.exchangeReadyG + 1e-9 >= goals.targetGoldBarG
      ) {
        barReached = true;
        reachedCodes.push("bar");
        reached.push(`${formatGrams(goals.targetGoldBarG)} 골드바 교환 가능 목표`);
      }
    }

    const revision = Math.max(0, Math.round(Number(userData.myGoldAlertRevision) || 0));
    const notificationRef = reached.length
      ? db().doc(
          `notifications/${uid}/items/${notificationDocumentId(revision, reachedCodes)}`
        )
      : null;
    const existing = notificationRef ? await tx.get(notificationRef) : null;

    const now = FieldValue.serverTimestamp();
    tx.set(
      userRef,
      {
        myGoldAlertState: {
          valueGoalKey: valueKey,
          valueReached,
          priceGoalKey: priceKey,
          priceReached,
          barGoalKey: barKey,
          barReached,
          lastCurrentValueWon: metrics.currentValueWon,
          lastPricePerDon: metrics.currentPricePerDon,
          lastExchangeReadyG: metrics.exchangeReadyG,
          lastEvaluatedSource: source,
          lastEvaluatedAt: now,
        },
      },
      { merge: true }
    );

    if (notificationRef && existing && !existing.exists) {
      const bodyParts = reached.slice(0, 2);
      if (reached.length > 2) bodyParts.push(`외 ${reached.length - 2}개 목표`);
      tx.set(notificationRef, {
        type: "my_gold_goal_reached",
        title: reached.length > 1 ? "MY GOLD 목표에 도달했어요" : "MY GOLD 목표 도달",
        body: `${bodyParts.join(" · ")}에 도달했습니다. 현재 MY GOLD를 확인해 보세요.`,
        link: "/my-gold/alerts",
        meta: {
          reached,
          goals,
          metrics,
          source,
          revision,
          reachedDate: koreaDateKey(),
        },
        createdAt: now,
        read: false,
      });
      result.notified = true;
      result.reached = reached;
    }
  });

  return result;
}

export const saveMyGoldAlertGoals = onCall<{
  goals?: unknown;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const goals = normalizeGoals(request.data?.goals, true);
    const userRef = db().doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "회원 정보를 확인하지 못했습니다.");
    }
    const currentUserData = userSnap.data() || {};
    const currentPushReady = goalPushReady(currentUserData);

    const nextRevision = Math.max(0, Math.round(Number(userSnap.get("myGoldAlertRevision")) || 0)) + 1;

    await userRef.set(
      {
        myGoldAlertGoals: goals,
        myGoldAlertGoalsUpdatedAt: FieldValue.serverTimestamp(),
        myGoldAlertRevision: nextRevision,
        // Saving a goal means the member intentionally wants a fresh one-time alert.
        myGoldAlertState: {
          valueGoalKey: goalKey("value", goals.valueTargetWon),
          valueReached: false,
          priceGoalKey: goalKey(
            goals.priceDirection === "down" ? "price-down" : "price",
            goals.priceTargetPerDon
          ),
          priceReached: false,
          barGoalKey: goalKey("bar", goals.targetGoldBarG),
          barReached: false,
          lastEvaluatedAt: FieldValue.serverTimestamp(),
          lastEvaluatedSource: "save-reset",
        },
      },
      { merge: true }
    );

    if (!goals.enabled) {
      return { ok: true, goals, notified: false, reached: [], pushReady: currentPushReady };
    }

    const [freshUserSnap, publicConfigSnap, currentPriceSnap, rates] = await Promise.all([
      userRef.get(),
      db().doc("goldPricePublic/config").get(),
      db().doc("goldPrices/current").get(),
      loadRates(),
    ]);

    const freshUserData = freshUserSnap.data() || {};
    const pushReady = goalPushReady(freshUserData);
    const publicEnabled = publicConfigSnap.exists && publicConfigSnap.get("enabled") === true;
    const currentPricePerDon = Number(currentPriceSnap.get("market.pureGoldBuyPerDon")) || 0;

    if (!publicEnabled || currentPricePerDon <= 0) {
      return { ok: true, goals, notified: false, reached: [], pushReady };
    }

    const metrics = await loadUserMetrics(
      uid,
      freshUserData,
      currentPricePerDon,
      rates.purity,
      rates.exchange
    );
    const evaluation = await evaluateUserGoals(uid, metrics, "save");

    return { ok: true, goals, ...evaluation, metrics };
  }
);

export const checkMyGoldAlertGoals = onSchedule(
  {
    schedule: "20 16 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 300,
    retryCount: 1,
  },
  async () => {
    const [publicConfigSnap, currentPriceSnap, rates, usersSnapshot, vaultSnapshot] = await Promise.all([
      db().doc("goldPricePublic/config").get(),
      db().doc("goldPrices/current").get(),
      loadRates(),
      db().collection("users").get(),
      db().collectionGroup("goldVaultItems").get(),
    ]);

    if (!publicConfigSnap.exists || publicConfigSnap.get("enabled") !== true) {
      console.log("[checkMyGoldAlertGoals] skipped=public-price-disabled");
      return;
    }

    const currentPricePerDon = Number(currentPriceSnap.get("market.pureGoldBuyPerDon")) || 0;
    if (currentPricePerDon <= 0) {
      console.log("[checkMyGoldAlertGoals] skipped=current-price-missing");
      return;
    }

    const vaultByUid = buildVaultAggregateByUid(
      vaultSnapshot.docs,
      rates.purity,
      rates.exchange
    );

    let enabledCount = 0;
    let notifiedCount = 0;

    for (const userDocument of usersSnapshot.docs) {
      const userData = userDocument.data() || {};
      const goals = normalizeGoals(userData.myGoldAlertGoals);
      if (!goals.enabled) continue;

      enabledCount += 1;
      if (!goalPushReady(userData)) continue;

      const metrics = metricsFromAggregate(
        vaultByUid.get(userDocument.id),
        userData,
        currentPricePerDon
      );
      const evaluation = await evaluateUserGoals(
        userDocument.id,
        metrics,
        "daily"
      );
      if (evaluation.notified) notifiedCount += 1;
    }

    console.log(
      `[checkMyGoldAlertGoals] date=${koreaDateKey()} enabled=${enabledCount} notified=${notifiedCount}`
    );
  }
);

export { EMPTY_GOALS };
