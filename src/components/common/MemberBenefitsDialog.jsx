import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import styled from "styled-components";

// Web header / web gold-price use the same factual guide as the native gold-price sheet.
// Giving information is NOT granting notification consent or awarding MEMBER GOLD.
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 11000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(9, 16, 23, .62);
  @media (max-width: 700px) {
    align-items: flex-end;
    padding: 0;
  }
`;

const Panel = styled.section`
  box-sizing: border-box;
  width: min(100%, 590px);
  max-height: min(90dvh, 820px);
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 20px;
  padding: 23px;
  background: #fff;
  color: #18232c;
  box-shadow: 0 16px 56px rgba(0, 0, 0, .24);
  .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .kicker { font-size: .73rem; font-weight: 900; color: #926716; }
  h2 { margin: 5px 0 0; font-size: clamp(1.2rem, 3vw, 1.45rem); line-height: 1.3; letter-spacing: -.04em; }
  .close { display: grid; place-items: center; flex: 0 0 auto; width: 44px; height: 44px;
    border: 0; border-radius: 10px; background: #f1f2f3; color: #28333f; cursor: pointer; }
  .lead { margin: 12px 0; font-size: .9rem; line-height: 1.6; color: #59626b; }
  .services { display: grid; gap: 8px; margin: 15px 0; padding: 0; list-style: none; }
  .services li { padding: 10px 12px; border-radius: 10px; background: #f7f8fa; }
  .services strong { display: block; font-size: .91rem; }
  .services span { display: block; margin-top: 4px; font-size: .82rem; line-height: 1.55; color: #59626b; }
  .rewards { border: 1px solid #ecd9b1; border-radius: 12px; padding: 13px; background: #fffbf3; }
  .rewards strong { display: block; font-size: .95rem; color: #4d390e; }
  .rewards ul { padding-left: 20px; margin: 8px 0 0; font-size: .84rem; line-height: 1.8; }
  .note { margin: 10px 0 0; font-size: .77rem; line-height: 1.6; color: #5d646b; }
  .actions { display: grid; gap: 9px; margin-top: 15px; }
  .actions a, .actions button { display: flex; align-items: center; justify-content: center;
    width: 100%; min-height: 48px; box-sizing: border-box; border-radius: 11px;
    font-family: inherit; font-size: .91rem; font-weight: 850; text-decoration: none; cursor: pointer; }
  .actions a { border: 1px solid #1a2632; background: #1a2632; color: #fff; }
  .actions button { border: 1px solid #c8cdd3; background: #fff; color: #24313d; }
  @media (max-width: 700px) {
    width: 100%; max-height: 88dvh; border-radius: 20px 20px 0 0;
    padding: 19px 18px calc(19px + env(safe-area-inset-bottom, 0px));
  }
`;

export default function MemberBenefitsDialog({ open, onClose, triggerRef, registerPath = "/register" }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(dialogRef.current?.querySelectorAll('button:not([disabled]), a[href]') || []);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef?.current?.focus?.();
    };
  }, [open, onClose, triggerRef]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <Overlay onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <Panel ref={dialogRef} role="dialog" aria-modal="true"
        aria-labelledby="web-member-benefits-title" aria-describedby="web-member-benefits-lead">
        <div className="top">
          <div>
            <span className="kicker">MY GOLD · 회원혜택</span>
            <h2 id="web-member-benefits-title">내 금의 변화, 놓치지 마세요.</h2>
          </div>
          <button ref={closeRef} type="button" className="close" aria-label="혜택 안내 닫기" onClick={onClose}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p id="web-member-benefits-lead" className="lead">
          MY GOLD에 금을 기록하면 가치 변화를 확인하고, 설정한 목표에 도달했을 때 알림을 받을 수 있어요.
        </p>
        <ul className="services">
          <li><strong>주요 금시세 변동 알림</strong><span>새 금시세가 공개될 때, 주요 시세 변동 소식을 받아볼 수 있어요.</span></li>
          <li><strong>매주 내 금 소식</strong><span>지난주보다 내 금의 예상 가치가 얼마나 달라졌는지 알려드려요.</span></li>
          <li><strong>원하는 금 가격 알림</strong><span>순금 1돈 가격이 설정한 상승·하락 가격에 도달하면 알려드려요.</span></li>
          <li><strong>내 금 가치 알림</strong><span>기록한 금의 예상 가치가 설정 금액에 도달하면 알려드려요.</span></li>
          <li><strong>골드바 교환 목표 알림</strong><span>원하는 골드바로 교환 가능한 예상 금량에 도달하면 알려드려요.</span></li>
        </ul>
        <div className="rewards">
          <strong>회원가입하고 최대 순금 0.03g 혜택도 확인해 보세요.</strong>
          <ul>
            <li>회원가입 및 이메일 인증 · 0.01g</li>
            <li>금시세·혜택 알림 참여 · 0.01g</li>
            <li>금 퀵퀴즈 완료 · 0.01g</li>
          </ul>
        </div>
        <p className="note">
          각 혜택은 조건 충족 시 제공되며 MEMBER GOLD로 별도 관리됩니다.
          알림 혜택 0.01g은 수신 동의와 기기 푸시 등록 등 지급 조건을 충족해야 합니다.
          금시세 변동 소식은 관리자 시세 공개 시 알림 발송을 선택한 경우에 전송됩니다.
          목표 가격 알림은 정기 점검 방식으로 실시간 알림이 아닙니다.
          알림 수신은 선택 사항이며 회원가입만으로 자동 동의되지 않습니다.
        </p>
        <div className="actions">
          <Link to={registerPath} state={{ intent: "member-benefit" }} onClick={onClose}>
            가입하고 혜택 시작하기
          </Link>
          <button type="button" onClick={onClose}>다음에 알아보기</button>
        </div>
      </Panel>
    </Overlay>, document.body
  );
}
