import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { ANDROID_BACK_OVERLAY_EVENT } from "@/platform/androidBackRoute";
import styled from "styled-components";
import {
  AppPriceLinks,
  AppPricePrimary,
  AppPriceSecondary,
  AppPriceDisclaimer,
} from "./GoldPrice.styles";

// The previous native price experience showed all three purities side by side.
// Keep that glanceable comparison without the three tall stacked cards.
const CompactMarket = styled.div`
  margin-top: 6px;
  overflow: hidden;
  border: 1px solid rgba(15, 24, 32, .13);
  border-radius: 14px;
  background: #fff;

  .context { padding: 9px 11px; color: #5d626c; font-size: .76rem; font-weight: 750; }
  table { width: 100%; border-spacing: 0; table-layout: fixed; border-collapse: collapse; }
  col.label { width: 20%; }
  col.price { width: 26.666%; }
  th, td { padding: 11px 3px; text-align: center; border: 1px solid rgba(10, 22, 30, .08); }
  thead th { color: #14202b; font-size: .91rem; background: #f5f1e9; }
  thead th:first-child { background: #fff; font-size: .72rem; }
  thead th:nth-child(2) { background: #17212d; color: #ffe9ad; }
  tbody th { color: #59616b; background: #faf9f6; font-size: .72rem; font-weight: 800; }
  tbody th small { display: block; margin-top: 2px; font-size: .62rem; font-weight: 600; }
  tbody td { color: #18222d; font-size: clamp(.77rem, 3.45vw, 1rem); font-family: ${({ theme }) => theme.fonts.numeric};
    font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: -.045em; overflow-wrap: anywhere; }
  tbody tr.price-row td { font-size: clamp(.83rem, 3.65vw, 1.05rem); }
  tbody tr.trend-row td { color: #4d637c; font-size: clamp(.7rem, 2.85vw, .8rem); font-weight: 750; }
  .sell-note { font-size: .73rem; font-family: inherit; letter-spacing: -.02em; }
  @media (max-width: 355px) { th,td { padding: 9px 1px; } col.label { width: 19%; } }
`;

const DiscoveryCard = styled.section`
  display: grid;
  gap: 5px;
  margin-top: 12px;
  padding: 13px 14px;
  border: 1px solid rgba(204, 162, 76, 0.34);
  border-radius: 14px;
  background: linear-gradient(135deg, #fff7e8, #fff);
  color: #1b2129;
  small { color: #926716; font-size: .69rem; font-weight: 900; }
  strong { font-size: .98rem; line-height: 1.4; font-weight: 900; }
  p { margin: 0; color: #62656d; font-size: .74rem; line-height: 1.45; }
  .benefit-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; }
  .benefit-actions :is(a, button) { display: inline-flex; align-items: center; gap: 5px; justify-content: center;
    width: fit-content; min-height: 43px; padding: 9px 12px; border-radius: 9px;
    background: #17202a; color: #fff; text-decoration: none; font-size: .8rem; font-weight: 850;
    font-family: inherit; cursor: pointer; }
  .benefit-actions :is(a, button).secondary { background: transparent; border: 1px solid #ab873f; color: #533d16; }
`;

// Native app only: explain membership value before offering registration.
// The sheet is intentionally independent of marketing notification consent.
const BenefitBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 11000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(9, 16, 23, .62);
`;

const BenefitSheet = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-width: 540px;
  max-height: min(88dvh, 820px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 19px calc(20px + env(safe-area-inset-bottom, 0px));
  border-radius: 22px 22px 0 0;
  background: #fff;
  color: #18232c;
  box-shadow: 0 -12px 38px rgba(0, 0, 0, .19);
  &:focus { outline: none; }
  .sheet-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .sheet-kicker { font-size: .72rem; color: #91681e; font-weight: 900; letter-spacing: .03em; }
  h2 { margin: 5px 0 0; font-size: 1.28rem; letter-spacing: -.04em; line-height: 1.3; }
  .sheet-close { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px;
    flex: 0 0 auto; border: 0; border-radius: 12px; background: #f1f2f3; color: #28333f; cursor: pointer; }
  .sheet-lead { margin: 12px 0 0; color: #59626b; font-size: .89rem; line-height: 1.6; }
  .sheet-services { display: grid; gap: 10px; margin: 16px 0; padding: 0; list-style: none; }
  .sheet-services li { padding: 11px 12px; border-radius: 12px; background: #f7f8fa; }
  .sheet-services strong { display: block; font-size: .91rem; }
  .sheet-services span { display: block; margin-top: 4px; color: #59626b; font-size: .82rem; line-height: 1.55; }
  .sheet-reward { padding: 14px; border: 1px solid #ecd9b1; border-radius: 13px; background: #fffbf3; }
  .sheet-reward strong { display: block; color: #4d390e; font-size: .94rem; }
  .sheet-reward ul { margin: 8px 0 0; padding-left: 18px; font-size: .83rem; line-height: 1.85; }
  .sheet-note { margin: 9px 0 0; color: #5d646b; font-size: .76rem; line-height: 1.6; }
  .sheet-actions { display: grid; gap: 8px; margin-top: 16px; }
  .sheet-actions a, .sheet-actions button { display: flex; align-items: center; justify-content: center; min-height: 48px;
    width: 100%; box-sizing: border-box; border-radius: 12px; text-align: center; text-decoration: none;
    font-family: inherit; font-size: .91rem; font-weight: 850; cursor: pointer; }
  .sheet-actions a { border: 1px solid #1a2632; background: #1a2632; color: #fff; }
  .sheet-actions button { border: 1px solid #c8cdd3; background: #fff; color: #24313d; }
`;

const StoryLink = styled(Link)`
  display: grid;
  gap: 4px;
  margin-top: 9px;
  padding: 12px 14px;
  border: 1px solid rgba(204, 162, 76, 0.23);
  border-radius: 13px;
  background: #fff;
  text-decoration: none;
  color: #1e2732;
  small { color: #997027; font-size: .68rem; font-weight: 900; }
  strong { font-size: .85rem; line-height: 1.4; font-weight: 850; }
  span { font-size: .76rem; font-weight: 850; color: #976a20; }
`;

export default function NativeGoldPriceOverview({
  marketRows,
  pagePriceAvailable,
  isLoading,
  display14kSellPrice,
  isMember,
  registerPath,
  formatWon,
  changeInfo,
  changeText,
}) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const benefitTriggerRef = useRef(null);
  const benefitCloseRef = useRef(null);
  const benefitDialogRef = useRef(null);

  useEffect(() => {
    if (!benefitOpen) return undefined;
    const beforeOverflow = document.body.style.overflow;
    const beforeHideBottomNav = document.body.dataset.hideBottomNav;
    document.body.style.overflow = "hidden";
    document.body.dataset.hideBottomNav = "1";
    benefitCloseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setBenefitOpen(false);
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(benefitDialogRef.current?.querySelectorAll('button:not([disabled]), a[href]') || []);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const onAndroidBack = (event) => {
      event.preventDefault();
      setBenefitOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(ANDROID_BACK_OVERLAY_EVENT, onAndroidBack);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(ANDROID_BACK_OVERLAY_EVENT, onAndroidBack);
      document.body.style.overflow = beforeOverflow;
      if (beforeHideBottomNav === undefined) delete document.body.dataset.hideBottomNav;
      else document.body.dataset.hideBottomNav = beforeHideBottomNav;
      benefitTriggerRef.current?.focus();
    };
  }, [benefitOpen]);

  return (
    <>
      <CompactMarket aria-label="금 종류별 1돈 시세 비교표">
        <div className="context">24K · 18K · 14K 한눈에 · 1돈(3.75g) 기준 · 단위 원</div>
        <table>
          <colgroup><col className="label" /><col className="price" /><col className="price" /><col className="price" /></colgroup>
          <thead>
            <tr><th scope="col">구분</th>{marketRows.map((row) => <th key={row.short} scope="col">{row.short}</th>)}</tr>
          </thead>
          <tbody>
            <tr className="price-row"><th scope="row">팔 때</th>
              {marketRows.map((row) => (
                <td key={`buy-${row.short}`}>{pagePriceAvailable ? formatWon(row.buy) : "-"}</td>
              ))}
            </tr>
            <tr><th scope="row">살 때<small>VAT 포함</small></th>
              {marketRows.map((row) => (
                <td className={row.short === "14K" && !display14kSellPrice ? "sell-note" : undefined} key={`sell-${row.short}`}>
                  {!pagePriceAvailable ? "-" : row.short === "14K" && !display14kSellPrice ? "제품 시세" : formatWon(row.sell)}
                </td>
              ))}
            </tr>
            <tr className="trend-row"><th scope="row">전일 대비<small>팔 때</small></th>
              {marketRows.map((row) => {
                const trend = changeInfo(row.buy, row.previousBuy);
                const sign = trend?.diff > 0 ? "▲" : trend?.diff < 0 ? "▼" : "—";
                return (
                  <td key={`trend-${row.short}`} aria-label={pagePriceAvailable ? changeText(trend) : "시세 미공개"}>
                    {pagePriceAvailable ? trend ? `${sign} ${Math.abs(trend.percent).toFixed(2)}%` : "—" : isLoading ? "확인 중" : "-"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </CompactMarket>

      <AppPriceLinks aria-label="금시세 다음 행동">
        <AppPricePrimary to="/">내 금 가치 확인 <ArrowRight size={17} aria-hidden="true" /></AppPricePrimary>
        <AppPriceSecondary to="/gold-exchange">골드바 교환 계산</AppPriceSecondary>
      </AppPriceLinks>
      <AppPriceDisclaimer>
        실제 거래 금액은 매장 확인과 거래 시점에 따라 달라질 수 있습니다.
        {isMember && <Link to="/settings">금시세 알림 설정</Link>}
      </AppPriceDisclaimer>
      <DiscoveryCard aria-label="MEMBER GOLD 회원 혜택">
        <small>MEMBER GOLD · 회원 참여 혜택</small>
        <strong>금 퀵퀴즈도 풀고, 최대 순금 0.03g 혜택</strong>
        <p>가입 0.01g · 퀵퀴즈 0.01g · 금시세 알림 0.01g. 각각 지급 조건을 충족해야 합니다.</p>
        <div className="benefit-actions">
          <Link to={isMember ? "/member-gold" : "/quiz/gold-bonus"}>
            {isMember ? "내 혜택 확인" : "퀵퀴즈 참여"}<ArrowRight size={15} aria-hidden="true" />
          </Link>
          {isMember ? (
            <Link className="secondary" to="/settings">금시세 알림 참여</Link>
          ) : (
            <button
              ref={benefitTriggerRef}
              type="button"
              className="secondary"
              onClick={() => setBenefitOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={benefitOpen}
            >
              가입 후 알림 혜택
            </button>
          )}
        </div>
      </DiscoveryCard>
      {benefitOpen && typeof document !== "undefined" && createPortal(
        <BenefitBackdrop onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBenefitOpen(false);
        }}>
          <BenefitSheet
            ref={benefitDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-gold-benefits-title"
            aria-describedby="my-gold-benefits-lead"
          >
            <div className="sheet-top">
              <div>
                <div className="sheet-kicker">MY GOLD · 알림 혜택</div>
                <h2 id="my-gold-benefits-title">내 금의 변화, 놓치지 마세요.</h2>
              </div>
              <button
                type="button"
                className="sheet-close"
                aria-label="혜택 안내 닫기"
                ref={benefitCloseRef}
                onClick={() => setBenefitOpen(false)}
              ><X size={22} aria-hidden="true" /></button>
            </div>
            <p className="sheet-lead" id="my-gold-benefits-lead">
              MY GOLD에 금을 기록하면, 가치 변화를 확인하고 원하는 목표에 도달했을 때 알림을 받을 수 있어요.
            </p>
            <ul className="sheet-services">
              <li><strong>주요 금시세 변동 알림</strong><span>새 금시세가 공개될 때, 주요 시세 변동 소식을 받아볼 수 있어요.</span></li>
              <li><strong>매주 내 금 소식</strong><span>지난주보다 내 금의 예상 가치가 얼마나 달라졌는지 알려드려요.</span></li>
              <li><strong>원하는 금 가격 알림</strong><span>순금 1돈 가격이 설정한 상승·하락 가격에 도달하면 알려드려요.</span></li>
              <li><strong>내 금 가치 알림</strong><span>기록한 금의 예상 가치가 설정 금액에 도달하면 알려드려요.</span></li>
              <li><strong>골드바 교환 목표 알림</strong><span>원하는 골드바로 교환 가능한 예상 금량에 도달하면 알려드려요.</span></li>
            </ul>
            <div className="sheet-reward">
              <strong>회원가입하고 최대 순금 0.03g 혜택도 확인해 보세요.</strong>
              <ul>
                <li>회원가입 및 이메일 인증 · 0.01g</li>
                <li>금시세·혜택 알림 참여 · 0.01g</li>
                <li>금 퀵퀴즈 완료 · 0.01g</li>
              </ul>
            </div>
            <p className="sheet-note">
              각 순금 혜택은 조건 충족 시 제공되며 MEMBER GOLD로 별도 관리됩니다.
              금시세 변동 소식은 시세 공개 시 관리자가 알림 발송을 선택한 경우에 전송됩니다.
              목표 가격 알림은 정기 점검 방식으로 실시간 알림이 아닙니다.
              알림 수신은 선택 사항이며 가입만으로 자동 동의되지 않습니다.
            </p>
            <div className="sheet-actions">
              <Link
                to={registerPath}
                state={{ from: "/gold-price", intent: "gold-price-notification" }}
                onClick={() => setBenefitOpen(false)}
              >가입하고 혜택 시작하기</Link>
              <button type="button" onClick={() => setBenefitOpen(false)}>다음에 알아보기</button>
            </div>
          </BenefitSheet>
        </BenefitBackdrop>,
        document.body
      )}
      <StoryLink to="/gold-to-gold" aria-label="GOLD TO GOLD 이야기 보기">
        <small>GOLD TO GOLD · 가치의 이야기</small>
        <strong>쓰임은 달라져도 금의 가치는 이어집니다.</strong>
        <span>골드바 교환에 담긴 이야기 보기 →</span>
      </StoryLink>
    </>
  );
}
