// Entry from the Android bottom tab opens the useful calculation form first.
// Explicit routes, rebooking and drafts are handled by GoldExchange itself.
const MODES = new Set(["manual", "vault", "visit"]);

export function resolveGoldExchangeEntryMode({
  requestedEntryMode = "",
  importedFromMyGold = false,
  nativeAndroid = false,
} = {}) {
  if (MODES.has(requestedEntryMode)) return requestedEntryMode;
  if (importedFromMyGold) return "vault";
  return nativeAndroid ? "manual" : "";
}
