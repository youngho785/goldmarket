// Today is always the Korean calendar day; prices remain valid until changed by the admin.
function compactDateKey(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}

export function getGoldPriceDatePresentation(todayKey, sourceDate, hasPublishedPrice) {
  const today = compactDateKey(todayKey);
  const published = compactDateKey(sourceDate);
  const isTodayPublished = !!hasPublishedPrice && today.length === 8 && published === today;
  const todayLabel = today.length === 8
    ? `${today.slice(0, 4)}.${today.slice(4, 6)}.${today.slice(6, 8)}`
    : "확인 중";
  return { isTodayPublished, label: `오늘 날짜 ${todayLabel}` };
}

// Yesterday's effective price, not the last time the operator entered a price.
// AdminGoldPrice preserves previousMarket across multiple edits on the same day.
export function getGoldPricePreviousDayMarket(todayKey, sourceDate, market, previousMarket) {
  const today = compactDateKey(todayKey);
  const published = compactDateKey(sourceDate);
  if (today.length !== 8 || published.length !== 8 || !market) return null;
  if (published < today) return market;
  if (published === today) return previousMarket || null;
  return null;
}
