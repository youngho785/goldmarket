// A concise shared label for the web and Android gold-price page.
// "Today" is the Korean calendar date, not a claim that prices were updated today.
function compactDateKey(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}
export function getGoldPriceDatePresentation(todayKey, sourceDate, hasPublishedPrice) {
  const today = compactDateKey(todayKey);
  const published = compactDateKey(sourceDate);
  const isTodayPublished = today.length === 8 && published.length === 8 && published === today;
  const todayLabel = today.length === 8
    ? `${today.slice(0, 4)}.${today.slice(4, 6)}.${today.slice(6, 8)}`
    : "확인 중";
  return {
    isTodayPublished,
    label: `오늘 날짜 ${todayLabel}${hasPublishedPrice && !isTodayPublished ? " · 최근 공개 시세" : ""}`,
  };
}
