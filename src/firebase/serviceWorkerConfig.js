// src/firebase/serviceWorkerConfig.js

export const FIREBASE_SW_CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
  "measurementId",
  "databaseURL",
];

const REQUIRED_FIREBASE_SW_CONFIG_KEYS = [
  "apiKey",
  "projectId",
  "messagingSenderId",
  "appId",
];

export function createFirebaseServiceWorkerUrl(
  config,
  basePath = "/sw.js"
) {
  const params = new URLSearchParams();

  for (const key of FIREBASE_SW_CONFIG_KEYS) {
    const value = String(config?.[key] ?? "").trim();
    if (value) {
      params.set(key, value);
    }
  }

  const missing = REQUIRED_FIREBASE_SW_CONFIG_KEYS.filter(
    (key) => !params.get(key)
  );

  if (missing.length > 0) {
    throw new Error(
      `Firebase Service Worker 설정이 부족합니다: ${missing.join(", ")}`
    );
  }

  return `${basePath}?${params.toString()}`;
}
