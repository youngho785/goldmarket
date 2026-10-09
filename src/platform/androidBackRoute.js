// One native Back action must produce at most one React Router history movement.
// React Router stores a numeric `idx` in window.history.state for in-app navigation.
export const ANDROID_BACK_OVERLAY_EVENT = "kgm:android-back";

export function resolveAndroidBackAction(pathname, historyState) {
  const index = historyState?.idx;

  // Only a confirmed internal history entry may be popped. Capacitor's
  // `canGoBack` can also include WebView/external history unrelated to Router.
  if (Number.isInteger(index) && index > 0) return "previous";
  if (pathname && pathname !== "/") return "home";
  return "background";
}

export function closeAndroidBackOverlay(target = window) {
  const event = new Event(ANDROID_BACK_OVERLAY_EVENT, { cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}
