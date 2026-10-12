// MEMBER GOLD request expiry rule. All timestamps are interpreted in Korea Standard Time.
// Visit + 48 hours: allow staff two days to finish in-person verification.
const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;

export function bonusUsageExpiryMillis(visitDate: unknown, visitTime: unknown): number | null {
  const day = String(visitDate || '').trim();
  const time = String(visitTime || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const validDay = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(validDay.valueOf()) || validDay.toISOString().slice(0, 10) !== day) return null;
  const scheduled = Date.parse(`${day}T${time}:00+09:00`);
  return Number.isFinite(scheduled) ? scheduled + GRACE_PERIOD_MS : null;
}

export function bonusUsageShouldExpire(
  visitDate: unknown, visitTime: unknown, nowMillis = Date.now()
): boolean {
  const cutoff = bonusUsageExpiryMillis(visitDate, visitTime);
  return cutoff !== null && Number.isFinite(nowMillis) && nowMillis >= cutoff;
}
