// KoreaGoldMarket · shared service confidence module.
// Factual process explanation only: no fictional certification, review count, or guarantee.
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowUpRight, ClipboardCheck, MapPin, Scale, ShieldCheck } from "lucide-react";

const Panel = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(230px, 1.05fr) minmax(0, 1.95fr);
  gap: clamp(16px, 3vw, 30px);
  align-items: center;
  margin: ${({ $compact }) => $compact ? "20px 0 12px" : "20px 0 22px"};
  padding: ${({ $compact }) => $compact ? "20px 22px" : "clamp(22px, 3.5vw, 34px)"};
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background:
    radial-gradient(circle at 4% 0%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 13%, transparent), transparent 41%),
    ${({ theme }) => theme.colors.surface};
  box-shadow: 0 14px 34px color-mix(in srgb, ${({ theme }) => theme.colors.primaryDark} 8%, transparent);

  &::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: ${({ theme }) => theme.gradients.gold};
  }

  @media (max-width: 900px) { grid-template-columns: 1fr; gap: 14px; }
  @media (max-width: 560px) { padding: 19px 16px; border-radius: 18px; margin: 16px 0; }
`;

const Intro = styled.div`
  display: grid;
  gap: 6px;
  align-content: center;

  small {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .69rem;
    font-weight: 900;
    letter-spacing: .03em;
  }
  small svg { width: 15px; height: 15px; }
  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.17rem, 2.3vw, 1.45rem);
    line-height: 1.36;
    letter-spacing: -.035em;
    word-break: keep-all;
  }
  p { margin: 0; font-size: .79rem; line-height: 1.65; color: ${({ theme }) => theme.colors.textSecondary}; }
  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    width: fit-content;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .78rem;
    font-weight: 850;
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.colors.secondary};
    text-underline-offset: 4px;
  }
  a svg { width: 15px; height: 15px; }
`;

const Proofs = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 620px) { grid-template-columns: 1fr; gap: 8px; }
`;

const Proof = styled.div`
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
  min-height: 134px;
  padding: 15px 13px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 14px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surfaceAlt} 46%, ${({ theme }) => theme.colors.surface});
  > svg { width: 22px; height: 22px; color: ${({ theme }) => theme.colors.secondaryDark}; }
  strong { color: ${({ theme }) => theme.colors.primary}; font-size: .83rem; line-height: 1.38; }
  span { color: ${({ theme }) => theme.colors.textSecondary}; font-size: .72rem; line-height: 1.5; word-break: keep-all; }

  @media (max-width: 620px) {
    grid-template-columns: 30px minmax(0, 1fr);
    column-gap: 9px;
    row-gap: 2px;
    align-content: center;
    min-height: auto;
    padding: 10px 12px;
    > svg { grid-row: 1 / span 2; align-self: center; }
  }
`;

export default function TrustProofBar({ compact = false }) {
  return (
    <Panel $compact={compact} aria-label="한국골드마켓 이용 신뢰 안내">
      <Intro>
        <small><MapPin aria-hidden="true" /> 부산 원일귀금속 직접 운영</small>
        <strong>금은 소중하니까, 과정은 더 투명하게.</strong>
        {!compact && <p>처음이셔도 괜찮습니다. 예상 금량부터 매장 확인까지 차근차근 안내합니다.</p>}
        <Link to="/stores">매장 위치·이용 안내 <ArrowUpRight aria-hidden="true" /></Link>
      </Intro>
      <Proofs>
        <Proof>
          <Scale aria-hidden="true" />
          <strong>먼저 예상 확인</strong>
          <span>온라인 계산은 참고값이며, 실제 중량·순도와 구분합니다.</span>
        </Proof>
        <Proof>
          <ClipboardCheck aria-hidden="true" />
          <strong>비용 미리 안내</strong>
          <span>선택한 골드바의 예상 제작공임과 조건을 확인합니다.</span>
        </Proof>
        <Proof>
          <ShieldCheck aria-hidden="true" />
          <strong>실측·동의 후 확정</strong>
          <span>매장에서 실물을 확인하고 고객 동의 후 교환합니다.</span>
        </Proof>
      </Proofs>
    </Panel>
  );
}
