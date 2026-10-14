import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getGoldPriceDatePresentation } from "../src/lib/goldPriceDatePresentation.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const board = source("src/components/gold/GoldPriceBoard.jsx");
const landing = source("src/pages/LandingPage.jsx");
const exchange = source("src/components/goldExchange/GoldExchangeSteps.jsx");
const runner = source("scripts/test-release-simple.mjs");

test("홈 시세표는 이미 검증된 웹·앱 날짜 표현을 사용한다", () => {
  assert.match(board, /getGoldPriceDatePresentation/);
  assert.match(board, /todayKey, data\?\.sourceDate, !!data/);
  assert.match(board, /<span>\{priceDateLabel\}<\/span>/);
  assert.equal(getGoldPriceDatePresentation("20261012", "20261008", true).label,
    "오늘 날짜 2026.10.12");
});

test("오늘 등록된 시세는 최근 공개 안내를 붙이지 않는다", () => {
  assert.equal(getGoldPriceDatePresentation("20261012", "20261012", true).label, "오늘 날짜 2026.10.12");
  assert.doesNotMatch(board, /!isTodayPublished && <span role="status">실제 거래 전 가격 확인<\/span>/);
});

test("홈 시세표에서 등록일·등록시각 및 긴 경고 박스를 제거한다", () => {
  assert.doesNotMatch(board, /시세 등록일|등록 시각|publicationTime|<PriceFreshnessNotice/);
  assert.match(board, /<strong>1돈\(3\.75g\) 기준<\/strong>/);
  assert.match(board, /시세는 시장/);
});

test("홈 금시세 비교 안내는 전일 대비 문구를 유지한다", () => {
  assert.match(board, /전일 비교 없음/);
  assert.match(board, /전일 대비 보합/);
  assert.match(board, /전일 대비/);
  assert.doesNotMatch(board, /이전 시세 대비|이전 시세 비교 없음/);
});

test("홈 이용 순서의 예상 가치 표현이 금시세 갱신일을 암시하지 않는다", () => {
  assert.match(landing, /<strong>예상 가치 확인<\/strong>/);
  assert.match(landing, /공개 시세 기준 내 금의 예상 참고가치를 확인합니다/);
  assert.match(landing, /<GoldPriceBoard compact \/>/);
  assert.match(landing, /<strong>MY GOLD 기록<\/strong>/);
});

test("남는 순금은 사용자에게 반환·현금화 등의 정책을 임의로 약속하지 않는다", () => {
  assert.match(exchange, /남는 순금의 처리 방법은 방문 시 실측 결과를 확인한 뒤 결정할 수 있습니다/);
  assert.match(exchange, /남는 금은 <b>\{fmtG\(leftoverG\)\}g/);
  assert.match(exchange, /추가로 필요한 순금/);
  assert.doesNotMatch(exchange, /남는 순금.*고객 동의 후/);
  assert.doesNotMatch(exchange, /남는 순금.*(?:현금 지급|무조건 반환|자동 적립)/);
});

test("비회원의 예약 버튼은 로그인·이메일 인증의 다음 행동을 알려준다", () => {
  assert.match(exchange, /user \? "이메일 인증하고 예약 이어가기" : "로그인·가입하고 예약 이어가기"/);
  assert.match(exchange, /예약자 이름·연락처 확인과 개인정보 동의 후 예약 요청이 접수됩니다/);
  assert.match(exchange, /인증 중에도 시간은 선점되지 않으므로/);
  assert.match(exchange, /<Button type="submit" disabled=\{loading\} aria-busy=\{loading\}>/);
});

test("금교환 계산식과 예약 제출 로직을 수정하지 않고 화면 안내만 개선한다", () => {
  assert.match(exchange, /getGoldBarFeeEstimate/);
  assert.match(exchange, /roundTo3Custom/);
  assert.match(exchange, /onRequireAuth/);
  assert.match(exchange, /예약 전 중량 요약/);
});

test("전체 출시 검사에 화면 신뢰성 검사를 포함한다", () => {
  assert.match(runner, /GOLD EXCHANGE RESERVATION UX/);
  assert.match(runner, /GOLD EXCHANGE SCREEN TRUST/);
  assert.match(runner, /scripts\/test-gold-exchange-screen-trust\.mjs/);
});
