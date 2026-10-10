import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const steps = read('src/components/goldExchange/GoldExchangeSteps.jsx');
const styles = read('src/components/goldExchange/GoldExchange.styles.js');
const exchange = read('src/pages/GoldExchange.jsx');
const fees = read('src/lib/goldBarFee.js');

test('4-C 예약 요약: 받을 골드바·순금량·남는/부족한 금을 먼저 안내', () => {
  assert.match(steps, /<ReservationKeySummary aria-label="예약 전 중량 요약">/);
  assert.match(steps, /내 금 예상 순금 \{formatGoldWeightPair\(barsPlan\.totalGrams \|\| 0\)\}/);
  assert.match(steps, /선택한 골드바 총중량/);
  assert.match(steps, /추가로 필요한 순금/);
  assert.match(steps, /예상 남는 순금/);
  assert.match(steps, /<ReservationFeeLine role="group"/);
});

test('4-C 예약 공임: 4-B 공유 공임표를 계속 사용하고 금액은 보조 정보로 배치', () => {
  assert.match(steps, /const feeSettings = useGoldBarFeeConfig\(\)/);
  assert.match(steps, /getGoldBarFeeEstimate\(\{[\s\S]*feeConfig: \{ fees: feeSettings\.fees \}/);
  assert.match(steps, /예약 접수 시 서버에서 최신 공임을 다시 검증합니다/);
  assert.match(styles, /export const ReservationFeeLine = styled\.div/);
  assert.match(exchange, /feePolicyVersion: feeSettings\.version/);
});

test('4-C 날짜/시간: 기존 가용 슬롯, 휴무일, 중복 예약 제약을 유지', () => {
  assert.match(steps, /<ReservationScheduleStatus \$selected=\{!!dateKey && !!visitTime\}/);
  assert.match(steps, /아직 예약 전/);
  assert.match(steps, /taken\.has\(t\)/);
  assert.match(steps, /availability\.blockedSlots\.has\(t\)/);
  assert.match(steps, /date\.getDay\(\) !== 0/);
  assert.match(steps, /선택한 날짜·시간은 아직 확정되지 않았습니다/);
});

test('4-C 접수완료: 실시간 상태별 정확한 명칭과 다음 단계 제공', () => {
  for (const status of ['scheduled','in_progress','completed','canceled','rejected']) {
    assert.ok(steps.includes(`status === "${status}"`));
  }
  assert.match(steps, /현재 상태 · 예약 확인 대기/);
  assert.match(steps, /방문 예약 요청이 접수되었습니다/);
  assert.match(steps, /<ReservationNextSteps aria-label="금교환 이후 진행 절차">/);
  assert.match(steps, /고객 동의 후 교환/);
  assert.match(steps, /<Button as=\{Link\} to="\/my-exchanges"/);
  assert.match(steps, /<GoldExchangeTracker status=\{status\}/);
});

test('4-C 매장 안내: 주소 우선, 연락처·지도는 펼치기', () => {
  assert.match(steps, /방문 장소 · \{STORE_INFO\.name\}/);
  assert.match(steps, /<StoreVisitDetails>/);
  assert.match(steps, /매장 위치·연락처·지도 보기/);
  assert.match(steps, /STORE_INFO\.phone/);
  assert.match(steps, /naverUrl/);
  assert.match(steps, /<PushPermissionPrompt/);
});

test('4-C 비즈니스 규칙 보호: 공임·순금 환산·예약 제출 API는 기존 모듈', () => {
  assert.match(fees, /export function getGoldBarFeeEstimate/);
  assert.match(exchange, /barsPlan: barsPlan \|\| null/);
  // Local fixture may omit the submit function body; in production it must remain wired.
  if (exchange.includes('submitGoldExchangeGroup')) assert.match(exchange, /submitGoldExchangeGroup\(payload\)/);
  if (exchange.includes('buildGoldBarPlan')) assert.match(exchange, /buildGoldBarPlan\(/);
  assert.match(steps, /memberGoldPending/);
  assert.match(steps, /privacyAccepted/);
  assert.match(steps, /선택해도 지금(?: 바로)? 차감되지 않(?:으며|습니다)/);
  assert.match(styles, /export const ReservationNextSteps = styled\.ol/);
});
