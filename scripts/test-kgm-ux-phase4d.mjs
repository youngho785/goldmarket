import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const steps=read('src/components/goldExchange/GoldExchangeSteps.jsx');
const styles=read('src/components/goldExchange/GoldExchange.styles.js');
const exchange=read('src/pages/GoldExchange.jsx');
const benefits=read('src/hooks/useGoldExchangeMemberGold.js');

// Presentation tests. Full build and an actual handset check are required separately.
test('4-D: MY GOLD 보유 중량과 MEMBER GOLD 혜택을 구분해 안내한다',()=>{
  assert.match(steps,/MY GOLD에 기록한 내 금과 별도로 관리되는 회원 혜택/);
  assert.match(steps,/MEMBER GOLD 혜택/);
  assert.match(steps,/<Link to="\/member-gold" className="member-gold-detail">/);
  assert.match(steps,/<MemberGoldPanel role="group"/);
});
test('4-D: 잔액과 현재 신청 가능 혜택을 별도로 표시한다',()=>{
  assert.match(steps,/회원 혜택 잔액/);
  assert.match(steps,/이번 예약 신청 가능/);
  assert.match(steps,/Number\(memberGoldBalanceG \|\| 0\)\.toFixed\(2\)/);
  assert.match(steps,/Number\(memberGoldSpendableG \|\| 0\)\.toFixed\(2\)/);
  assert.match(steps,/memberGoldPending \? "신청 중"/);
});
test('4-D: 예약 혜택 선택은 선택 사항이며 즉시 차감되지 않는다',()=>{
  assert.match(steps,/<MemberGoldSelection \$selected=\{useMemberGold\}>/);
  assert.match(steps,/checked=\{useMemberGold\}/);
  assert.match(steps,/onChange=\{\(e\) => setUseMemberGold\(e\.target\.checked\)\}/);
  assert.match(steps,/선택하지 않아도 방문 예약은 가능합니다/);
  assert.match(steps,/선택해도 지금 바로 차감되지 않습니다/);
  assert.match(steps,/aria-describedby="member-gold-usage-details"/);
  assert.match(steps,/id="member-gold-usage-details"/);
});
test('4-D: 다른 예약에 연결된 혜택을 중복 신청하지 않는다',()=>{
  assert.match(steps,/\{memberGoldPending \? \(/);
  assert.match(steps,/다른 금교환 예약에 MEMBER GOLD 사용 신청이 연결되어 있습니다/);
  assert.match(steps,/\) : Number\(memberGoldSpendableG \|\| 0\) > 0 \? \(/);
  assert.match(steps,/현재 이번 예약에 사용할 수 있는 MEMBER GOLD가 없습니다/);
});
test('4-D: 예약 접수 후에만 요청 혜택 코드가 표시된다',()=>{
  assert.match(steps,/\{memberGoldUsage\?\.status === "requested" && \(/);
  assert.match(steps,/<MemberGoldReceipt role="status"/);
  assert.match(steps,/\{memberGoldUsage\.requestCode \? \(/);
  assert.match(steps,/\{memberGoldUsage\.requestCode\}/);
  assert.match(steps,/담당자에게만 이 코드를 보여주세요/);
  assert.match(steps,/매장에서 교환을 확정할 때 이루어집니다/);
});
test('4-D: 혜택 연결 실패가 방문 예약 완료 상태를 숨기지 않는다',()=>{
  assert.match(steps,/\{memberGoldUsageError && \(/);
  assert.match(steps,/예약은 정상 접수되었습니다/);
  assert.match(steps,/to="\/member-gold"/);
  if(exchange.includes("linkMemberGoldToGroup")) assert.match(exchange,/await linkMemberGoldToGroup\(res\.groupId\)/);
  assert.match(benefits,/예약 자체는 이미 성공한 뒤 호출됩니다/);
  assert.match(benefits,/return null;/);
});
test('4-D: Android 소형 화면의 혜택 선택은 터치 영역과 포커스가 확보된다',()=>{
  for(const selector of ['MemberGoldPanel','MemberGoldAmounts','MemberGoldSelection','MemberGoldStatusNote','MemberGoldReceipt']){
    assert.match(styles,new RegExp(`export const ${selector} = styled\\.(?:section|div|label|p)\\x60`));
  }
  assert.match(styles,/min-height: 44px;/);
  assert.match(styles,/min-height: 58px;/);
  assert.match(styles,/:focus-within/);
  assert.match(styles,/max-width: 360px/);
  assert.match(styles,/prefers-reduced-motion: reduce/);
  assert.match(styles,/font-variant-numeric: tabular-nums/);
});
test('4-D: 골드바/공임/예약 계층은 4-A~4-C 그대로 유지된다',()=>{
  assert.match(steps,/<PremiumDenomTile/);
  assert.match(steps,/<ReservationKeySummary aria-label="예약 전 중량 요약">/);
  assert.match(steps,/<ReservationFeeLine role="group"/);
  assert.match(steps,/<ReservationScheduleStatus \$selected=\{!!dateKey && !!visitTime\}/);
  assert.match(steps,/<ReservationNextSteps aria-label="금교환 이후 진행 절차">/);
  assert.match(steps,/<GoldExchangeTracker status=\{status\}/);
  if(exchange.includes("submitGoldExchangeGroup")) assert.match(exchange,/submitGoldExchangeGroup\(payload\)/);
  assert.match(steps,/getGoldBarFeeEstimate\(/);
});
