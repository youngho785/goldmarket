import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const notifications = source("src/pages/NotificationsPage.jsx");
const inquiries = source("src/pages/MyInquiries.js");
const detail = source("src/pages/InquiryDetail.jsx");
const createInquiry = source("src/pages/CreateInquiry.jsx");
const exchanges = source("src/pages/MyExchanges.jsx");

// Source checks are regression guards, not a replacement for Firebase Emulator/browser tests.
test("알림 첫 조회 실패는 빈 목록으로 오인되지 않고 다시 불러올 수 있다", () => {
  assert.match(notifications, /const \[firstPageFailed, setFirstPageFailed\] = useState\(false\)/);
  assert.match(notifications, /!firstPageFailed && \(filteredItems\.length === 0/);
  assert.match(notifications, /onClick=\{loadFirstPage\}>다시 불러오기/);
  assert.match(notifications, /requestId !== firstPageRequestRef\.current/);
});

test("선택한 필터에 해당하는 알림이 현재 페이지에 없어도 이전 목록을 조회할 수 있다", () => {
  assert.match(notifications, /!firstPageFailed && hasMore && \(/);
  assert.match(notifications, /이전 알림 더 보기/);
});

test("읽음 처리 실패 시 실제 상태와 다른 읽음 표시를 되돌린다", () => {
  assert.match(notifications, /setError\("알림 읽음 처리에 실패했습니다/);
  assert.match(notifications, /value\.id === item\.id \? \{ \.\.\.value, read: false \}/);
});

test("문의 상태 전환 중 이전 네트워크 요청 결과는 목록을 덮어쓰지 않는다", () => {
  assert.match(inquiries, /let cancelled = false/);
  assert.match(inquiries, /if \(!cancelled\) \{\s*setRows\(items\)/);
  assert.match(inquiries, /return \(\) => \{ cancelled = true; \}/);
  assert.match(inquiries, /다시 불러오기/);
});

test("문의 상세 화면은 네트워크 실패 시 자동 이동 대신 재시도를 제공한다", () => {
  assert.doesNotMatch(detail, /load\(\)\.catch\(\(\) => navigate\(listPath/);
  assert.match(detail, /<ErrorNotice role="alert">\{loadError/);
  assert.match(detail, /onClick=\{\(\) => void load\(\)\}>다시 불러오기/);
});

test("일반 문의와 교환 연동 문의를 구분하고 로그인 후 문의 작성으로 돌아온다", () => {
  assert.match(createInquiry, /relatedGroupId \? "금교환 문의 작성" : "1:1 문의 작성"/);
  assert.match(createInquiry, /buildAuthPath\("\/login", location\.pathname \+ location\.search\)/);
});

test("교환내역 조회 실패 시 기존 기능을 버리지 않고 다시 시도할 수 있다", () => {
  assert.match(exchanges, /setRetryKey\(\(value\) => value \+ 1\)/);
  assert.match(exchanges, /교환내역 다시 불러오기/);
  assert.match(exchanges, /\[user\?\.uid, retryKey\]/);
});
