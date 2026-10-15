export const PRICE_FIELDS = ['pureGoldSellPerDon', 'gold18kSellPerDon', 'gold14kSellPerDon', 'pureGoldBuyPerDon', 'gold18kBuyPerDon', 'gold14kBuyPerDon'] as const;
export type Market = Record<(typeof PRICE_FIELDS)[number], number>;
export type PriceRow = Record<string, any>;

export function koreaDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${values.year}${values.month}${values.day}`;
}
export function validDate(key: string): boolean {
  if (!/^\d{8}$/.test(key)) return false;
  const date = new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10).replace(/-/g, '') === key;
}
export function shiftDay(key: string, offset: number): string {
  if (!validDate(key)) throw new Error('올바른 날짜를 선택하세요.');
  const date = new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}
export function dateRange(start: string, end: string, max = 366): string[] {
  if (!validDate(start) || !validDate(end) || start > end) throw new Error('조회 기간을 확인하세요.');
  const days: string[] = [];
  for (let key = start; key <= end; key = shiftDay(key, 1)) {
    if (days.length >= max) throw new Error(`한 번에 최대 ${max}일을 처리할 수 있습니다.`);
    days.push(key);
  }
  return days;
}
export function normalizeMarket(value: PriceRow): Market {
  const result = {} as Market;
  for (const key of PRICE_FIELDS) {
    const number = Number(value?.[key]);
    if (!Number.isSafeInteger(number) || number <= 0 || number > 100_000_000) throw new Error(`금시세 항목을 확인하세요: ${key}`);
    result[key] = number;
  }
  return result;
}
export function isManual(row: PriceRow): boolean {
  return row.entryType === 'manual' || (row.entryType !== 'carry' && row.source === 'ADMIN_MANUAL');
}
export function comparison(price: Market, previous: PriceRow | undefined): PriceRow {
  const previousMarket = previous?.market || null;
  const hasPreviousFields = Object.fromEntries(PRICE_FIELDS.map(key => [key, Number(previousMarket?.[key]) > 0]));
  return {
    previousMarket, previousSourceDate: previous?.sourceDate || null,
    hasPreviousFields, hasPrevious: Object.values(hasPreviousFields).some(Boolean),
    changes: Object.fromEntries(PRICE_FIELDS.map(key => [key, hasPreviousFields[key] ? price[key] - Number(previousMarket[key]) : 0])),
  };
}
export function correctedRows(start: string, today: string, price: Market, existing: Map<string, PriceRow>, prior?: PriceRow) {
  const stopDate = [...existing.keys()].sort().find(key => key > start && isManual(existing.get(key)!)) || null;
  const end = stopDate ? shiftDay(stopDate, -1) : today;
  const rows: PriceRow[] = [];
  let previous = prior;
  for (const key of dateRange(start, end)) {
    const row: PriceRow = {
      ...(existing.get(key) || {}), sourceDate: key, market: price,
      entryType: key === start ? 'manual' : 'carry',
      source: key === start ? 'ADMIN_MANUAL' : 'ADMIN_CARRY_FORWARD',
      sourceLabel: key === start ? '한국골드마켓 관리자 직접 입력' : '전일 금시세 자동 유지',
      status: 'published', ...comparison(price, previous),
      ...(key === start ? {} : { carriedFrom: start }),
    };
    if (key === start) delete row.carriedFrom;
    rows.push(row);
    previous = row;
  }
  // Its price is protected, but its previous-day baseline must reflect the correction.
  const boundary = stopDate ? { ...existing.get(stopDate)!, ...comparison(existing.get(stopDate)!.market, previous) } : null;
  return { rows, stopDate, boundary };
}
export function missingDailyRows(start: string, today: string, existing: Map<string, PriceRow>, prior?: PriceRow): PriceRow[] {
  const rows: PriceRow[] = [];
  let previous = prior;
  for (const key of dateRange(start, today)) {
    const saved = existing.get(key);
    if (saved) { previous = saved; continue; }
    if (!previous?.market) continue; // Never invent prices before the first known price.
    const row = {
      sourceDate: key, market: normalizeMarket(previous.market), entryType: 'carry',
      source: 'ADMIN_CARRY_FORWARD', sourceLabel: '전일 금시세 자동 유지', status: 'published',
      carriedFrom: previous.carriedFrom || previous.sourceDate, ...comparison(previous.market, previous),
    };
    rows.push(row);
    previous = row;
  }
  return rows;
}
