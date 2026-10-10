// Accept both public-data and administrator date formats; reject impossible dates.
export function normalizeGoldPriceDate(value) {
  if (typeof value !== "string") return "";
  const match = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(value.trim());
  if (!match) return "";
  const [, year, month, day] = match;
  const key = year + "-" + month + "-" + day;
  const date = new Date(key + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : "";
}
