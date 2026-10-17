import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNotificationPushCopy, weeklyPushBody } from '../lib/notifications/pushCopy.js';
import { notificationCategory, normalizeNotificationPreferences, shouldSendPushForUser } from '../lib/notifications/shared.js';

test('weekly MY GOLD push protects holdings and sounds natural', () => {
  const input = {
    type: 'my_gold_weekly',
    title: '이번 주 MY GOLD 리포트',
    body: '현재 참고가치 5,935,000원 · 실물 금 2개 · MEMBER GOLD 0.03g',
    meta: {historicalValueWon:6036667,currentValueWon:5935000,changeWon:-101667,changePercent:-1.68},
  };
  const push=resolveNotificationPushCopy(input);
  assert.equal(push.title,'이번 주 내 금의 가치를 확인해 보세요');
  assert.equal(push.body,'지난주보다 MY GOLD의 참고가치가 내려갔어요. 최근 변화를 확인해 보세요.');
  assert.equal(push.body.includes('5,935,000'),false);
  assert.equal(push.body.includes('101,667'),false);
  assert.match(input.body,/5,935,000/); // Full detail stays inside signed-in inbox.
});

test('weekly rise, unchanged value, and absent comparison are distinguished', () => {
  assert.equal(weeklyPushBody(152000,2.35,true),'지난주보다 MY GOLD의 참고가치가 올랐어요. 최근 변화를 확인해 보세요.');
  assert.equal(weeklyPushBody(0,0,true),'지난주와 비교해 큰 변화가 없어요. 현재 가치를 확인해 보세요.');
  const rise=resolveNotificationPushCopy({type:'my_gold_weekly',meta:{historicalValueWon:5000000,changeWon:152000,changePercent:2.35}});
  assert.equal(rise.title,'이번 주 내 금의 가치가 올랐어요');
  const stable=resolveNotificationPushCopy({type:'my_gold_weekly',meta:{historicalValueWon:5000000,changeWon:0,changePercent:0}});
  assert.equal(stable.title,'이번 주 MY GOLD 리포트가 도착했어요');
  const missing=resolveNotificationPushCopy({type:'my_gold_weekly',meta:{historicalValueWon:0,changeWon:0,changePercent:null}});
  assert.equal(missing.body,'MY GOLD에 기록한 금의 현재 참고가치를 확인해 보세요.');
});

test('tomorrow reminder includes reserved time but no preparation instructions', () => {
  const r=resolveNotificationPushCopy({type:'exchange_visit_reminder',meta:{visitTime:'14:00'}});
  assert.deepEqual(r,{title:'내일 방문 예약이 있어요',body:'내일 14:00 원일귀금속 방문이 예정돼 있어요.'});
  assert.equal(r.body.includes('준비사항'),false);
  assert.match(resolveNotificationPushCopy({type:'exchange_visit_reminder',meta:{visitTime:'unknown'}}).body,/예약 시간을 확인/);
});

test('gold exchange completion retains verified outcome and brand warmth', () => {
  const copy=resolveNotificationPushCopy({type:'exchange_completed',title:'old',body:'old'});
  assert.deepEqual(copy,{title:'GOLD TO GOLD 교환이 완료됐어요',body:'교환이 완료됐어요. 한국골드마켓을 이용해 주셔서 감사합니다.'});
});

test('one MY GOLD goal receives a specific privacy-safe push; multiple goals stay generic', () => {
  assert.deepEqual(resolveNotificationPushCopy({type:'my_gold_goal_reached',meta:{reachedCodes:['price']}}),{
    title:'설정한 금시세에 도달했어요',body:'순금 참고시세가 설정하신 목표 가격에 도달했어요.',
  });
  assert.equal(resolveNotificationPushCopy({type:'my_gold_goal_reached',meta:{reachedCodes:['value','bar']}}).title,'MY GOLD 목표에 도달했어요');
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
