import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveGoldExchangeEntryMode } from "../src/lib/goldExchangeEntryMode.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exchange = read("src/pages/GoldExchange.jsx");
const steps = read("src/components/goldExchange/GoldExchangeSteps.jsx");

test("Android 앱 금교환 탭은 선택 게이트 없이 곧바로 계산 단계로 진입", () => {
  assert.equal(resolveGoldExchangeEntryMode({ nativeAndroid: true }), "manual");
  assert.equal(resolveGoldExchangeEntryMode({ nativeAndroid: false }), "");
  assert.match(exchange, /nativeAndroid: isNative && isAndroid/);
  assert.match(exchange, /!showStartMethod && step === STEP.CALC/);
});

test("기존 링크의 계산·실측·내 금 불러오기 및 모바일 복귀 모드는 보존", () => {
  for (const mode of ["manual", "visit", "vault"]) {
    assert.equal(resolveGoldExchangeEntryMode({ requestedEntryMode: mode, nativeAndroid: true }), mode);
    assert.equal(resolveGoldExchangeEntryMode({ requestedEntryMode: mode, nativeAndroid: false }), mode);
  }
  assert.equal(resolveGoldExchangeEntryMode({ importedFromMyGold: true, nativeAndroid: true }), "vault");
  assert.equal(resolveGoldExchangeEntryMode({ importedFromMyGold: true, nativeAndroid: false }), "vault");
});

test("앱 계산 화면은 MY GOLD 불러오기·현장 확인 예약을 대체 행동으로 남긴다", () => {
  assert.match(exchange, /onImportMyGold=\{\(\) => chooseStartMethod\("vault"\)\}/);
  assert.match(exchange, /showVaultImportAction=\{isNative && isAndroid && entryMode !== "vault"\}/);
  assert.match(steps, /showVaultImportAction && \(/);
  assert.match(steps, /MY GOLD에 기록한 금 불러오기/);
  assert.match(steps, /순도·무게를 잘 모르겠다면 현장 확인 예약으로 전환/);
  assert.match(exchange, /navigate\("\/gold-exchange\?mode=visit"/);
});

test("서버 예약, 가격/순금 환산, 기존 웹 시작 카드 분기는 건드리지 않는다", () => {
  assert.match(exchange, /submitGoldExchangeGroup/);
  assert.match(exchange, /<StartMethodScreen onChoose=\{chooseStartMethod\} \/>/);
  assert.match(exchange, /const showStartMethod =/);
  assert.match(exchange, /authDraftRef/);
  assert.doesNotMatch(steps.slice(steps.indexOf('export function CalcStep'),steps.indexOf('export function BarStep')), /runTransaction|updateDoc|setDoc/);
});
