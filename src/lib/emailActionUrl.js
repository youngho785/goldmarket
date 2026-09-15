// src/lib/emailActionUrl.js
// KGM_EMAIL_ACTION_URL_V1
//
// Firebase ActionCodeSettings.url은 "인증 링크 자체"가 아니라
// 인증 완료 뒤 돌아갈 state/continue URL입니다.
// Capacitor Native(Android/iOS)에서는 window.location.origin이
// https://localhost 형태가 될 수 있으므로 공개 웹 도메인을 사용합니다.

import { isNative } from "../platform/runtime";

export const KGM_PUBLIC_WEB_ORIGIN = "https://koreagoldmarket.com";
export const KGM_EMAIL_LINK_DOMAIN = "koreagoldmarket.com";
export const KGM_APP_RETURN_PARAM = "kgmAppReturn";

function currentWebOrigin() {
  if (
    typeof window === "undefined" ||
    !window.location ||
    !window.location.origin ||
    window.location.origin === "null"
  ) {
    return "";
  }

  return String(window.location.origin).replace(/\/+$/, "");
}

export function getEmailActionOrigin() {
  if (isNative) return KGM_PUBLIC_WEB_ORIGIN;

  const origin = currentWebOrigin();
  if (/^https?:\/\//i.test(origin)) return origin;

  return KGM_PUBLIC_WEB_ORIGIN;
}

export function buildEmailActionUrl(returnPath = "/") {
  const origin = getEmailActionOrigin();
  const raw = String(returnPath || "/").trim() || "/";

  try {
    // 외부 origin이 전달되더라도 pathname/search/hash만 사용해서
    // 현재 허용 origin(웹) 또는 canonical origin(네이티브)에 고정합니다.
    const parsed = new URL(raw, origin);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  } catch {
    return `${origin}/`;
  }
}

export const KGM_ANDROID_PACKAGE_NAME = "com.koreagoldmarket.app";

export function buildEmailActionSettings(returnPath = "/") {
  let actionUrl = buildEmailActionUrl(returnPath);

  // Android 앱에서 발송한 이메일 액션에는 앱 복귀 표식을 continueUrl에 남깁니다.
  // 커스텀 웹 인증페이지가 이 값을 보고 인증 완료 후 앱 복귀를 시도합니다.
  if (isNative) {
    try {
      const marked = new URL(actionUrl);
      marked.searchParams.set(KGM_APP_RETURN_PARAM, "1");
      actionUrl = marked.toString();
    } catch {}
  }

  const settings = {
    url: actionUrl,
    handleCodeInApp: true,
  };

  // Android 네이티브 앱에서 발송한 인증/비밀번호 재설정 메일은
  // Firebase Hosting App Link(/__/auth/links)로 생성되도록 패키지명을 전달합니다.
  // 웹에서 발송한 메일에는 android 설정을 넣지 않아 기존 웹 흐름을 유지합니다.
  if (isNative) {
    settings.android = {
      packageName: KGM_ANDROID_PACKAGE_NAME,
      installApp: false,
    };
    // 실제 Firebase Hosting 커스텀 도메인을 명시해 메일 링크가
    // https://koreagoldmarket.com/__/auth/links?... 형태의 Android App Link가 되게 합니다.
    settings.linkDomain = KGM_EMAIL_LINK_DOMAIN;
  }

  return settings;
}
