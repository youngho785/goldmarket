// src/utils/idle.js
export function requestIdle(cb) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(cb);
  }
  // 폴리필
  return setTimeout(() => cb({ timeRemaining: () => 1, didTimeout: false }), 1);
}

export function cancelIdle(id) {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    return window.cancelIdleCallback(id);
  }
  clearTimeout(id);
}
