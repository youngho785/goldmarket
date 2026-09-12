// src/config/appDistribution.js
// ==================================
// Google Play 정식 앱 출시 전에는 반드시 false 상태를 유지하세요.
// 출시가 완료되면 아래 3개 값만 바꾸면 웹에서 공식 앱 권장 배너가 활성화됩니다.

export const ANDROID_APP_DISTRIBUTION = Object.freeze({
  packageName: "com.koreagoldmarket.app",

  // Google Play에 실제 공개된 뒤 true
  released: false,

  // 웹 방문자에게 공식 앱을 권장할 때 true
  promotionEnabled: false,

  // 예: https://play.google.com/store/apps/details?id=com.koreagoldmarket.app
  playStoreUrl: "",
});
