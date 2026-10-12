import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import {
  sanitizeAppReturnPath,
  getAuthReturnPath,
  buildAuthPath,
  buildVerifyEmailPath,
} from '../src/lib/authReturn.js';
import {
  saveGoldExchangeDraft,
  readGoldExchangeDraft,
  clearGoldExchangeDraft,
} from '../src/lib/goldExchangeDraft.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (path) => readFileSync(resolve(root, path), 'utf8');
const store = () => {
  const data = new Map();
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
  };
};
const sample = {
  calculated: true,
  products: [{ productId: '14k', productName: '14K', goldType: '14K', quantity: '37.5', inputUnit: 'g', finalWeight: 19.5 }],
  barGroup: 'grams', barChoice: { idx: 0, qty: 1 },
  visitDate: '2026-10-22', visitTime: '13:00',
  name: '테스트 고객', phone: '01012345678', privacyAccepted: true,
};

function withWindow(callback) {
  const previous = globalThis.window;
  const sessionStorage = store();
  const localStorage = store();
  globalThis.window = { sessionStorage, localStorage };
  try { return callback({ sessionStorage, localStorage }); }
  finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test('예약 복귀 경로는 로그인·이메일 인증 후에도 내부 경로로 보존한다', () => {
  const resume = '/gold-exchange?resume=reservation';
  assert.equal(sanitizeAppReturnPath(resume), resume);
  const loginPath = buildAuthPath('/login', resume);
  assert.equal(getAuthReturnPath({ search: new URL(loginPath, 'https://kgm.example').search }), resume);
  const verifyPath = buildVerifyEmailPath(resume);
  assert.equal(getAuthReturnPath({ search: new URL(verifyPath, 'https://kgm.example').search }), resume);
});

test('외부 주소와 인증 페이지는 예약 복귀 대상으로 사용하지 않는다', () => {
  assert.equal(sanitizeAppReturnPath('//evil.example/exchange'), '/');
  assert.equal(sanitizeAppReturnPath('/login?next=/gold-exchange'), '/');
});

test('인증 전 선택한 예약 정보를 임시 저장하고 그대로 복구한다', () => withWindow(() => {
  assert.equal(saveGoldExchangeDraft(sample), true);
  const restored = readGoldExchangeDraft();
  assert.equal(restored?.calculated, true);
  assert.equal(restored?.products?.[0]?.quantity, '37.5');
  assert.equal(restored?.visitDate, '2026-10-22');
  assert.equal(restored?.visitTime, '13:00');
}));

test('새 탭에서 인증해도 같은 출처 localStorage 초안을 복원한다', () => withWindow(({ localStorage }) => {
  saveGoldExchangeDraft(sample);
  globalThis.window.sessionStorage = store(); // 이메일 앱에서 돌아와 다른 탭이 열린 상황
  globalThis.window.localStorage = localStorage;
  assert.equal(readGoldExchangeDraft()?.visitTime, '13:00');
}));

test('예약 초안에는 연락처·개인정보 동의가 저장되지 않는다', () => withWindow(({ localStorage }) => {
  saveGoldExchangeDraft(sample);
  const saved = localStorage.getItem('kgm_gold_exchange_reservation_draft_v1');
  assert.ok(saved);
  assert.ok(!saved.includes('01012345678'));
  assert.ok(!saved.includes('테스트 고객'));
  const parsed = JSON.parse(saved);
  assert.ok(!('name' in parsed));
  assert.ok(!('phone' in parsed));
  assert.ok(!('privacyAccepted' in parsed));
}));

test('예약 초안은 2시간이 지나면 복원되지 않는다', () => withWindow(() => {
  const oldNow = Date.now;
  try {
    const base = 1791667200000;
    Date.now = () => base;
    assert.equal(saveGoldExchangeDraft(sample), true);
    Date.now = () => base + 2 * 60 * 60 * 1000 + 1;
    assert.equal(readGoldExchangeDraft(), null);
  } finally { Date.now = oldNow; }
}));

test('예약 제출 성공 이후 초안은 두 저장소에서 함께 삭제한다', () => withWindow(({ sessionStorage, localStorage }) => {
  saveGoldExchangeDraft(sample);
  clearGoldExchangeDraft();
  assert.equal(readGoldExchangeDraft(), null);
  assert.equal(sessionStorage.getItem('kgm_gold_exchange_reservation_draft_v1'), null);
  assert.equal(localStorage.getItem('kgm_gold_exchange_reservation_draft_v1'), null);
}));

test('회원가입·온보딩 화면은 동일 브라우저 2시간 제한을 안내한다', () => {
  const register = src('src/pages/Register.jsx');
  const welcome = src('src/pages/WelcomeOnboarding.jsx');
  assert.match(register, /noticeBody: "선택한 정보는 이 브라우저에 최대 2시간 보관됩니다/);
  assert.match(register, /만료되면 다시 입력해야 할 수 있습니다/);
  assert.doesNotMatch(register, /계산과 일정은 다시 입력하지 않습니다/);
  assert.match(welcome, /계산·일정은 같은 브라우저에서 최대 2시간 동안 불러올 수 있으며/);
} );

test('금교환 예약은 인증 전 초안을 저장하고 원래 예약으로 복귀한다', () => {
  const exchange = src('src/pages/GoldExchange.jsx');
  assert.match(exchange, /saveGoldExchangeDraft\(\{/);
  assert.match(exchange, /next: "\/gold-exchange\?resume=reservation"/);
  assert.match(exchange, /resumeRequested \? readGoldExchangeDraft\(\)/);
  assert.match(exchange, /clearGoldExchangeDraft\(\)/);
});

test('회원가입의 마케팅 선택 동의는 필수 동의로 바뀌지 않는다', () => {
  const register = src('src/pages/Register.jsx');
  assert.match(register, /marketing: false/);
  assert.match(register, /!agreements\.age14 \|\| !agreements\.tos \|\| !agreements\.privacy/);
  assert.doesNotMatch(register, /!agreements\.marketing\)\s*\{/);
});

test('전체 출시 검사에 복귀 경로와 초안 유효기간 검사가 추가된다', () => {
  assert.match(src('scripts/test-release-simple.mjs'), /AUTH RESUME EXPERIENCE/);
  assert.match(src('scripts/test-release-simple.mjs'), /scripts\/test-auth-reservation-resume\.mjs/);
});
