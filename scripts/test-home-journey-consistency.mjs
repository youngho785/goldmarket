import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");
const pc = source("src/pages/AppHome.jsx");
const app = source("src/pages/AndroidHome.jsx");
const landing = source("src/pages/LandingPage.jsx");
const actions = source("src/components/home/HomePriorityActions.jsx");
const release = source("scripts/test-release-simple.mjs");

test("웹 홈은 중복 골드바 목표 카드를 없애고 핵심 CTA와 상세 목표는 유지한다", () => {
  assert.doesNotMatch(pc, /WebGoalLink/);
  assert.match(pc, /<HomePriorityActions \/>/);
  assert.match(pc, /<HomeOptionalDetails>[\s\S]*<AppGoldJourney/);
  assert.match(pc, /<AppMyGoldDashboard/);
});

test("안드로이드 홈에서 GOLD TO GOLD 소개를 모든 회원에게 표시", () => {
  assert.match(app, /<GoldToGoldStory/);
  assert.doesNotMatch(app, /\{!hasMyGold && \(\s*<GoldToGoldStory/);
  assert.match(app, /<AppGoldJourney/);
  assert.match(app, /<HomePriorityActions \/>/);
  assert.match(app, /<QuickGoldValueCalculator[\s\S]*source="app-home"/);
});

test("앱 홈 시세는 불필요한 시세 등록일을 표시하지 않으며 금시세 페이지로 이동한다", () => {
  assert.match(app, /<PriceCard to="\/gold-price" aria-label="순금 시세 자세히 보기">/);
  assert.match(app, /getGoldPriceDatePresentation\(todayKey, dashboard\.marketSourceDate, true\)/);
  assert.doesNotMatch(app, /시세 등록일|최근 등록 금시세/);
  assert.match(app, /dashboard\.publicPriceEnabled && purePrice > 0/);
});

test("비회원 랜딩은 공개 시세 기준이라고 안내하고 금 계산과 기록 흐름을 유지한다", () => {
  // Editorial redesign: protect the user journey, not removed component names or old copy.
  assert.match(landing, /공개 시세 기준 예상 참고가치를 확인합니다/);
  assert.match(landing, /<h2 id="live-title">오늘, 금의 기준\.<\/h2>/);
  assert.doesNotMatch(landing, /시세 등록일|오늘 예상 참고가치/);
  assert.match(landing, /<QuickGoldValueCalculator\s+source="landing"/);
  assert.match(landing, /MY GOLD에 기록하세요/);
  assert.match(landing, /to="\/my-gold#goldbar-goal"/);
  assert.match(landing, /<MainAction as=\{Link\} to="\/gold-exchange">예상 교환 확인/);
  assert.match(landing, /실제 순도·중량·제작 공임과 부족분 비용은 매장에서 확인하고 고객이 동의한 뒤 확정합니다/);
});

test("회원 홈의 두 핵심 버튼은 기록 추가와 GOLD TO GOLD 예상 확인으로 연결된다", () => {
  assert.match(actions, /내 금으로 할 일/);
  assert.match(actions, /to="\/my-gold\/items\?add=1"/);
  assert.match(actions, /to="\/gold-exchange\?mode=vault&auto=1"/);
  assert.match(pc, /<MemberGoldSummaryCard uid=\{user\?\.uid\}/);
  assert.match(app, /<MemberGoldSummaryCard uid=\{user\?\.uid\} compact/);
});

test("전체 출시 검사에 홈 UX 회귀 검사가 포함된다", () => {
  assert.match(release, /HOME JOURNEY UX/);
  assert.match(release, /scripts\/test-home-journey-consistency\.mjs/);
});
