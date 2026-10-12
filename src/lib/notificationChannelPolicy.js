// Pure, side-effect-free notification channel policy shared by web and Android.
// Server-side counterpart: functions/src/notifications/shared.ts.
export function getNextMarketingPreferences(current = {}, enabled = false) {
  const existing = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  const optedIn = enabled === true;
  return {
    ...existing,
    // Marketing ON also repairs older allEnabled=false records.
    // Marketing OFF must NOT switch off explicitly configured MY GOLD goals.
    allEnabled: optedIn || existing.allEnabled !== false,
    exchange: true,
    goldNews: optedIn,
    benefits: optedIn,
  };
}

export function myGoldGoalServiceAllowed(userData = {}) {
  const raw = userData?.notificationPreferences;
  const prefs = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  if (prefs.myGoldGoalAlertsEnabled === true) return true;
  if (prefs.myGoldGoalAlertsEnabled === false) return false;
  // Legacy opt-out is kept until the member explicitly saves goal settings.
  return prefs.allEnabled !== false;
}
