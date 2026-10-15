import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, MessageCircleQuestion, ShieldCheck } from "lucide-react";

import GoldExchangeReviewList from "@/components/reviews/GoldExchangeReviewList";

const Section = styled.section`
display:grid; gap:24px; padding:28px 0; border:0; border-top:1px solid var(--gm-border); border-bottom:1px solid var(--gm-border); background:transparent; box-shadow:none;
`;

const Head = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: ${({ $compact }) => ($compact ? "9px" : "18px")};

  @media (max-width: 620px) {
    ${({ $compact }) =>
      $compact
        ? `
          align-items: start;
          flex-direction: row;
          gap: 8px;
        `
        : `
          align-items: stretch;
          flex-direction: column;
          gap: 9px;
        `}
  }
`;

const Copy = styled.div`
small { display:inline-flex; align-items:center; gap:7px; color:var(--gm-text-secondary); font-size:10px; font-weight:500; letter-spacing:.12em; }
    h2 { margin:12px 0 0; color:var(--gm-primary); font-family:inherit; font-size:clamp(24px,3vw,34px); font-weight:500; line-height:1.4; letter-spacing:-.05em; }
    p { margin:10px 0 0; color:var(--gm-text-secondary); font-size:12px; line-height:1.8; }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

const Action = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: ${({ $compact }) => ($compact ? "32px" : "39px")};
  padding: ${({ $compact }) => ($compact ? "6px 8px" : "8px 11px")};
  border: 1px solid ${({ $primary, theme }) => ($primary ? theme.colors.primary : theme.colors.border)};
  border-radius: 11px;
  background: ${({ $primary, theme }) => ($primary ? theme.colors.primary : theme.colors.surfaceAlt)};
  color: ${({ $primary, theme }) => ($primary ? theme.on.primary : theme.colors.primary)};
  font-size: ${({ $compact }) => ($compact ? ".63rem" : ".7rem")};
  font-weight: 900;
  text-decoration: none;

  svg { width: 14px; height: 14px; }
`;

export default function VerifiedReviewSection({ compact = false, showInquiryAction = true }) {
  return (
    <Section $compact={compact} aria-labelledby={compact ? "home-review-title" : "verified-review-title"}>
      <Head $compact={compact}>
        <Copy $compact={compact}>
          <small><ShieldCheck aria-hidden /> VERIFIED REVIEW</small>
          <h2 id={compact ? "home-review-title" : "verified-review-title"}>실제로 가치를 이어간 고객들</h2>
          {!compact ? <p>실제 금교환이 완료된 고객이 남긴 후기만 공개됩니다.</p> : null}
        </Copy>
        <Actions>
          <Action to="/reviews" $compact={compact}>후기 전체보기 <ArrowRight aria-hidden /></Action>
          {showInquiryAction ? (
            <Action to="/support/new" $primary $compact={compact}>
              <MessageCircleQuestion aria-hidden /> 1:1 문의
            </Action>
          ) : null}
        </Actions>
      </Head>

      <GoldExchangeReviewList
        limitCount={1}
        compact={compact}
        preview
        showSummary={false}
      />
    </Section>
  );
}
