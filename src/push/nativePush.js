// src/push/nativePush.js

import { PushNotifications } from "@capacitor/push-notifications";
import { isAndroid } from "@/platform/runtime";
import { saveNativeFcmTokenForUser } from "@/firebase/firebase";

let listenersInitialized = false;
let listenersPromise = null;
let currentUid = "";
let lastNativeToken = "";

const tokenWaiters = new Set();

function resolveTokenWaiters(token) {
  for (const waiter of tokenWaiters) {
    try {
      waiter.resolve(token);
    } catch {}

    clearTimeout(waiter.timer);
  }

  tokenWaiters.clear();
}

function waitForNativeToken(timeoutMs = 10000) {
  if (lastNativeToken) {
    return Promise.resolve(lastNativeToken);
  }

  return new Promise((resolve) => {
    const waiter = {
      resolve,
      timer: null,
    };

    waiter.timer = setTimeout(() => {
      tokenWaiters.delete(waiter);
      resolve("");
    }, timeoutMs);

    tokenWaiters.add(waiter);
  });
}

/**
 * Android에서 발급받은 FCM 토큰을
 * 현재 회원의 users/{uid} 문서에 저장합니다.
 *
 * - fcmTokens[]:
 *   예약·교환 등 실제 푸시 발송 대상
 *
 * - nativeFcmTokens[]:
 *   서버가 Android Native 토큰을 Web Push 토큰과
 *   구분하기 위한 보조 목록
 *
 * 로그아웃하더라도 이 연결은 자동 삭제하지 않습니다.
 */
async function saveNativeToken(uid, token) {
  const targetUid = String(uid || "").trim();
  const normalizedToken = String(token || "").trim();

  if (!targetUid || !normalizedToken) {
    return null;
  }

  const savedToken = await saveNativeFcmTokenForUser(
    targetUid,
    normalizedToken
  );

  if (!savedToken) {
    console.warn(
      "[Native Push] FCM 토큰을 Firestore에 저장하지 못했습니다."
    );
    return null;
  }

  /*
   * 웹 FCM 토큰과 섞이지 않도록
   * Android Native 전용 localStorage 키를 사용합니다.
   *
   * 로그아웃할 때는 이 값을 지우지 않습니다.
   */
  try {
    localStorage.setItem("nativeFcmToken", savedToken);
    localStorage.setItem("nativeFcmTokenUid", targetUid);
    localStorage.setItem(
      "nativeFcmTokenRegisteredAt",
      new Date().toISOString()
    );
  } catch (error) {
    console.warn(
      "[Native Push] 로컬 토큰 정보 저장 실패:",
      error?.message || error
    );
  }

  console.log("[Native Push] FCM token saved.");

  return savedToken;
}

/**
 * Capacitor Native Push 이벤트 리스너를
 * 앱 실행 중 한 번만 등록합니다.
 */
async function ensureNativePushListeners() {
  if (!isAndroid || listenersInitialized) {
    return;
  }

  if (listenersPromise) {
    return listenersPromise;
  }

  listenersPromise = (async () => {
    /*
     * Android FCM 등록 성공
     */
    await PushNotifications.addListener(
      "registration",
      async (token) => {
        const tokenValue = String(token?.value || "").trim();

        if (!tokenValue) {
          console.warn(
            "[Native Push] registration 이벤트에서 토큰을 받지 못했습니다."
          );
          return;
        }

        lastNativeToken = tokenValue;

        console.log(
          "[Native Push] FCM token:",
          tokenValue
        );

        /*
         * 로그인 회원 UID를 알고 있으면
         * 즉시 Firestore에 연결합니다.
         *
         * 로그아웃 후에도 currentUid를 강제로 비우지 않으므로,
         * 기존 사용자가 신청한 금교환 진행 알림과
         * 동의한 금시세·혜택 알림 연결을 유지할 수 있습니다.
         */
        if (currentUid) {
          try {
            const savedToken = await saveNativeToken(
              currentUid,
              tokenValue
            );

            if (!savedToken) {
              console.warn(
                "[Native Push] registration 토큰의 회원 연결을 완료하지 못했습니다."
              );
              return;
            }
          } catch (error) {
            console.error(
              "[Native Push] FCM token 저장 오류:",
              error
            );
            return;
          }
        }

        resolveTokenWaiters(tokenValue);
      }
    );

    /*
     * Android FCM 등록 실패
     */
    await PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error(
          "[Native Push] registration error:",
          error
        );

        resolveTokenWaiters("");
      }
    );

    /*
     * 앱이 열려 있는 상태에서 Push 수신
     */
    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log(
          "[Native Push] notification received:",
          notification
        );
      }
    );

    /*
     * 사용자가 시스템 알림을 눌렀을 때
     */
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log(
          "[Native Push] notification tapped:",
          action
        );
      }
    );

    listenersInitialized = true;
  })();

  try {
    await listenersPromise;
  } catch (error) {
    listenersInitialized = false;

    console.error(
      "[Native Push] listener initialization error:",
      error
    );

    throw error;
  } finally {
    listenersPromise = null;
  }
}

/**
 * Native Push 초기화
 *
 * 중요:
 * 이 함수에서는 알림 권한창을 자동으로 띄우지 않습니다.
 *
 * 이미 권한을 허용한 사용자라면
 * Android FCM 등록만 자동 복구합니다.
 */
export async function initializeNativePush(uid) {
  if (!isAndroid) {
    return {
      supported: false,
      permission: "unsupported",
    };
  }

  const targetUid = String(uid || "").trim();

  if (targetUid) {
    currentUid = targetUid;
  }

  await ensureNativePushListeners();

  /*
   * 이전에 저장해 둔 Native 토큰이 있으면
   * 현재 로그인 회원과 먼저 다시 연결합니다.
   *
   * arrayUnion()이므로 같은 토큰은 중복 저장되지 않습니다.
   */
  const cachedToken = getCurrentNativeFcmToken();

  if (currentUid && cachedToken) {
    try {
      await saveNativeToken(
        currentUid,
        cachedToken
      );
    } catch (error) {
      console.warn(
        "[Native Push] 저장된 토큰 재연결 실패:",
        error?.message || error
      );
    }
  }

  let permission;

  try {
    permission =
      await PushNotifications.checkPermissions();
  } catch (error) {
    console.error(
      "[Native Push] permission check error:",
      error
    );

    return {
      supported: true,
      permission: "unknown",
    };
  }

  /*
   * 이미 권한을 허용한 사용자만 자동 등록합니다.
   *
   * prompt 상태에서는 여기서 권한창을 띄우지 않습니다.
   */
  if (permission.receive === "granted") {
    try {
      await PushNotifications.register();
    } catch (error) {
      console.error(
        "[Native Push] register error:",
        error
      );
    }
  }

  return {
    supported: true,
    permission: permission.receive,
    token: getCurrentNativeFcmToken() || null,
  };
}

/**
 * 사용자가 "알림 허용하기" 등을 직접 눌렀을 때 호출합니다.
 *
 * 이 함수에서만 Android 알림 권한창을 띄웁니다.
 */
export async function requestNativePushPermission(uid) {
  if (!isAndroid) {
    return {
      supported: false,
      permission: "unsupported",
      token: null,
    };
  }

  const targetUid = String(uid || "").trim();

  if (targetUid) {
    currentUid = targetUid;
  }

  await ensureNativePushListeners();

  let permission =
    await PushNotifications.checkPermissions();

  if (permission.receive === "prompt") {
    permission =
      await PushNotifications.requestPermissions();
  }

  if (permission.receive !== "granted") {
    console.log(
      "[Native Push] notification permission denied:",
      permission.receive
    );

    return {
      supported: true,
      permission: permission.receive,
      token: null,
    };
  }

  /*
   * 이미 캐시된 토큰이 있으면 현재 회원 문서에 먼저 연결합니다.
   *
   * 그래도 아래에서 register()를 다시 호출해
   * Android가 현재 사용하는 토큰을 다시 확인합니다.
   */
  const cachedToken = getCurrentNativeFcmToken();
  let usableToken = "";

  if (currentUid && cachedToken) {
    const savedToken = await saveNativeToken(
      currentUid,
      cachedToken
    );

    if (savedToken) {
      usableToken = savedToken;
    }
  }

  /*
   * register() 성공 후 registration 이벤트에서
   * Android FCM 토큰을 받습니다.
   *
   * Settings 화면에서 바로 토큰이 필요할 수 있으므로
   * registration 이벤트를 최대 10초 기다립니다.
   */
  const tokenPromise = waitForNativeToken(10000);

  try {
    await PushNotifications.register();
  } catch (error) {
    console.error(
      "[Native Push] register error:",
      error
    );

    resolveTokenWaiters("");

    return {
      supported: true,
      permission: "granted",
      token: null,
    };
  }

  const token = await tokenPromise;

  return {
    supported: true,
    permission: "granted",
    token: token || usableToken || null,
  };
}

/**
 * 현재 Android Native Push 권한 상태 확인
 */
export async function getNativePushPermission() {
  if (!isAndroid) {
    return "unsupported";
  }

  try {
    const permission =
      await PushNotifications.checkPermissions();

    return permission.receive;
  } catch {
    return "unknown";
  }
}

/**
 * 현재 앱에서 마지막으로 받은 Android FCM 토큰
 *
 * 로그아웃해도 토큰은 유지합니다.
 */
export function getCurrentNativeFcmToken() {
  if (lastNativeToken) {
    return lastNativeToken;
  }

  try {
    return localStorage.getItem("nativeFcmToken") || "";
  } catch {
    return "";
  }
}