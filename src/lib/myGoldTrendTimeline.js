// MY GOLD: date-accurate, as-of public market-price timeline.
// Pure helpers so chart calculations can be tested without Firebase or React.
export function goldTrendDateOrdinal(dateValue) {
  const key = String(dateValue || "").replace(/-/g, "");
  if (!/^\d{8}$/.test(key)) return null;
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(4, 6));
  const day = Number(key.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(date.getTime() / 86400000);
}

export function prepareMyGoldTrendPoints({
  startDate,
  endDate,
  startReference,
  historyRows = [],
  currentMarket = {},
  valueAtMarket,
}) {
  const start = goldTrendDateOrdinal(startDate);
  const end = goldTrendDateOrdinal(endDate);
  if (start === null || end === null || start >= end || typeof valueAtMarket !== "function") return [];
  // Without an effective price on the selected period's start, we cannot claim a period change.
  if (!startReference?.market) return [];

  const compact = (day) => String(day || "").replace(/-/g, "");
  const makePoint = (date, market) => {
    const valueWon = Number(valueAtMarket(market));
    const pricePerDon = Number(market?.pureGoldBuyPerDon);
    if (!Number.isFinite(valueWon) || valueWon <= 0 || !Number.isFinite(pricePerDon) || pricePerDon <= 0) return null;
    return { date: compact(date), valueWon, pricePerDon };
  };
  const anchor = makePoint(startDate, startReference.market);
  if (!anchor) return [];

  let previousMarket = startReference.market;
  const points = [anchor];
  const rows = [...historyRows]
    .filter((row) => {
      const day = goldTrendDateOrdinal(row?.sourceDate);
      return day !== null && day > start && day <= end && !!row?.market;
    })
    .sort((a, b) => compact(a.sourceDate).localeCompare(compact(b.sourceDate)));

  for (const row of rows) {
    const date = compact(row.sourceDate);
    const before = makePoint(date, previousMarket);
    const after = makePoint(date, row.market);
    if (!before || !after) continue;
    // Step-shaped change at the real calendar date: no diagonal over unchanged days.
    if (before.valueWon !== after.valueWon) points.push(before);
    if (points[points.length - 1].date === date && points[points.length - 1].valueWon === after.valueWon) {
      previousMarket = row.market;
      continue;
    }
    points.push(after);
    previousMarket = row.market;
  }

  const today = makePoint(endDate, currentMarket);
  if (!today) return [];
  const previousToday = makePoint(endDate, previousMarket);
  if (!previousToday) return [];
  if (points[points.length - 1].date !== today.date) {
    // Carry the last known price forward to today, then account for a current-day change.
    points.push(previousToday);
  }
  if (points[points.length - 1].valueWon !== today.valueWon) {
    points.push(today);
  } else {
    points[points.length - 1] = today;
  }
  return points;
}

export function buildMyGoldTrendChartGeometry(points) {
  const width = 640;
  const height = 136;
  const paddingX = 12;
  const paddingY = 14;
  const empty = { width, height, polyline: "", area: "", min: 0, max: 0, lastPoint: null };
  if (!Array.isArray(points) || points.length === 0) return empty;
  const firstDay = goldTrendDateOrdinal(points[0].date);
  const lastDay = goldTrendDateOrdinal(points[points.length - 1].date);
  if (firstDay === null || lastDay === null || lastDay < firstDay) return empty;

  const values = points.map((point) => Number(point.valueWon));
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return empty;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const pad = Math.max(1, min * 0.01);
    min -= pad;
    max += pad;
  }
  const range = Math.max(1, max - min);
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const duration = Math.max(1, lastDay - firstDay);
  const coords = points.map((point) => {
    const day = goldTrendDateOrdinal(point.date);
    if (day === null) return null;
    const x = paddingX + ((day - firstDay) / duration) * usableWidth;
    const y = paddingY + (1 - (Number(point.valueWon) - min) / range) * usableHeight;
    return [x, y];
  });
  if (coords.some((coord) => coord === null)) return empty;
  const polyline = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const baseline = height - paddingY;
  const firstX = coords[0][0];
  const lastX = coords[coords.length - 1][0];
  const area = `${firstX.toFixed(2)},${baseline} ${polyline} ${lastX.toFixed(2)},${baseline}`;
  return { width, height, polyline, area, min, max, lastPoint: coords[coords.length - 1] };
}
