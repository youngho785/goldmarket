// Push delivery, admin campaigns, reservation reminders, MY GOLD reports, and slot cleanup.
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { type BatchResponse, type SendResponse } from "firebase-admin/messaging";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  db,
  msg,
  IN_EMULATOR,
  ENFORCE_APP_CHECK,
  requireCurrentAdmin,
  DON_TO_GRAMS,
  DEFAULT_PURITY,
  DEFAULT_EXCHANGE,
  roundTo3,
  koreaDateKey,
  addDaysToDateKey,
  BOOKING_AVAILABILITY_REF,
  normalizeRequiredString,
  computeFinalWeightFromRates,
  addUniqueNotificationForAdmins,
} from "../core/runtime.js";
import { adminBonusGoldGrams, loadGoldVaultActivity } from "../admin/memberAnalytics.js";
import {
  type NotificationPreferences,
  normalizeNotificationPreferences,
  notificationCategory,
  marketingPushEnabled,
  shouldSendPushForUser,
  type PushDeviceInput,
  pushDeviceIdForToken,
  readPushDevices,
  removePushDevicesForTokens,
  normalizedPushDevice,
} from "./shared.js";

/* ─────────────────────────────────────────────────────────────
 * 6) FCM 토큰 소유권 연결
 * - 같은 기기 토큰이 여러 회원에게 동시에 연결되지 않도록 서버에서 이전합니다.
 * - 로그아웃만으로는 토큰을 지우지 않지만, 다른 계정이 로그인하면 새 계정으로 소유권이 이동합니다.
 * - 현재 계정이 이미 금시세·혜택 알림에 동의했고 대표 수신 기기가 비어 있으면,
 *   다시 로그인한 현재 기기를 대표 수신 기기로 자동 복구합니다.
 * - 다른 대표 수신 기기가 이미 지정되어 있으면 절대 덮어쓰지 않습니다.
 * ───────────────────────────────────────────────────────────── */
export const bindPushToken = onCall<{
  token: string;
  native?: boolean;
  device?: PushDeviceInput;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const token = String(req.data?.token || "").trim();
    const native = req.data?.native === true;

    if (token.length < 20 || token.length > 4_096) {
      throw new HttpsError("invalid-argument", "유효한 알림 토큰이 필요합니다.");
    }

    const requestUserAgent = String(
      req.rawRequest?.headers?.["user-agent"] || ""
    );
    const device = normalizedPushDevice(
      native,
      req.data?.device,
      requestUserAgent
    );
    const deviceId = pushDeviceIdForToken(token);
    const now = new Date();

    const users = db().collection("users");
    const targetRef = users.doc(uid);
    const ownersQuery = users.where("fcmTokens", "array-contains", token);

    const movedFrom = await db().runTransaction(async (tx) => {
      const [ownersSnapshot, targetSnapshot] = await Promise.all([
        tx.get(ownersQuery),
        tx.get(targetRef),
      ]);

      let previousOwners = 0;

      ownersSnapshot.docs.forEach((ownerDoc) => {
        if (ownerDoc.id === uid) return;

        previousOwners += 1;

        const ownerData = ownerDoc.data() || {};
        const ownerPushDevices = readPushDevices(ownerData.pushDevices);
        delete ownerPushDevices[deviceId];

        const patch: FirebaseFirestore.DocumentData = {
          fcmTokens: FieldValue.arrayRemove(token),
          nativeFcmTokens: FieldValue.arrayRemove(token),
          pushDevices: ownerPushDevices,
          pushTokensUpdatedAt: FieldValue.serverTimestamp(),
        };

        if (String(ownerData.marketingFcmToken || "").trim() === token) {
          patch.marketingFcmToken = null;
          patch.marketingFcmBrowser = "";
          patch.marketingFcmTokenUpdatedAt = FieldValue.serverTimestamp();
        }

        tx.set(ownerDoc.ref, patch, { merge: true });
      });

      const targetData = targetSnapshot.exists
        ? (targetSnapshot.data() || {})
        : {};

      /*
       * A → B → 다시 A처럼 같은 기기에서 계정을 전환한 경우,
       * B로 토큰이 이동할 때 A의 marketingFcmToken은 개인정보 보호를 위해 비워집니다.
       *
       * A가 다시 로그인하면:
       * - A의 광고성 정보 수신동의가 여전히 ON이고
       * - 금시세 알림 선호도 ON이며
       * - A에게 다른 대표 수신 기기가 지정되어 있지 않을 때만
       * 현재 기기를 대표 수신 기기로 자동 복구합니다.
       *
       * 이미 다른 기기가 대표 수신 기기라면 그대로 유지합니다.
       */
      const targetPreferences = normalizeNotificationPreferences(
        targetData.notificationPreferences
      );
      const existingMarketingFcmToken = String(
        targetData.marketingFcmToken || ""
      ).trim();
      const shouldRestoreMarketingTarget =
        !existingMarketingFcmToken &&
        marketingPushEnabled(targetData, targetPreferences);

      const targetPushDevices = readPushDevices(targetData.pushDevices);
      const existingDevice =
        targetPushDevices[deviceId] &&
        typeof targetPushDevices[deviceId] === "object"
          ? targetPushDevices[deviceId]
          : {};

      targetPushDevices[deviceId] = {
        ...existingDevice,
        token,
        label: device.label,
        browser: device.browser,
        platform: device.platform,
        channel: device.channel,
        native,
        firstSeenAt: existingDevice.firstSeenAt || now,
        lastSeenAt: now,
      };

      const targetPatch: FirebaseFirestore.DocumentData = {
        fcmTokens: FieldValue.arrayUnion(token),
        pushDevices: targetPushDevices,
        pushTokensUpdatedAt: FieldValue.serverTimestamp(),
      };

      if (native) {
        targetPatch.nativeFcmTokens = FieldValue.arrayUnion(token);
      }

      if (shouldRestoreMarketingTarget) {
        targetPatch.marketingFcmToken = token;
        targetPatch.marketingFcmBrowser =
          native
            ? "한국골드마켓 앱"
            : device.browser || device.label || "현재 브라우저";
        targetPatch.marketingFcmTokenUpdatedAt =
          FieldValue.serverTimestamp();
      }

      if (!targetSnapshot.exists) {
        targetPatch.createdAt = FieldValue.serverTimestamp();
      }

      tx.set(targetRef, targetPatch, { merge: true });

      return previousOwners;
    });

    return {
      ok: true,
      native,
      movedFrom,
      deviceId,
      device,
    };
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

      const userData = userSnap.exists ? userSnap.data() : undefined;
      const preferences = normalizeNotificationPreferences(
        userSnap.get("notificationPreferences")
      );

      if (!shouldSendPushForUser(userData, preferences, notif.type)) {
        return;
      }

      const allTokens = [
        ...new Set(
          ((userSnap.get("fcmTokens") || []) as unknown[]).filter(
            (token): token is string =>
              typeof token === "string" && token.trim().length > 0
          )
        ),
      ];

      /*
       * Android Capacitor 앱에서 발급된 토큰은
       * users/{uid}.nativeFcmTokens[] 에도 함께 저장됩니다.
       *
       * 이 목록을 기준으로 Web Push 토큰과
       * Android Native FCM 토큰을 구분합니다.
       */
      const nativeTokenSet = new Set(
        ((userSnap.get("nativeFcmTokens") || []) as unknown[]).filter(
          (token): token is string =>
            typeof token === "string" && token.trim().length > 0
        )
      );

      const category = notificationCategory(notif.type);
      const isMarketingCategory =
        category === "goldNews" || category === "benefits";

      let tokens: string[] = allTokens;

      if (isMarketingCategory) {
        const hasExplicitMarketingTarget =
          !!userData &&
          Object.prototype.hasOwnProperty.call(
            userData,
            "marketingFcmToken"
          );

        const marketingFcmToken =
          typeof userData?.marketingFcmToken === "string"
            ? userData.marketingFcmToken.trim()
            : "";

        if (marketingFcmToken) {
          /*
           * 금시세·뉴스·이벤트·혜택은
           * 사용자가 지정한 대표 수신 기기 1개로만 보냅니다.
           *
           * 이 토큰이 Android Native 토큰인지 Web Push 토큰인지는
           * 아래 nativeTokenSet으로 자동 판별합니다.
           */
          tokens = [marketingFcmToken];
        } else if (hasExplicitMarketingTarget) {
          /*
           * null/빈 값이 명시되어 있으면
           * 아직 대표 수신 기기가 없는 상태입니다.
           */
          tokens = [];
        } else {
          /*
           * 기존 회원 마이그레이션:
           *
           * marketingFcmToken 필드가 아직 없는 기존 회원은
           * fcmTokens 전체에 보내지 않고 마지막 토큰 1개만 임시 사용합니다.
           *
           * 따라서 기존 Chrome + 삼성인터넷 중복 푸시도 방지됩니다.
           */
          tokens = allTokens.length
            ? [allTokens[allTokens.length - 1]]
            : [];
        }
      }

      if (!tokens.length) return;

      const title = String(notif.title || "알림");
      const body = String(notif.body || "");
      const link = String(notif.link || "/");
      const notificationId = String(event.params.docId || "");

      const data = {
        type: String(notif.type || "notification"),
        title,
        body,
        link,
        notificationId,
      };

      /*
       * 같은 회원의 fcmTokens[] 안에는
       * Web Push와 Android Native Push가 함께 존재할 수 있습니다.
       *
       * Web:
       *   data-only 메시지를 보내고 public/sw.js가 알림을 표시합니다.
       *
       * Android Native:
       *   notification + data 메시지를 보내 Android 시스템이
       *   앱이 백그라운드인 상태에서도 시스템 알림을 표시할 수 있게 합니다.
       */
      const nativeTokens = tokens.filter((token) =>
        nativeTokenSet.has(token)
      );

      const webTokens = tokens.filter(
        (token) => !nativeTokenSet.has(token)
      );

      const badTokens = new Set<string>();

      const collectBadTokens = (
        response: BatchResponse,
        sentTokens: string[]
      ) => {
        response.responses.forEach((result: SendResponse, index: number) => {
          if (result.success) return;

          const code =
            (result.error as { code?: string } | undefined)?.code || "";

          if (
            code.includes("registration-token-not-registered") ||
            code.includes("messaging/registration-token-not-registered") ||
            code.includes("invalid-registration-token") ||
            code.includes("messaging/invalid-registration-token") ||
            code.includes("invalid-argument")
          ) {
            const failedToken = sentTokens[index];

            if (failedToken) {
              badTokens.add(failedToken);
            }
          }
        });
      };

      /*
       * Web / PWA
       */
      if (webTokens.length) {
        const webResponse: BatchResponse =
          await msg().sendEachForMulticast({
            tokens: webTokens,
            data,
            webpush: {
              headers: {
                Urgency: "high",
              },
            },
          });

        collectBadTokens(webResponse, webTokens);
      }

      /*
       * Android Native 앱
       */
      if (nativeTokens.length) {
        const nativeResponse: BatchResponse =
          await msg().sendEachForMulticast({
            tokens: nativeTokens,
            notification: {
              title,
              body,
            },
            data,
            android: {
              priority: "high",
              notification: {
                icon: "ic_stat_goldmarket",
              },
            },
          });

        collectBadTokens(nativeResponse, nativeTokens);
      }

      /*
       * 만료/무효 토큰 정리
       *
       * fcmTokens[]와 nativeFcmTokens[] 양쪽에서 제거합니다.
       */
      const bad = [...badTokens];

      if (bad.length) {
        const updates: FirebaseFirestore.DocumentData = {
          fcmTokens: FieldValue.arrayRemove(...bad),
          nativeFcmTokens: FieldValue.arrayRemove(...bad),
          pushDevices: removePushDevicesForTokens(
            userData?.pushDevices,
            bad
          ),
        };

        const currentMarketingFcmToken =
          typeof userData?.marketingFcmToken === "string"
            ? userData.marketingFcmToken.trim()
            : "";

        if (
          currentMarketingFcmToken &&
          bad.includes(currentMarketingFcmToken)
        ) {
          /*
           * 사용자가 선택한 대표 수신 기기 토큰 자체가 만료된 경우
           * 다른 브라우저나 앱으로 임의 전환하지 않습니다.
           */
          updates.marketingFcmToken = null;
          updates.marketingFcmBrowser = "";
          updates.marketingFcmTokenUpdatedAt =
            FieldValue.serverTimestamp();
        }

        await db()
          .doc(`users/${uid}`)
          .update(updates)
          .catch(() => {});
      }
    } catch (error) {
      console.error("[onNotificationCreate] error:", error);
    }
  }
);


/* ─────────────────────────────────────────────────────────────
 * 현재 기기 푸시 연결 시험
 * ───────────────────────────────────────────────────────────── */
export const sendPushTestNotification = onCall<{ token: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const token = String(req.data?.token || "").trim();

    if (token.length < 20 || token.length > 4_096) {
      throw new HttpsError(
        "invalid-argument",
        "현재 기기의 푸시 토큰 형식이 올바르지 않습니다."
      );
    }

    const userRef = db().doc(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요."
      );
    }

    const registeredTokens = [
      ...new Set(
        ((userSnap.get("fcmTokens") || []) as unknown[]).filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0
        )
      ),
    ];

    if (!registeredTokens.includes(token)) {
      throw new HttpsError(
        "failed-precondition",
        "현재 기기의 푸시 등록을 확인할 수 없습니다. 상태를 새로 확인한 뒤 다시 시도해 주세요.",
        { reason: "token-not-registered" }
      );
    }

    const nativeTokenSet = new Set(
      ((userSnap.get("nativeFcmTokens") || []) as unknown[]).filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0
      )
    );

    const isNativeToken = nativeTokenSet.has(token);

    // 실수로 버튼을 연속해서 눌러 푸시가 반복 발송되는 것을 막습니다.
    const rateLimitRef = db().doc(`pushTestRateLimits/${uid}`);

    await db().runTransaction(async (tx) => {
      const rateLimitSnap = await tx.get(rateLimitRef);

      const lastRequestedAt = rateLimitSnap.exists
        ? (rateLimitSnap.get("lastRequestedAt") as
            | { toMillis?: () => number }
            | undefined)
        : undefined;

      const lastRequestedAtMs =
        lastRequestedAt?.toMillis?.() || 0;

      if (Date.now() - lastRequestedAtMs < 20_000) {
        throw new HttpsError(
          "resource-exhausted",
          "시험 알림은 20초 후에 다시 보낼 수 있습니다."
        );
      }

      tx.set(
        rateLimitRef,
        {
          lastRequestedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    const requestedAt = new Date().toISOString();
    const title = "한국골드마켓 시험 알림";
    const body = "현재 기기의 알림 연결이 정상입니다.";
    const notificationId = `push-test-${Date.now()}`;

    const data = {
      type: "push_test",
      title,
      body,
      link: "/profile",
      notificationId,
    };

    try {
      /*
       * Android Native 토큰은 notification + data,
       * Web Push 토큰은 기존과 동일한 data-only 방식으로 발송합니다.
       */
      const messageId = isNativeToken
        ? await msg().send({
            token,
            notification: {
              title,
              body,
            },
            data,
            android: {
              priority: "high",
            },
          })
        : await msg().send({
            token,
            data,
            webpush: {
              headers: {
                Urgency: "high",
              },
            },
          });

      return {
        ok: true,
        acceptedAt: requestedAt,
        messageId,
        platform: isNativeToken ? "android-native" : "web",
      };
    } catch (error) {
      const code =
        (error as { code?: string } | undefined)?.code || "";

      const isExpiredToken =
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token") ||
        code.includes("invalid-argument");

      if (isExpiredToken) {
        const updates: FirebaseFirestore.DocumentData = {
          fcmTokens: FieldValue.arrayRemove(token),
          nativeFcmTokens: FieldValue.arrayRemove(token),
          pushDevices: removePushDevicesForTokens(
            userSnap.get("pushDevices"),
            [token]
          ),
        };

        const marketingFcmToken = String(
          userSnap.get("marketingFcmToken") || ""
        ).trim();

        if (marketingFcmToken === token) {
          updates.marketingFcmToken = null;
          updates.marketingFcmBrowser = "";
          updates.marketingFcmTokenUpdatedAt =
            FieldValue.serverTimestamp();
        }

        await userRef.update(updates).catch(() => {});

        throw new HttpsError(
          "failed-precondition",
          "이 기기의 푸시 토큰이 만료되었습니다. 상태를 새로 확인한 뒤 다시 시도해 주세요.",
          { reason: "token-expired" }
        );
      }

      console.error("[sendPushTestNotification] error", {
        uid,
        code,
        isNativeToken,
        error,
      });

      throw new HttpsError(
        "unavailable",
        "시험 알림 발송 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  }
);


/* ─────────────────────────────────────────────────────────────
 * 관리자 수동 알림 발송 / 이력 조회
 * ───────────────────────────────────────────────────────────── */

type AdminNotificationTarget =
  | "all"
  | "goldNews"
  | "myGoldEmpty"
  | "myGoldActive"
  | "bonusGoldHolders"
  | "reservationCustomers"
  | "specific";

type AdminNotificationCategory =
  | "goldNews"
  | "myGold"
  | "benefits"
  | "exchange"
  | "general";

const ADMIN_NOTIFICATION_TARGETS: AdminNotificationTarget[] = [
  "all",
  "goldNews",
  "myGoldEmpty",
  "myGoldActive",
  "bonusGoldHolders",
  "reservationCustomers",
  "specific",
];

const ADMIN_NOTIFICATION_CATEGORIES: AdminNotificationCategory[] = [
  "goldNews",
  "myGold",
  "benefits",
  "exchange",
  "general",
];

function isMyGoldCampaignTarget(targetType: AdminNotificationTarget): boolean {
  return ["myGoldEmpty", "myGoldActive", "bonusGoldHolders"].includes(targetType);
}

function isMarketingAdminCategory(category: AdminNotificationCategory): boolean {
  return ["goldNews", "myGold", "benefits"].includes(category);
}

function assertAdminNotificationSelection(
  targetType: AdminNotificationTarget,
  category: AdminNotificationCategory
): void {
  if (!ADMIN_NOTIFICATION_TARGETS.includes(targetType)) {
    throw new HttpsError(
      "invalid-argument",
      "알림 발송 대상을 확인해 주세요."
    );
  }

  if (!ADMIN_NOTIFICATION_CATEGORIES.includes(category)) {
    throw new HttpsError(
      "invalid-argument",
      "알림 종류를 확인해 주세요."
    );
  }
}

function normalizeInternalNotificationLink(value: unknown): string {
  const link = String(value || "/").trim();

  if (
    !link.startsWith("/") ||
    link.startsWith("//") ||
    link.includes("\\") ||
    link.length > 200
  ) {
    throw new HttpsError(
      "invalid-argument",
      "알림 이동 주소는 사이트 내부 경로만 사용할 수 있습니다."
    );
  }

  return link;
}

function manualNotificationType(category: AdminNotificationCategory): string {
  if (category === "goldNews") return "gold_news_admin";
  if (category === "myGold") return "my_gold_admin";
  if (category === "benefits") return "benefit_admin";
  if (category === "exchange") return "exchange_admin";
  return "admin_notice";
}

function preferenceAllowsCategory(
  userData: FirebaseFirestore.DocumentData | undefined,
  preferences: NotificationPreferences,
  category: AdminNotificationCategory
): boolean {
  if (category === "exchange") return true;
  if (isMarketingAdminCategory(category)) {
    return marketingPushEnabled(userData, preferences);
  }
  return true;
}

async function resolveAdminNotificationRecipients(params: {
  targetType: AdminNotificationTarget;
  category: AdminNotificationCategory;
  specificUser?: string;
}): Promise<string[]> {
  const { targetType, category } = params;
  assertAdminNotificationSelection(targetType, category);

  if (targetType === "specific") {
    const input = String(params.specificUser || "").trim();
    if (!input) {
      throw new HttpsError(
        "invalid-argument",
        "사용자 UID 또는 이메일을 입력해 주세요."
      );
    }

    let uid = input;

    if (input.includes("@")) {
      try {
        uid = (await getAuth().getUserByEmail(input.toLowerCase())).uid;
      } catch {
        throw new HttpsError(
          "not-found",
          "해당 이메일의 사용자를 찾을 수 없습니다."
        );
      }
    } else {
      try {
        await getAuth().getUser(uid);
      } catch {
        throw new HttpsError(
          "not-found",
          "해당 사용자를 찾을 수 없습니다."
        );
      }
    }

    const userDoc = await db().doc(`users/${uid}`).get();
    if (!userDoc.exists) {
      throw new HttpsError(
        "not-found",
        "해당 사용자의 회원 정보를 찾을 수 없습니다."
      );
    }

    const userData = userDoc.data();
    const preferences = normalizeNotificationPreferences(
      userDoc.get("notificationPreferences")
    );

    if (!preferenceAllowsCategory(userData, preferences, category)) {
      if (isMarketingAdminCategory(category)) {
        throw new HttpsError(
          "failed-precondition",
          "해당 사용자는 광고성 정보 수신에 동의하지 않았거나 마케팅 알림을 해제하여 발송할 수 없습니다."
        );
      }
      throw new HttpsError(
        "failed-precondition",
        "해당 사용자는 현재 이 알림을 받을 수 없습니다."
      );
    }

    return [uid];
  }

  if (targetType === "reservationCustomers") {
    const exchangeSnapshot = await db()
      .collection("goldExchanges")
      .select("userId")
      .get();

    const candidateUids = [
      ...new Set(
        exchangeSnapshot.docs
          .map((document) => String(document.get("userId") || "").trim())
          .filter(Boolean)
      ),
    ];

    if (!candidateUids.length) return [];

    const recipientUids: string[] = [];

    for (let start = 0; start < candidateUids.length; start += 200) {
      const chunk = candidateUids.slice(start, start + 200);
      const userDocs = await db().getAll(
        ...chunk.map((uid) => db().doc(`users/${uid}`))
      );

      userDocs.forEach((userDoc) => {
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const preferences = normalizeNotificationPreferences(
          userDoc.get("notificationPreferences")
        );

        if (preferenceAllowsCategory(userData, preferences, category)) {
          recipientUids.push(userDoc.id);
        }
      });
    }

    return recipientUids;
  }

  const [usersSnapshot, vaultActivity] = await Promise.all([
    db().collection("users").get(),
    targetType === "myGoldEmpty" || targetType === "myGoldActive"
      ? loadGoldVaultActivity()
      : Promise.resolve(null),
  ]);
  const recipients: string[] = [];

  usersSnapshot.docs.forEach((document) => {
    const userData = document.data();
    const preferences = normalizeNotificationPreferences(
      document.get("notificationPreferences")
    );

    if (!preferenceAllowsCategory(userData, preferences, category)) return;

    if (
      (targetType === "goldNews" || isMyGoldCampaignTarget(targetType)) &&
      !marketingPushEnabled(userData, preferences)
    ) {
      return;
    }

    if (targetType === "myGoldEmpty" && vaultActivity?.activeUids.has(document.id)) {
      return;
    }
    if (targetType === "myGoldActive" && !vaultActivity?.activeUids.has(document.id)) {
      return;
    }
    if (targetType === "bonusGoldHolders" && adminBonusGoldGrams(userData) <= 0) {
      return;
    }

    recipients.push(document.id);
  });

  return recipients;
}

export const previewAdminNotificationRecipients = onCall<{
  targetType: AdminNotificationTarget;
  category: AdminNotificationCategory;
  specificUser?: string;
}>(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);

    const targetType = String(
      req.data?.targetType || ""
    ) as AdminNotificationTarget;
    const category = String(
      req.data?.category || ""
    ) as AdminNotificationCategory;
    assertAdminNotificationSelection(targetType, category);

    const recipients = await resolveAdminNotificationRecipients({
      targetType,
      category,
      specificUser: req.data?.specificUser,
    });

    return {
      ok: true,
      recipientCount: recipients.length,
    };
  }
);

export const sendAdminNotification = onCall<{
  targetType: AdminNotificationTarget;
  category: AdminNotificationCategory;
  specificUser?: string;
  title: string;
  body: string;
  link?: string;
}>(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);

    const actorUid = req.auth?.uid || "system";
    const targetType = String(
      req.data?.targetType || ""
    ) as AdminNotificationTarget;
    const category = String(
      req.data?.category || ""
    ) as AdminNotificationCategory;

    assertAdminNotificationSelection(targetType, category);

    const title = normalizeRequiredString(
      req.data?.title,
      "알림 제목",
      80,
      1
    );
    const body = normalizeRequiredString(
      req.data?.body,
      "알림 내용",
      300,
      1
    );
    const link = normalizeInternalNotificationLink(req.data?.link || "/");

    const recipients = await resolveAdminNotificationRecipients({
      targetType,
      category,
      specificUser: req.data?.specificUser,
    });

    if (recipients.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        isMarketingAdminCategory(category) || isMyGoldCampaignTarget(targetType)
          ? "광고성 정보 수신동의 기준으로 발송 가능한 사용자가 없습니다."
          : "현재 설정 기준으로 발송 가능한 사용자가 없습니다."
      );
    }

    if (recipients.length > 10_000) {
      throw new HttpsError(
        "resource-exhausted",
        "한 번에 발송 가능한 대상은 최대 10,000명입니다."
      );
    }

    const sendRef = db().collection("adminNotificationSends").doc();
    const batchId = sendRef.id;
    const type = manualNotificationType(category);

    await sendRef.set({
      batchId,
      targetType,
      category,
      title,
      body,
      link,
      recipientCount: recipients.length,
      createdCount: 0,
      actorUid,
      createdAt: FieldValue.serverTimestamp(),
      status: "creating",
    });

    let createdCount = 0;
    const chunkSize = 400;

    try {
      for (let start = 0; start < recipients.length; start += chunkSize) {
        const chunk = recipients.slice(start, start + chunkSize);
        const batch = db().batch();

        chunk.forEach((uid) => {
          const notificationRef = db()
            .collection("notifications")
            .doc(uid)
            .collection("items")
            .doc(`${batchId}_${uid}`);

          batch.set(notificationRef, {
            type,
            title,
            body,
            link,
            category,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            meta: {
              source: "admin_manual",
              batchId,
              actorUid,
            },
          });
        });

        await batch.commit();
        createdCount += chunk.length;

        await sendRef.set(
          {
            createdCount,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await sendRef.set(
        {
          createdCount,
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await db().collection("adminAuditLogs").add({
        action: "manual_notification_sent",
        actorUid,
        batchId,
        targetType,
        category,
        recipientCount: recipients.length,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        batchId,
        recipientCount: recipients.length,
        createdCount,
      };
    } catch (error) {
      await sendRef.set(
        {
          createdCount,
          status: "failed",
          failedAt: FieldValue.serverTimestamp(),
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 300)
              : "unknown",
        },
        { merge: true }
      );

      throw error;
    }
  }
);

export const listAdminNotificationSends = onCall<{ limit?: number }>(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);

    const limit = Math.max(
      1,
      Math.min(Math.trunc(Number(req.data?.limit) || 20), 50)
    );

    const snapshot = await db()
      .collection("adminNotificationSends")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return {
      ok: true,
      items: snapshot.docs.map((document) => {
        const data = document.data() || {};
        return {
          id: document.id,
          targetType: data.targetType || "",
          category: data.category || "",
          title: data.title || "",
          body: data.body || "",
          link: data.link || "/",
          recipientCount: Number(data.recipientCount || 0),
          createdCount: Number(data.createdCount || 0),
          status: data.status || "",
          createdAt:
            data.createdAt?.toDate?.()?.toISOString?.() || null,
        };
      }),
    };
  }
);


/* ─────────────────────────────────────────────────────────────
 * 7) 관리자 금교환 전날 예약 요약 알림
 * - 매일 17:00 (Asia/Seoul)
 * - 내일 scheduled 예약이 있을 때만 관리자에게 1회 요약 발송
 * - 날짜별 고정 알림 ID로 재실행/재시도 시 중복 푸시 방지
 * ───────────────────────────────────────────────────────────── */
export const sendAdminExchangeDayBeforeSummary = onSchedule(
  {
    schedule: "0 17 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    retryCount: 2,
  },
  async () => {
    const tomorrow = addDaysToDateKey(koreaDateKey(), 1);
    const groupsSnapshot = await db()
      .collection("goldExchangeGroups")
      .where("visitDate", "==", tomorrow)
      .get();

    const scheduledGroups = groupsSnapshot.docs
      .map((document) => {
        const data = document.data() || {};
        return {
          id: document.id,
          repStatus: String(data.repStatus || "requested"),
          visitTime: String(data.visitTime || ""),
        };
      })
      .filter((group) => group.repStatus === "scheduled")
      .sort((a, b) => a.visitTime.localeCompare(b.visitTime));

    if (scheduledGroups.length === 0) {
      console.log(
        `[sendAdminExchangeDayBeforeSummary] visitDate=${tomorrow} scheduled=0`
      );
      return;
    }

    const count = scheduledGroups.length;
    const notificationId = `admin-exchange-day-before-${tomorrow}`;
    const recipientCount = await addUniqueNotificationForAdmins(notificationId, {
      type: "admin_exchange_day_before_summary",
      title: `내일 금교환 예약 ${count}건`,
      body: `내일 방문 예정 금교환 예약이 ${count}건 있습니다.`,
      link: "/admin/gold-exchange",
      meta: {
        visitDate: tomorrow,
        reservationCount: count,
        reminderType: "admin_day_before_summary",
      },
    });

    console.log(
      `[sendAdminExchangeDayBeforeSummary] visitDate=${tomorrow} scheduled=${count} admins=${recipientCount}`
    );
  }
);

/* ─────────────────────────────────────────────────────────────
 * 8) 예약자 금교환 방문 전날 자동 알림
 * - 정상적으로는 매일 18:00에 발송
 * - 18~23시 정각 재확인으로 일시적 실패 시 다음 시간대에 재시도
 * - scheduled 상태만 발송
 * - 같은 그룹/같은 방문일은 한 번만 생성
 * ───────────────────────────────────────────────────────────── */
export const sendExchangeVisitDayBeforeReminders = onSchedule(
  { schedule: "0 18-23 * * *", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const tomorrow = addDaysToDateKey(koreaDateKey(), 1);
    const groupsSnapshot = await db()
      .collection("goldExchangeGroups")
      .where("visitDate", "==", tomorrow)
      .get();

    let createdCount = 0;

    for (const groupDocument of groupsSnapshot.docs) {
      const groupId = groupDocument.id;
      const groupRef = groupDocument.ref;

      const created = await db().runTransaction(async (tx) => {
        const freshGroup = await tx.get(groupRef);
        if (!freshGroup.exists) return false;

        const data = freshGroup.data() || {};
        const visitDate = String(data.visitDate || "");
        const visitTime = String(data.visitTime || "");
        const status = String(data.repStatus || "requested");
        const uid = String(data.ownerUid || "");
        const alreadySentFor = String(data.dayBeforeReminderSentFor || "");

        if (visitDate !== tomorrow || status !== "scheduled" || !uid || !visitTime) {
          return false;
        }
        if (alreadySentFor === tomorrow) return false;

        const notificationId = `exchange-day-before-${groupId}-${tomorrow}`;
        const notificationRef = db().doc(`notifications/${uid}/items/${notificationId}`);
        const notificationSnapshot = await tx.get(notificationRef);
        const now = FieldValue.serverTimestamp();

        if (!notificationSnapshot.exists) {
          tx.set(notificationRef, {
            type: "exchange_visit_reminder",
            title: "내일 금교환 예약 안내",
            body: `내일 ${visitTime} 원일귀금속 방문 예약이 예정되어 있습니다.`,
            link: "/my-exchanges",
            meta: {
              groupId,
              visitDate,
              visitTime,
              reminderType: "day_before",
            },
            createdAt: now,
            read: false,
          });
        }

        tx.set(
          groupRef,
          {
            dayBeforeReminderSentFor: tomorrow,
            dayBeforeReminderSentAt: now,
          },
          { merge: true }
        );

        return !notificationSnapshot.exists;
      });

      if (created) createdCount += 1;
    }

    console.log(
      `[sendExchangeVisitDayBeforeReminders] visitDate=${tomorrow} created=${createdCount}`
    );
  }
);

/* ─────────────────────────────────────────────────────────────
 * 9) MY GOLD 주간 리포트
 * - 매주 월요일 오전 10시
 * - MY GOLD(등록 실물 금 또는 적립 순금)가 있는 회원만 대상
 * - 광고성 정보 수신동의 + 마케팅 알림 ON 회원에게만 생성
 * - 등록 실물 금은 현재 goldRates의 교환 적용률로 예상 인정 순금을 계산
 * - 7일 전 공개 시세와 비교해 개인 MY GOLD 가치 변화를 안내
 * - 날짜별 고정 알림 ID로 중복 발송 방지
 * ───────────────────────────────────────────────────────────── */
function readBonusGoldGramsForWeeklyReport(
  userData: FirebaseFirestore.DocumentData | undefined
): number {
  const milliGrams = Number(userData?.bonusGoldMilliGrams);
  if (Number.isFinite(milliGrams) && milliGrams >= 0) {
    return milliGrams / 1000;
  }

  const grams = Number(userData?.bonusGoldG);
  return Number.isFinite(grams) && grams > 0 ? grams : 0;
}

function weeklyGoldValueWon(pureGoldG: number, pureGoldBuyPerDon: number): number {
  if (
    !Number.isFinite(pureGoldG) ||
    pureGoldG <= 0 ||
    !Number.isFinite(pureGoldBuyPerDon) ||
    pureGoldBuyPerDon <= 0
  ) {
    return 0;
  }
  return Math.round((pureGoldG / DON_TO_GRAMS) * pureGoldBuyPerDon);
}

function formatWeeklyWon(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded.toLocaleString("ko-KR")}원`;
}

function formatWeeklySignedWon(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  if (rounded === 0) return "0원";
  return `${rounded > 0 ? "+" : "-"}${Math.abs(rounded).toLocaleString("ko-KR")}원`;
}

async function loadWeeklyGoldReferencePrice(targetDateKey: string): Promise<number> {
  const compact = targetDateKey.replace(/-/g, "");
  const history = db().collection("goldPriceHistory");
  const exact = await history.doc(compact).get();
  if (exact.exists) {
    const exactPrice = Number(exact.get("market.pureGoldBuyPerDon")) || 0;
    if (exactPrice > 0) return exactPrice;
  }

  const fallback = await history
    .where("sourceDate", "<=", compact)
    .orderBy("sourceDate", "desc")
    .limit(1)
    .get();
  const fallbackDoc = fallback.docs[0];
  return fallbackDoc
    ? Number(fallbackDoc.get("market.pureGoldBuyPerDon")) || 0
    : 0;
}

export const sendMyGoldWeeklyReports = onSchedule(
  {
    schedule: "0 10 * * 1",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 300,
    retryCount: 1,
  },
  async () => {
    const today = koreaDateKey();
    const referenceDate = addDaysToDateKey(today, -7);

    const [publicConfigSnap, currentPriceSnap, ratesSnap, vaultSnapshot, usersSnapshot] =
      await Promise.all([
        db().doc("goldPricePublic/config").get(),
        db().doc("goldPrices/current").get(),
        db().doc("appConfig/goldRates").get(),
        db().collectionGroup("goldVaultItems").get(),
        db().collection("users").get(),
      ]);

    if (!publicConfigSnap.exists || publicConfigSnap.get("enabled") !== true) {
      console.log(`[sendMyGoldWeeklyReports] date=${today} skipped=public-price-disabled`);
      return;
    }

    const currentPrice = Number(currentPriceSnap.get("market.pureGoldBuyPerDon")) || 0;
    if (currentPrice <= 0) {
      console.log(`[sendMyGoldWeeklyReports] date=${today} skipped=current-price-missing`);
      return;
    }

    const historicalPrice = await loadWeeklyGoldReferencePrice(referenceDate);
    const ratesData = ratesSnap.exists ? ratesSnap.data() || {} : {};
    const purity = {
      ...DEFAULT_PURITY,
      ...(ratesData.purity && typeof ratesData.purity === "object" ? ratesData.purity : {}),
    } as Record<string, number>;
    const exchange = {
      ...DEFAULT_EXCHANGE,
      ...(ratesData.exchange && typeof ratesData.exchange === "object" ? ratesData.exchange : {}),
    } as Record<string, number>;

    const vaultByUid = new Map<string, { itemCount: number; pureGoldG: number }>();
    vaultSnapshot.docs.forEach((document) => {
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

      const current = vaultByUid.get(uid) || { itemCount: 0, pureGoldG: 0 };
      current.itemCount += 1;
      current.pureGoldG = roundTo3(current.pureGoldG + recognizedG);
      vaultByUid.set(uid, current);
    });

    let createdCount = 0;
    let eligibleCount = 0;

    for (const userDocument of usersSnapshot.docs) {
      const uid = userDocument.id;
      const userData = userDocument.data() || {};
      const preferences = normalizeNotificationPreferences(
        userDocument.get("notificationPreferences")
      );

      if (!marketingPushEnabled(userData, preferences)) continue;

      const vault = vaultByUid.get(uid) || { itemCount: 0, pureGoldG: 0 };
      const bonusGoldG = readBonusGoldGramsForWeeklyReport(userData);
      const totalPureGoldG = roundTo3(vault.pureGoldG + bonusGoldG);
      if (totalPureGoldG <= 0) continue;

      eligibleCount += 1;
      const currentValueWon = weeklyGoldValueWon(totalPureGoldG, currentPrice);
      const historicalValueWon = historicalPrice > 0
        ? weeklyGoldValueWon(totalPureGoldG, historicalPrice)
        : 0;
      const changeWon = historicalValueWon > 0
        ? currentValueWon - historicalValueWon
        : 0;
      const changePercent = historicalValueWon > 0
        ? (changeWon / historicalValueWon) * 100
        : null;

      const parts = [
        `현재 참고가치 ${formatWeeklyWon(currentValueWon)}`,
      ];
      if (changePercent !== null && Number.isFinite(changePercent)) {
        parts.push(
          `7일 전보다 ${formatWeeklySignedWon(changeWon)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`
        );
      }
      if (vault.itemCount > 0) {
        parts.push(`실물 금 ${vault.itemCount}개 · 교환기준 예상 ${vault.pureGoldG.toFixed(2)}g`);
      }
      if (bonusGoldG > 0) {
        parts.push(`적립 순금 ${bonusGoldG.toFixed(2)}g`);
      }

      const notificationId = `my-gold-weekly-${today}`;
      const notificationRef = db().doc(`notifications/${uid}/items/${notificationId}`);
      const existing = await notificationRef.get();
      if (existing.exists) continue;

      await notificationRef.set({
        type: "my_gold_weekly",
        title: "이번 주 MY GOLD",
        body: parts.join(" · "),
        link: "/my-gold",
        meta: {
          reportDate: today,
          referenceDate,
          currentValueWon,
          historicalValueWon,
          changeWon,
          changePercent,
          registeredItemCount: vault.itemCount,
          registeredPureGoldG: vault.pureGoldG,
          bonusGoldG,
          totalPureGoldG,
        },
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      });
      createdCount += 1;
    }

    console.log(
      `[sendMyGoldWeeklyReports] date=${today} eligible=${eligibleCount} created=${createdCount} historicalPrice=${historicalPrice}`
    );
  }
);

/* ─────────────────────────────────────────────────────────────
 * 8) 예약 슬롯 청소 (스케줄러)
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
    const data = snap.exists
      ? ((snap.data() || {}) as Record<string, unknown>)
      : {};

    const updates: FirebaseFirestore.DocumentData = {};
    Object.keys(data).forEach((dateKey) => {
      if (dateKey < today)
        (updates as Record<string, FirebaseFirestore.FieldValue>)[dateKey] = FieldValue.delete();
    });
    if (Object.keys(updates).length) {
      await ref.set(updates, { merge: true });
    }

    // 예약 가능일 설정도 지난 날짜를 정리해 문서가 계속 커지지 않게 합니다.
    const availabilityRef = db().doc(BOOKING_AVAILABILITY_REF);
    const availabilitySnap = await availabilityRef.get();
    if (availabilitySnap.exists) {
      const availabilityData = availabilitySnap.data() || {};
      const rawDates = availabilityData.dates && typeof availabilityData.dates === "object" && !Array.isArray(availabilityData.dates)
        ? (availabilityData.dates as Record<string, unknown>)
        : {};
      const nextDates = Object.fromEntries(
        Object.entries(rawDates).filter(([dateKey]) => dateKey >= today)
      );
      if (Object.keys(nextDates).length !== Object.keys(rawDates).length) {
        await availabilityRef.set({
          dates: nextDates,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "system-cleanup",
        }, { merge: true });
      }
    }
  }
);

