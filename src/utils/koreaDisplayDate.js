/** Today for the visitor-facing screen, always in Korea local time. */
export function getKoreaTodayDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${byType.year}${byType.month}${byType.day}`;
}
