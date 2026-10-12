import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNotificationPushCopy, weeklyPushBody } from '../lib/notifications/pushCopy.js';
import { notificationCategory, normalizeNotificationPreferences, shouldSendPushForUser } from '../lib/notifications/shared.js';

test('weekly summary shows only seven-day change on the lock screen', () => {
  const input = {
    type: 'my_gold_weekly',
    title: '이번 주 MY GOLD 리포트',
    body: '현재 참고가치 5,935,000원 · 실물 금 2개 · MEMBER GOLD 0.03g',
    meta: { historicalValueWon: 6036667, currentValueWon: 5935000, changeWon: -101667, changePercent: -1.68 },
  };
  const push = resolveNotificationPushCopy(input);
  assert.equal(push.title, '이번 주 MY GOLD 리포트');
  assert.equal(push.body, '7일 전 대비 ▼ 101,667원 (-1.68%)\n지난주와 비교한 변화를 확인해 보세요.');
  assert.equal(push.body.includes('5,935,000'), false);
  assert.equal(push.body.includes('32.82'), false);
  assert.match(input.body, /5,935,000/); // full in-app text stays available
});

test('weekly summary handles rise, unchanged value, and absent comparison', () => {
  assert.equal(weeklyPushBody(152000, 2.35, true), '7일 전 대비 ▲ 152,000원 (+2.35%)\n지난주와 비교한 변화를 확인해 보세요.');
  assert.equal(weeklyPushBody(0, 0, true), '7일 전 대비 변동 없음\n지난주와 비교한 변화를 확인해 보세요.');
  const missing = resolveNotificationPushCopy({type:'my_gold_weekly', meta: {currentValueWon: 5100000, historicalValueWon: 0, changeWon: 0, changePercent: null}});
  assert.equal(missing.body, '이번 주 MY GOLD 참고가치를 확인해 보세요.');
  assert.equal(missing.body.includes('0.00%'), false);
});

test('tomorrow reminder includes reserved time but no preparation text', () => {
  const remind = resolveNotificationPushCopy({ type: 'exchange_visit_reminder', title: 'old', body: 'old', meta: {visitTime: '14:00'} });
  assert.deepEqual(remind, { title: '내일 금교환 방문 안내', body: '내일 14:00 원일귀금속 방문 예약이 있습니다.' });
  assert.equal(remind.body.includes('준비사항'), false);
  assert.match(resolveNotificationPushCopy({type:'exchange_visit_reminder', meta:{visitTime:'unknown'}}).body, /예약 시간을 확인/);
});

test('transactional completion exact approved thank-you wording', () => {
  const copy = resolveNotificationPushCopy({type:'exchange_completed', title:'old', body:'old'});
  assert.deepEqual(copy, {title: 'GOLD TO GOLD 교환 완료', body: '교환이 완료되었습니다. 감사합니다.'});
});

test('customer asset balances and administrator personal details are not exposed in system push text', () => {
  const sensitive = '홍길동님 010-1234-5678 / 12.34g / 5,935,000원';
  for (const type of ['admin_exchange_requested','admin_exchange_rescheduled','admin_exchange_canceled_by_customer','admin_member_signup','admin_bonus_gold_usage_requested','bonus_gold_usage_requested','bonus_gold_usage_completed','bonus_gold_carryover_restored','welcome_bonus','marketing_push_bonus','promo_bonus']) {
    const copy = resolveNotificationPushCopy({type, title: sensitive, body: sensitive});
    assert.equal(copy.title.includes(sensitive), false, type);
    assert.equal(copy.body.includes('010-'), false, type);
    assert.equal(copy.body.includes('5,935,000'), false, type);
  }
});

test('confirmed account benefit notifications are service messages, not marketing', () => {
  const prefs = normalizeNotificationPreferences({allEnabled:false,goldNews:false});
  const noMarketing = {consents:{marketing:{accepted:false}}};
  for (const type of ['welcome_bonus','promo_bonus','marketing_push_bonus','bonus_gold_carryover_restored','my_gold_goal_reached']) {
    assert.equal(notificationCategory(type), 'other', type);
    assert.equal(shouldSendPushForUser(noMarketing,prefs,type), true, type);
  }
  for (const type of ['my_gold_weekly','gold_news_admin','my_gold_admin','benefit_admin']) {
    assert.equal(shouldSendPushForUser(noMarketing,prefs,type), false, type);
  }
});

test('operator-authored notices retain their exact message and link is not modified', () => {
  const copy = resolveNotificationPushCopy({type:'gold_news_admin',title:'한국골드마켓 소식',body:'오늘의 금시세를 확인하세요.'});
  assert.deepEqual(copy,{title:'한국골드마켓 소식',body:'오늘의 금시세를 확인하세요.'});
});
