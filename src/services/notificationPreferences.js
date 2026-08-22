// src/services/notificationPreferences.js
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

// 기존 필드는 다른 코드/기존 회원 데이터와의 호환을 위해 유지합니다.
// 실제 광고성 알림 발송의 최종 기준은 users/{uid}.consents.marketing.accepted 입니다.
//
// fcmTokens:
//   예약·교환 등 서비스 푸시를 받을 수 있는 브라우저/기기 토큰 목록
//
// marketingFcmToken:
//   금시세·주요 소식·이벤트·혜택을 받을 대표 브라우저 토큰 1개
export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  allEnabled: true,
  exchange: true,
  goldNews: true,
  benefits: false,
  marketingAccepted: false,
  marketingNotificationsEnabled: false,
  marketingFcmToken: "",
  marketingFcmBrowser: "",
  marketingPushConfigured: false,
});

function normalizePreferences(raw) {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  return {
    allEnabled: source.allEnabled !== false,
    exchange: source.exchange !== false,
    goldNews: source.goldNews !== false,
    benefits: source.benefits === true,
  };
}

function readMarketingAccepted(data) {
  return data?.consents?.marketing?.accepted === true;
}

function hasOwnMarketingTarget(data) {
  return !!data &&
    typeof data === "object" &&
    Object.prototype.hasOwnProperty.call(data, "marketingFcmToken");
}

function readMarketingToken(data) {
  return typeof data?.marketingFcmToken === "string"
    ? data.marketingFcmToken.trim()
    : "";
}

function readMarketingBrowser(data) {
  return typeof data?.marketingFcmBrowser === "string"
    ? data.marketingFcmBrowser.trim()
    : "";
}

function withMarketingState(preferences, marketingAccepted, data = {}) {
  const marketingNotificationsEnabled =
    marketingAccepted === true &&
    preferences.allEnabled !== false &&
    preferences.goldNews !== false;

  return {
    ...preferences,
    marketingAccepted: marketingAccepted === true,
    marketingNotificationsEnabled,
    marketingFcmToken: readMarketingToken(data),
    marketingFcmBrowser: readMarketingBrowser(data),
    marketingPushConfigured: hasOwnMarketingTarget(data),
  };
}

export async function getNotificationPreferences(uid) {
  if (!uid) throw new Error("uid is required");

  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.exists() ? snap.data() || {} : {};
  const preferences = normalizePreferences(data.notificationPreferences);

  return withMarketingState(
    preferences,
    readMarketingAccepted(data),
    data
  );
}

// 레거시/내부 코드 호환용 저장 함수입니다.
// 이 함수만 호출해서는 광고성 정보 수신동의가 생기지 않습니다.
export async function saveNotificationPreferences(uid, preferences) {
  if (!uid) throw new Error("uid is required");

  const normalized = normalizePreferences(preferences);

  await setDoc(
    doc(db, "users", uid),
    {
      notificationPreferences: normalized,
      notificationPreferencesUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.exists() ? snap.data() || {} : {};

  return withMarketingState(
    normalized,
    readMarketingAccepted(data),
    data
  );
}

// 계정 단위의 광고성 정보 수신동의를 저장합니다.
//
// 중요:
// - accepted=true 자체는 "어느 브라우저로 보낼지"를 정하지 않습니다.
// - 대표 브라우저는 saveMarketingPushTarget()에서 별도로 정합니다.
// - OFF로 변경하면 대표 마케팅 푸시 토큰을 비웁니다.
// - false -> true로 처음 켤 때도 대표 토큰을 null로 명시해
//   과거의 다른 브라우저 토큰이 의도치 않게 선택되지 않도록 합니다.
export async function saveMarketingNotificationConsent(uid, accepted) {
  if (!uid) throw new Error("uid is required");

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() || {} : {};

  const currentAccepted = readMarketingAccepted(data);
  const current = normalizePreferences(data.notificationPreferences);
  const nextAccepted = accepted === true;

  const nextPreferences = {
    ...current,
    // 예약·교환 안내는 마케팅 선택과 분리합니다.
    exchange: true,
    // 새 UI에서는 금시세·주요 소식·이벤트·혜택을 하나의 선택 동의로 관리합니다.
    allEnabled: nextAccepted,
    goldNews: nextAccepted,
    benefits: nextAccepted,
  };

  const payload = {
    notificationPreferences: nextPreferences,
    notificationPreferencesUpdatedAt: serverTimestamp(),
  };

  // 실제 동의 상태가 바뀔 때만 법적 동의 시각을 갱신합니다.
  if (currentAccepted !== nextAccepted) {
    payload.consents = {
      marketing: {
        accepted: nextAccepted,
        at: serverTimestamp(),
      },
    };
  }

  /*
   * OFF 또는 최초 OFF -> ON 전환에서는 대표 마케팅 토큰을 비웁니다.
   * 그 다음 현재 브라우저의 FCM 등록이 성공하면
   * saveMarketingPushTarget()이 대표 토큰 1개를 지정합니다.
   *
   * 이미 ON인 사용자의 기존(레거시) 문서에는 marketingFcmToken 필드가
   * 없을 수 있습니다. 그 경우에는 여기서 임의로 필드를 만들지 않습니다.
   * 서버가 기존 회원 마이그레이션용으로 fcmTokens 중 1개만 선택해 보냅니다.
   */
  if (!nextAccepted || currentAccepted !== nextAccepted) {
    payload.marketingFcmToken = null;
    payload.marketingFcmBrowser = "";
    payload.marketingFcmTokenUpdatedAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });

  const nextSnap = await getDoc(ref);
  const nextData = nextSnap.exists() ? nextSnap.data() || {} : {};

  return withMarketingState(
    nextPreferences,
    nextAccepted,
    nextData
  );
}

// 현재 브라우저를 금시세·혜택 대표 수신 브라우저로 지정합니다.
// 한 계정에는 marketingFcmToken 1개만 저장되므로
// 다른 브라우저에서 이 함수를 다시 호출하면 대표 수신처가 그 브라우저로 변경됩니다.
export async function saveMarketingPushTarget(uid, token, browserName = "") {
  if (!uid) throw new Error("uid is required");

  const normalizedToken = String(token || "").trim();
  if (!normalizedToken || normalizedToken.length < 20) {
    throw new Error("유효한 FCM 토큰이 필요합니다.");
  }

  const normalizedBrowser = String(browserName || "현재 브라우저")
    .trim()
    .slice(0, 60) || "현재 브라우저";

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() || {} : {};
  const preferences = normalizePreferences(data.notificationPreferences);

  if (
    !readMarketingAccepted(data) ||
    preferences.allEnabled === false ||
    preferences.goldNews === false
  ) {
    throw new Error("금시세·혜택 알림 수신동의가 먼저 필요합니다.");
  }

  await setDoc(
    ref,
    {
      marketingFcmToken: normalizedToken,
      marketingFcmBrowser: normalizedBrowser,
      marketingFcmTokenUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    ...withMarketingState(preferences, true, {
      ...data,
      marketingFcmToken: normalizedToken,
      marketingFcmBrowser: normalizedBrowser,
    }),
    marketingFcmToken: normalizedToken,
    marketingFcmBrowser: normalizedBrowser,
    marketingPushConfigured: true,
  };
}
