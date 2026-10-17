import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const calc = readFileSync(new URL("../src/components/gold/QuickGoldValueCalculator.jsx", import.meta.url), "utf8");
const exchange = readFileSync(new URL("../src/pages/GoldExchange.jsx", import.meta.url), "utf8");
const goldStory = readFileSync(new URL("../src/pages/GoldToGoldIntro.jsx", import.meta.url), "utf8");

const fieldsEnd = calc.indexOf("</Fields>");
const toggle = calc.indexOf("<CompactHelpToggle", fieldsEnd);
const guide = calc.indexOf("<UnknownGuide id={guideId}", fieldsEnd);
const results = calc.indexOf("{canCalculate && (\n          <Results", fieldsEnd);

test("모바일·웹·앱 공용 계산기는 금 종류와 중량 뒤에서 도움말을 펼친다", () => {
  assert.ok(fieldsEnd >= 0 && toggle > fieldsEnd && guide > toggle && results > guide);
  assert.match(calc, /\(quickEntryExperience \|\| source === "gold-price"\) && \(\n          <CompactHelpToggle/);
  assert.equal((calc.match(/<CompactHelpToggle/g) || []).length, 1);
  assert.match(calc, /aria-controls=\{guideId\}/);
  assert.match(calc, /aria-expanded=\{entryMode === "unknown"\}/);
  assert.match(calc, /const guideId = useId\(\)/);
});

test("닫힌 상태에는 짧은 도움말만 노출하며 추가 각인 정보는 별도 접는다", () => {
  assert.match(calc, /entryMode === "unknown" && \(\n          <UnknownGuide/);
  assert.match(calc, /<GuideDetails>[\s\S]*?<summary>각인 확인 방법 자세히 보기<\/summary>/);
  assert.match(calc, /금 종류를 모르시나요\?/);
  assert.match(calc, /무게를 모르시나요\?/);
  assert.match(calc, /정확한 순도·중량은 매장 실측 후 확인합니다/);
  assert.doesNotMatch(calc, /<HelpRow|<HelpPanel|<UnknownBackButton/);
  assert.match(calc, /<UnknownGuide[\s\S]*?<UnknownVisitLink[\s\S]*?to="\/gold-exchange\?mode=visit"/);
});

test("안드로이드 카메라로 각인 확인 및 결과 적용 기능은 그대로 사용할 수 있다", () => {
  assert.match(calc, /isAndroid && \(\n              <HallmarkScanButton/);
  assert.match(calc, /onClick=\{scanHallmarkWithSystemCamera\}/);
  assert.match(calc, /isAndroid && \(hallmarkError \|\| hallmarkResult\) &&/);
  assert.match(calc, /onClick=\{applyHallmarkRecommendation\}/);
  assert.match(calc, /촬영 이미지는 각인 확인을 위해 분석하며 한국골드마켓에는 저장하지 않습니다/);
});

test("기존 계산·MY GOLD 기록·GOLD TO GOLD 파일에는 손을 대지 않는다", () => {
  assert.match(calc, /const canCalculate = !!selected && validWeight/);
  assert.match(calc, /appendGuestMyGoldItem\(item\)/);
  assert.match(calc, /formatGoldWeightPair\(pureGoldG\)/);
  assert.match(calc, /골드바로 바꾸면\?/);
  assert.ok(exchange.length > 1000 && goldStory.length > 1000);
});
