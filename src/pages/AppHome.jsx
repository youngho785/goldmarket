// src/pages/AppHome.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowRight,
  BellRing,
  Calculator,
  ChevronRight,
  ClipboardList,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";

const Page = styled.div`
  display: grid;
  gap: 14px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 2px 0 12px;
`;

const Hero = styled.section`
  position: relative;
  overflow: hidden;
  padding: 28px 22px 22px;
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: ${({ theme }) => theme.shadows.card};

  &::after {
    content: "0.01g";
    position: absolute;
    top: 22px;
    right: 18px;
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    border: 1px solid
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 72%, transparent);
    border-radius: 50%;
    background: color-mix(
      in srgb,
      ${({ theme }) => theme.colors.gold} 14%,
      transparent
    );
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.9rem;
    font-weight: 900;
  }
`;

const Kicker = styled.p`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.69rem;
  font-weight: 900;
  letter-spacing: 0.11em;
`;

const HeroTitle = styled.h1`
  max-width: calc(100% - 78px);
  margin: 0;
  color: inherit;
  font-size: clamp(1.95rem, 8.4vw, 3.15rem);
  line-height: 1.12;
  letter-spacing: -0.05em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.goldLight};
    font-style: normal;
  }

  @media (max-width: 390px) {
    max-width: 100%;
    padding-top: 72px;
  }
`;

const HeroLead = styled.p`
  max-width: 560px;
  margin: 14px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 81%, transparent);
  font-size: 0.9rem;
  line-height: 1.62;
  word-break: keep-all;
`;

const PrimaryAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  margin-top: 21px;
  padding: 13px 16px 13px 18px;
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.gold};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.98rem;
  font-weight: 900;
  text-decoration: none;

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  svg {
    width: 19px;
    height: 19px;
  }
`;

const HeroHint = styled.p`
  margin: 10px 2px 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
  font-size: 0.7rem;
  line-height: 1.45;
`;

const RewardCard = styled.section`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const RewardHead = styled.div`
  margin-bottom: 13px;

  small {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.64rem;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.12rem;
    line-height: 1.35;
  }
`;

const RewardFlow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const RewardStep = styled.div`
  min-width: 0;
  padding: 13px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background};

  span {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    margin-bottom: 8px;
    border-radius: 9px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 16px;
    height: 16px;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.79rem;
    line-height: 1.35;
  }

  b {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.8rem;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.67rem;
    line-height: 1.4;
  }
`;

const Total = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 12px 13px;
  border-radius: 11px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};

  span {
    font-size: 0.78rem;
    font-weight: 850;
  }

  strong {
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 1rem;
    font-weight: 900;
  }
`;

const QuickCard = styled.section`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const QuickTitle = styled.h2`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.08rem;
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const QuickLink = styled(Link)`
  display: grid;
  gap: 8px;
  min-height: 96px;
  padding: 13px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  > svg:first-child {
    width: 21px;
    height: 21px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.67rem;
    line-height: 1.4;
  }

  > svg:last-child {
    justify-self: end;
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const PushCard = styled.section`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 16px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 38%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  @media (max-width: 500px) {
    grid-template-columns: 40px minmax(0, 1fr);
  }
`;

const PushIcon = styled.span`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};

  svg {
    width: 19px;
    height: 19px;
  }
`;

const PushCopy = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.84rem;
    line-height: 1.4;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.69rem;
    line-height: 1.4;
    word-break: keep-all;
  }
`;

const PushLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 39px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.72rem;
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 500px) {
    grid-column: 1 / -1;
    width: 100%;
  }
`;

const FooterNote = styled.p`
  margin: -1px 4px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.65rem;
  line-height: 1.45;
  text-align: center;
`;

export default function AppHome() {
  const { user } = useAuthContext() || {};

  return (
    <Page>
      <Hero aria-labelledby="app-home-title">
        <Kicker>1 MINUTE GOLD QUIZ</Kicker>

        <HeroTitle id="app-home-title">
          퀵퀴즈 풀고
          <br />
          <em>순금 0.01g 받기</em>
        </HeroTitle>

        <HeroLead>
          금에 관한 기초 퀴즈 5문제를 모두 맞히면 순금 0.01g 혜택을 드립니다.
          먼저 풀어보고, 통과한 뒤 회원가입해도 됩니다.
        </HeroLead>

        <PrimaryAction to="/quiz/gold-bonus">
          <span>
            <Sparkles aria-hidden />
            퀵퀴즈 시작하기
          </span>
          <ArrowRight aria-hidden />
        </PrimaryAction>

        <HeroHint>
          퀴즈 통과 → 회원가입 → 알림 설정(선택)으로 신규회원 최대 순금 0.03g
        </HeroHint>
      </Hero>

      <RewardCard aria-labelledby="reward-title">
        <RewardHead>
          <small>NEW MEMBER BENEFIT</small>
          <h2 id="reward-title">0.01g에서 0.03g까지</h2>
        </RewardHead>

        <RewardFlow>
          <RewardStep>
            <span>
              <Sparkles aria-hidden />
            </span>
            <strong>퀵퀴즈 5/5</strong>
            <b>+0.01g</b>
            <small>회원가입 전에도 먼저 참여</small>
          </RewardStep>

          <RewardStep>
            <span>
              <UserPlus aria-hidden />
            </span>
            <strong>회원가입</strong>
            <b>+0.01g</b>
            <small>신규회원 웰컴 혜택</small>
          </RewardStep>

          <RewardStep>
            <span>
              <BellRing aria-hidden />
            </span>
            <strong>금시세·혜택 알림</strong>
            <b>+0.01g</b>
            <small>선택 설정 · 계정당 1회</small>
          </RewardStep>
        </RewardFlow>

        <Total>
          <span>신규회원 최대 혜택</span>
          <strong>순금 0.03g</strong>
        </Total>
      </RewardCard>

      <QuickCard>
        <QuickTitle>바로가기</QuickTitle>

        <QuickGrid>
          <QuickLink to="/gold-price">
            <TrendingUp aria-hidden />
            <div>
              <strong>오늘 금시세</strong>
              <small>시세 페이지에서 확인</small>
            </div>
            <ChevronRight aria-hidden />
          </QuickLink>

          <QuickLink to="/gold-exchange">
            <Calculator aria-hidden />
            <div>
              <strong>내 금 계산</strong>
              <small>999.9 골드바 교환 예상</small>
            </div>
            <ChevronRight aria-hidden />
          </QuickLink>

          <QuickLink to="/my-exchanges">
            <ClipboardList aria-hidden />
            <div>
              <strong>예약 현황</strong>
              <small>신청·변경·진행 확인</small>
            </div>
            <ChevronRight aria-hidden />
          </QuickLink>
        </QuickGrid>
      </QuickCard>

      <PushCard>
        <PushIcon>
          <BellRing aria-hidden />
        </PushIcon>

        <PushCopy>
          <strong>금시세 변동과 새로운 소식을 알림으로</strong>
          <p>
            금시세 주요 변동, 새 서비스·혜택, 예약 안내를 원하는 경우에 받아보세요.
          </p>
        </PushCopy>

        <PushLink to={user ? "/settings" : "/register"}>
          {user ? "알림 설정" : "회원가입"}
          <ChevronRight aria-hidden />
        </PushLink>
      </PushCard>

      <FooterNote>
        금시세·혜택 알림은 선택 사항이며, 알림 권한은 사용자가 직접 설정할 때 요청합니다.
      </FooterNote>
    </Page>
  );
}
