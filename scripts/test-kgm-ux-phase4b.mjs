import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGoldBarFee, getGoldBarFeeEstimate } from '../src/lib/goldBarFee.js';
import defaults from '../functions/src/goldBarFees.defaults.json' with { type: 'json' };

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const server=read('functions/src/goldExchange/functions.ts');
const policies=read('functions/src/goldExchange/goldBarFeePolicy.ts');
const admin=read('functions/src/admin/functions.ts');
const feePage=read('src/pages/GoldbarFee.jsx');
const steps=read('src/components/goldExchange/GoldExchangeSteps.jsx');
const rules=read('firestore.rules');

test('기본 공임표는 이전 규격 가격을 바꾸지 않는다', () => {
  for (const [key,fee] of Object.entries(defaults.fees)) {
    if (key.startsWith('range-')) continue;
    const weight = Number(key.slice(2));
    const grams = key.startsWith('g-') ? weight : weight*3.75;
    const don = grams/3.75;
    assert.equal(getGoldBarFee(don,grams), fee, key);
    assert.equal(getGoldBarFee(don,grams,{feeConfig:{fees:defaults.fees}}),fee,key);
  }
  assert.equal(getGoldBarFee(12,45,{calculatorRangeOverride:true}),60000);
});
test('관리자 공임 변경은 계산기·수량에 동일하게 적용된다',()=>{
  const fees={...defaults.fees, 'd-5':61000,'g-1':42000};
  assert.equal(getGoldBarFee(5,18.75,{feeConfig:{fees}}),61000);
  assert.equal(getGoldBarFeeEstimate({grams:18.75,don:5,qty:2,feeConfig:{fees}}).totalFee,122000);
  assert.equal(getGoldBarFee(1/3.75,1,{feeConfig:{fees}}),42000);
  assert.equal(getGoldBarFee(5,18.75,{feeConfig:{fees:null}}),null);
  const changed={...fees,'g-50':77000,'range-11-14':64000};
  assert.equal(getGoldBarFee(50/3.75,50,{calculatorRangeOverride:true,feeConfig:{fees:changed}}),77000);
  assert.equal(getGoldBarFee(12,45,{calculatorRangeOverride:true,feeConfig:{fees:changed}}),64000);
});
test('관리자 저장은 서버 검증·버전·감사 기록·클라이언트 직접쓰기 금지',()=>{
  assert.match(admin,/export const updateGoldBarFees = onCall/);
  assert.match(admin,/requireCurrentAdmin\(req\.auth\?\.uid\)/);
  assert.match(admin,/expectedVersion/);
  assert.match(admin,/goldBarFeeHistory/);
  assert.match(admin,/adminAuditLogs/);
  assert.match(rules,/\['goldRates', 'reservedSlots', 'bookingAvailability', 'goldBarFees'\]/);
  assert.match(rules,/match \/goldBarFeeHistory\/\{historyId\}/);
  assert.match(rules,/allow write: if false;/);
});
test('서버가 예약 당시 공임을 다시 계산하고 기록한다',()=>{
  assert.match(server,/calculateBookedBarFee\(validatedBarsPlan, feePolicy\)/);
  assert.match(server,/\.\.\.\(bookedFee \? bookedFee : \{\}\)/);
  assert.match(server,/tx\.get\(feePolicyRef\)/);
  assert.match(policies,/estimatedGoldBarFeeWon/);
  assert.match(policies,/feePolicyVersion/);
  assert.match(policies,/validateBarFeeTable/);
  assert.match(policies,/Number\.isInteger\(value\)/);
  assert.doesNotMatch(server,/const [^\n]*req\.data\?\.fee/);
});
test('고객은 골드바 선택·방문 예약·공임 안내에서 동일한 스케줄을 읽는다',()=>{
  assert.match(steps,/useGoldBarFeeConfig\(\)/);
  assert.match(steps,/feeConfig: \{ fees: feeSettings\.fees \}/);
  assert.match(feePage,/useGoldBarFeeConfig\(\)/);
  assert.match(feePage,/feeConfig/);
  assert.match(feePage,/r.fee != null/);
  assert.match(read('src/App.jsx'),/path: "goldbar-fees", element: <AdminGoldBarFees \/>/);
  assert.match(read('src/pages/AdminDashboard.jsx'),/to="goldbar-fees"/);
});
