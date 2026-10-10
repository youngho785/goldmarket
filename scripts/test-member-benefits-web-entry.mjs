import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const navbar = read("src/components/common/Navbar.jsx");
const price = read("src/pages/GoldPrice.jsx");
const modal = read("src/components/common/MemberBenefitsDialog.jsx");

test("웹 로그인 옆 기존 '내 금 확인' 버튼은 회원혜택 안내로 바뀐다", () => {
  assert.doesNotMatch(navbar, /<AccountLink to="\/gold-value">내 금 확인<\/AccountLink>/);
  assert.match(navbar, /<MenuLink to="\/login" end>로그인<\/MenuLink>/);
  assert.match(navbar, /<AccountLink[\s\S]*?openBenefitGuide\("desktop"\)[\s\S]*?>🎁 회원혜택<\/AccountLink>/);
  assert.match(navbar, /<DrawerBenefitButton[\s\S]*?openBenefitGuide\("mobile"\)[\s\S]*?>🎁 회원혜택<\/DrawerBenefitButton>/);
  assert.match(navbar, /<MemberBenefitsDialog[\s\S]*registerPath="\/register"/);
});

test("웹 금시세의 비회원 알림 가입 유도도 혜택 안내를 먼저 연다", () => {
  assert.match(price, /회원혜택 먼저 알아보기/);
  assert.match(price, /onClick=\{\(\) => setBenefitOpen\(true\)\}/);
  assert.match(price, /<MemberBenefitsDialog[\s\S]*registerPath=\{registerPath\}/);
  assert.doesNotMatch(price, /간편가입하고 알림 받기/);
});

test("안내를 읽은 뒤 선택할 때만 가입으로 이동하고 닫을 수 있다", () => {
  assert.match(modal, /role="dialog" aria-modal="true"/);
  assert.match(modal, /if \(event\.key === "Escape"\)/);
  assert.match(modal, /document\.addEventListener\("keydown", onKeyDown\)/);
  assert.match(modal, /<Link to=\{registerPath\}[\s\S]*가입하고 혜택 시작하기/);
  assert.match(modal, /다음에 알아보기/);
  assert.match(modal, /@media \(max-width: 700px\)/);
});

test("앱 기존 알림 안내와 웹 회원혜택은 내용과 조건이 같다", () => {
  for (const label of [
    "주요 금시세 변동 알림", "매주 내 금 소식", "원하는 금 가격 알림",
    "내 금 가치 알림", "골드바 교환 목표 알림", "최대 순금 0.03g",
    "회원가입 및 이메일 인증 · 0.01g", "금시세·혜택 알림 참여 · 0.01g", "금 퀵퀴즈 완료 · 0.01g",
  ]) assert.ok(modal.includes(label), `빠진 혜택: ${label}`);
  assert.match(modal, /정기 점검 방식으로 실시간 알림이 아닙니다/);
  assert.match(modal, /알림 수신은 선택 사항이며 회원가입만으로 자동 동의되지 않습니다/);
});
