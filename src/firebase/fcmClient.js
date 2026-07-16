// src/firebase/fcmClient.js
// FCM 등록/해제/포그라운드 수신 얇은 래퍼.
// firebase.js를 동적 import해서 순환 의존/번들 타이밍 이슈를 피합니다.

export async function ensureFcmRegistration(uid) {
  const mod = await import("./firebase.js");
  if (typeof mod.registerForPush === "function") {
    return mod.registerForPush(uid);
  }
  return null;
}

export async function unregisterFcm(uid) {
  const mod = await import("./firebase.js");
  if (typeof mod.unregisterPush === "function") {
    return mod.unregisterPush(uid);
  }
  return null;
}

/**
 * 포그라운드 수신 핸들러 등록
 * 콜백에는 FCM payload 원본을 그대로 넘깁니다.
 */
export async function onForegroundPush(cb) {
  const mod = await import("./firebase.js");
  if (typeof mod.onPushMessage === "function") {
    return mod.onPushMessage(cb);
  }
  return () => {};
}
