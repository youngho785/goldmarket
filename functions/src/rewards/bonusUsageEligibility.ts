// MEMBER GOLD 새 사용 신청: 예약 방문일이 오늘(한국시간) 이후여야 합니다.
// 날짜 확인 불가 또는 과거 예약은 신규 신청을 막되, 과거 요청/잔액/정산 기록은 변경하지 않습니다.
export function eligibleBonusUsageDate(value: unknown, todayKey: string): boolean {
  const visitDate = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return false;
  const date = new Date(`${visitDate}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === visitDate &&
    visitDate >= todayKey;
}
