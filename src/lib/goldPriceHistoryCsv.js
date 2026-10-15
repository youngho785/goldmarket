const fields = ['pureGoldSellPerDon', 'gold18kSellPerDon', 'gold14kSellPerDon', 'pureGoldBuyPerDon', 'gold18kBuyPerDon', 'gold14kBuyPerDon'];
const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function buildGoldPriceHistoryCsv(start, end, records) {
  const parse = key => {
    if (!/^\d{8}$/.test(key)) throw new Error('조회 날짜를 확인하세요.');
    const date = new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}T00:00:00Z`);
    if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10).replace(/-/g, '') !== key) throw new Error('조회 날짜를 확인하세요.');
    return date;
  };
  const first = parse(start);
  const last = parse(end);
  const count = (last - first) / 86400000 + 1;
  if (count < 1 || count > 366) throw new Error('조회 기간은 최대 366일로 선택하세요.');
  const byDate = new Map(records.map(row => [row.sourceDate, row]));
  const rows = [['날짜', '순금 판매가(원/돈,VAT 포함)', '18K 판매가(원/돈,VAT 포함)', '14K 판매가(원/돈,VAT 포함)', '순금 매입가(원/돈)', '18K 매입가(원/돈)', '14K 매입가(원/돈)', '기록 구분']];
  let missing = 0;
  for (let date = first; date <= last; date.setUTCDate(date.getUTCDate() + 1)) {
    const iso = date.toISOString().slice(0, 10);
    const row = byDate.get(iso.replace(/-/g, ''));
    if (!row) missing++;
    rows.push([iso, ...fields.map(key => {
      const number = Number(row?.market?.[key]);
      return Number.isFinite(number) && number > 0 ? number : '';
    }), !row ? '기록 없음' : row.entryType === 'carry' || row.source === 'ADMIN_CARRY_FORWARD' ? '자동 유지' : '직접 등록']);
  }
  return { csv: '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n', count, missing };
}
