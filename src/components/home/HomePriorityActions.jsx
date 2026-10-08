import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, Gem, Plus } from "lucide-react";

// 회원 홈에서 가장 자주 쓰는 두 가지 행동만 먼저 보여줍니다.
// 계산·교환·예약의 데이터 처리 방식은 여기에서 변경하지 않습니다.
const Panel = styled.section`
  display: grid;
  gap: 10px;
  padding: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Heading = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  line-height: 1.4;
  font-weight: 900;
`;

const Links = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const Action = styled(Link)`
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  min-height: 76px;
  padding: 13px;
  border: 1px solid ${({ $primary, theme }) => $primary ? theme.colors.primary : theme.colors.border};
  border-radius: 13px;
  background: ${({ $primary, theme }) => $primary ? theme.colors.primary : theme.semantic.badgeGoldBg};
  color: ${({ $primary, theme }) => $primary ? theme.colors.white : theme.colors.text};
  text-decoration: none;

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.gold};
    outline-offset: 2px;
  }

  > svg:first-child { width: 20px; height: 20px; flex: 0 0 auto; }
  > svg:last-child { width: 17px; height: 17px; flex: 0 0 auto; margin-left: auto; }
  span { flex: 1; min-width: 0; }
  strong { display: block; font-size: .94rem; font-weight: 900; line-height: 1.35; word-break: keep-all; }
  small { display: block; margin-top: 4px; font-size: .8rem; line-height: 1.45; word-break: keep-all; opacity: .9; }
`;

export default function HomePriorityActions() {
  return (
    <Panel aria-labelledby="home-priority-actions-title">
      <Heading id="home-priority-actions-title">지금 무엇을 하시겠어요?</Heading>
      <Links>
        <Action to="/my-gold/items?add=1" $primary>
          <Plus aria-hidden="true" />
          <span>
            <strong>내 금 추가하기</strong>
            <small>가지고 있는 금을 더 기록해요</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </Action>
        <Action to="/gold-exchange?mode=vault&auto=1">
          <Gem aria-hidden="true" />
          <span>
            <strong>골드바 교환 예상</strong>
            <small>기록한 금으로 가능한 양을 확인해요</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </Action>
      </Links>
    </Panel>
  );
}
