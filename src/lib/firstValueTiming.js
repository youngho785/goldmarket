// 30초 첫 가치 확인 목표 측정용. 첫 계산기 표시 시점부터 경과 구간만 기록합니다.
// 정확한 무게·금액, 회원 식별자, URL은 Analytics로 보내지 않습니다.
const START_KEY = "kgm.first-value.startedAt";

export function markFirstValueStart(now = Date.now(), storage) {
  try {
    const store = storage ?? globalThis.sessionStorage;
    if (!store.getItem(START_KEY)) store.setItem(START_KEY, String(now));
  } catch { /* 사용자 저장소가 금지된 경우에도 계산기는 정상 작동합니다. */ }
}

export function getFirstValueElapsedBucket(now = Date.now(), storage) {
  try {
    const store = storage ?? globalThis.sessionStorage;
    const started = Number(store.getItem(START_KEY));
    if (!started || !Number.isFinite(started) || now < started) return null;
    const seconds = (now - started) / 1000;
    if (seconds <= 10) return "under_10s";
    if (seconds <= 20) return "10_20s";
    if (seconds <= 30) return "20_30s";
    return "over_30s";
  } catch { return null; }
}
