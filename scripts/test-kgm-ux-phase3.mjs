import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('시세 기준일과 조회일을 구분하고 최근 공개 시세를 정직하게 표시한다', () => {
 const s=read('src/pages/GoldPrice.jsx');
 for(const phrase of ['publishedDateKey','isTodayPublished','최근 공개 금시세','조회일','시세 등록일','최근 공개값']) assert.ok(s.includes(phrase),phrase);
 assert.ok(!s.includes('금값이 움직일 때, <em>먼저 알려드릴게요.</em>'));
 assert.ok(s.includes('금시세·주요 소식 안내'));
});
test('광고성 소식·기기 푸시·예약 알림을 분리하고 보너스를 확정으로 약속하지 않는다', () => {
 const s=read('src/components/settings/SettingsNotificationsSection.jsx');
 for(const phrase of ['알림 상태 한눈에 보기','알림 권한·설정·기기 등록','별도 혜택 지급 조건 충족 시','예약·교환 진행 안내']) assert.ok(s.includes(phrase),phrase);
 for(const phrase of ['saveMarketingNotificationConsent','selectCurrentDeviceForMarketing','requestNativePushPermission']) assert.ok(s.includes(phrase),phrase);
});
test('알림함은 명시적 분류를 우선하고 레거시 메시지를 유지한다', () => {
 const s=read('src/pages/NotificationsPage.jsx');
 for(const phrase of ['item?.category','item?.data?.category','const link =','const type =','const text =','CategoryTag','선택한 종류는 현재 불러온']) assert.ok(s.includes(phrase),phrase);
 for(const phrase of ['markAllNotificationsAsRead','markNotificationAsRead','safeInternalLink']) assert.ok(s.includes(phrase),phrase);
});
test('MY GOLD 목표 알림의 정기 점검과 기기 권한 상태를 구분한다', () => {
 const goals=read('src/components/gold/MyGoldAlertGoals.jsx');
 const summary=read('src/components/gold/MyGoldAlertSummary.jsx');
 const page=read('src/pages/MyGoldAlerts.jsx');
 assert.ok(goals.includes('매일 오후 4시 20분(한국시간)'));
 assert.ok(goals.includes('기기 알림 확인 필요'));
 assert.ok(goals.includes('시세 미공개'));
 assert.ok(summary.includes('기기 알림 확인 필요'));
 assert.ok(page.includes('정기 점검 시 목표 도달 여부'));
});
test('MEMBER GOLD의 지급 가능성과 사용 조건을 정확히 설명한다', () => {
 const s=read('src/pages/MemberGold.jsx');
 assert.ok(s.includes('금시세·혜택 알림 참여 조건 확인'));
 assert.ok(s.includes('실제 금교환 예약과 현장 확인'));
 assert.ok(s.includes('requestBonusGoldUsage'));
});
