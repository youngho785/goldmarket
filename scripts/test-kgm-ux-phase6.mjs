import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const p = read('src/pages/Profile.jsx');
const s = read('src/pages/Settings.jsx');
const n = read('src/pages/NotificationsPage.jsx');
const x = read('src/pages/MyExchanges.jsx');
const i = read('src/pages/MyInquiries.js');
const c = read('src/pages/CreateInquiry.jsx');
const marker = 'KGM_PHASE6_MEMBER_SERVICES_UX';
for (const [name, file] of Object.entries({Profile:p, Settings:s, Notifications:n, Exchanges:x, Inquiries:i, Compose:c})) {
  test(`${name}: Phase 6 is installed`,()=> assert.match(file, new RegExp(marker)));
}
test('MY menu contains accessible shortcut to saved gold, bookings, alerts and inquiries',()=> {
  for(const route of ['/my-gold/items','/my-exchanges','/notifications','/support'])
    assert.ok(p.includes(`<MyHubLink to="${route}">`),route);
  assert.match(p,/내 금 기록·예약·알림·회원 혜택/);
  assert.match(p,/<AccountDetails>/);
  assert.match(p,/<SettingsShortcut to="\/settings">/);
});
test('Settings surfaces quick navigation without changing password or delete controls',()=> {
  assert.match(s, /settings-shortcuts-title/);
  assert.match(s, /<SettingLink to="\/notifications">/);
  assert.match(s, /<SettingLink to="\/my-exchanges">/);
  for (const m of ['handlePasswordSubmit','handleDeleteAccount','SettingsNotificationsSection user={user}']) assert.ok(s.includes(m));
});
test('Notification list can retry pagination failures without losing first page',()=> {
  assert.match(n,/const \[moreError, setMoreError\] = useState\(""\)/);
  assert.match(n,/setMoreError\("추가 알림을 불러오지 못했습니다/);
  assert.match(n,/onClick=\{loadMore\}>이전 알림 다시 시도/);
  assert.match(n,/firstPageFailed && \(/);
  assert.match(n,/setItems\(\(current\) => \{/);
});
test('Notification filters are independent buttons, and direct entry exits to a safe parent',()=> {
  assert.match(n,/role="group" aria-label="알림 종류"/);
  assert.match(n,/aria-pressed=\{filter === key\}/);
  assert.match(n,/location\.pathname\.startsWith\("\/admin"\) \? "\/admin" : "\/profile"/);
  assert.match(n,/markNotificationAsRead\(item\.id, uid\)/);
});
test('Exchange summary distinguishes request from confirmation, keeping original states/actions',()=>{
  assert.match(x,/예약 요청은 곧 예약 확정이 아닙니다/);
  assert.match(x,/이 교환건 문의하기/);
  assert.match(x,/<StatusFlow aria-label="교환 진행 단계">/);
  assert.match(x,/예약 취소/);
});
test('Support list uses native links with status filters, retaining load error recovery',()=> {
  assert.match(i,/import \{ Link, useNavigate, useSearchParams \} from "react-router-dom"/);
  assert.match(i,/const Item = styled\(Link\)`/);
  assert.match(i,/to=\{`\/support\/\$\{post\.id\}`\}/);
  assert.doesNotMatch(i,/role="button"[\s\S]{0,100}onClick=\{\(\) => navigate\(`\/support\/\$\{post\.id\}`\)/);
  assert.match(i,/<ErrorNotice role="alert">[\s\S]*\{error\}[\s\S]*다시 불러오기/);
  assert.match(i,/fetchMyInquiriesPaged/);
});
test('Support compose retains exchange-linked questions and adds safe exit',()=> {
  assert.match(c,/relatedGroupId = useMemo/);
  assert.match(c,/createPost\(\{/);
  assert.match(c,/관련된 예약·교환건|연결된 예약·교환건/);
  assert.match(c,/navigate\("\/support"\)/);
});
