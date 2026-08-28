// src/pages/AppHome.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  BellRing,
  Calculator,
  ChevronRight,
  ClipboardList,
  Gift,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import AppGoldPriceSummary from "@/components/gold/AppGoldPriceSummary";
import { useAuthContext } from "@/context/AuthContext";
import { getMemberBonusStatus } from "@/services/quizClient";

const Page = styled.div`
  display: grid;
  gap: 14px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 2px 0 14px;
`;

const ExchangeHero = styled.section`
  position: relative;
  overflow: hidden;
  padding: 24px 20px 20px;
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: ${({ theme }) => theme.shadows.card};

  &::after {
    content: "999.9";
    position: absolute;
    top: 18px;
    right: -15px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 12%, transparent);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 4.8rem;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }
`;

const HeroKicker = styled.p`
  position: relative;
  z-index: 1;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.11em;
`;

const HeroTitle = styled.h1`
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin: 0;
  color: inherit;
  font-size: clamp(1.75rem, 7.2vw, 2.65rem);
  line-height: 1.16;
  letter-spacing: -0.045em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.goldLight};
    font-style: normal;
  }
`;

const HeroLead = styled.p`
  position: relative;
  z-index: 1;
  max-width: 540px;
  margin: 12px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 80%, transparent);
  font-size: 0.83rem;
  line-height: 1.62;
  word-break: keep-all;
`;

const PrimaryAction = styled(Link)`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  margin-top: 19px;
  padding: 13px 15px 13px 17px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.gold};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.96rem;
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

const TrustLine = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 7px 12px;
  margin-top: 12px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: 0.66rem;
  font-weight: 750;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  svg {
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const SectionCard = styled.section`
  padding: 17px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const SectionHead = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  div {
    min-width: 0;
  }

  small {
    display: block;
    margin-bottom: 3px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.61rem;
    font-weight: 900;
    letter-spacing: 0.09em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.08rem;
    line-height: 1.35;
  }
`;

const MenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
`;

const MenuLink = styled(Link)`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 14px;
  gap: 9px;
  align-items: center;
  min-height: 82px;
  padding: 12px 10px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  > span:first-child {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  > span:first-child svg {
    width: 19px;
    height: 19px;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.77rem;
    line-height: 1.3;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    line-height: 1.35;
  }

  > svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.textLight};
  }

  @media (max-width: 370px) {
    grid-template-columns: 34px minmax(0, 1fr) 12px;
    gap: 7px;
    padding-inline: 8px;
  }
`;

const AccountCard = styled.section`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 480px) {
    grid-template-columns: 42px minmax(0, 1fr);
  }
`;

const AccountIcon = styled.span`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const AccountCopy = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.84rem;
    line-height: 1.35;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.67rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const AccountLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.7rem;
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 480px) {
    grid-column: 1 / -1;
    width: 100%;
  }
`;

const RewardBanner = styled(Link)`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 18px;
  gap: 11px;
  align-items: center;
  padding: 15px 16px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 40%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  > span:first-child {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.gold};
    color: ${({ theme }) => theme.colors.primary};
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.82rem;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.65rem;
    line-height: 1.4;
  }

  > svg {
    width: 17px;
    height: 17px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const PushCard = styled.section`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 15px 16px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};

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
  background: ${({ theme }) => theme.colors.primaryLight};
  color: ${({ theme }) => theme.colors.primary};

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
    font-size: 0.8rem;
    line-height: 1.4;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.65rem;
    line-height: 1.4;
    word-break: keep-all;
  }
`;

const PushLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 38px;
  padding: 8px 10px;
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.69rem;
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
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const FooterNote = styled.p`
  margin: -2px 4px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.62rem;
  line-height: 1.45;
  text-align: center;
`;

export default function AppHome() {
  const { user } = useAuthContext() || {};
  const [bonusStatus, setBonusStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!user?.uid) {
      setBonusStatus(null);
      return () => {
        cancelled = true;
      };
    }

    getMemberBonusStatus()
      .then((next) => {
        if (!cancelled) setBonusStatus(next || null);
      })
      .catch(() => {
        if (!cancelled) setBonusStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const rewards = bonusStatus?.rewards || {};
  const earnedG = Number(bonusStatus?.earnedG || 0);
  const welcomeClaimed = !!rewards.welcome?.claimed;
  const quizClaimed = !!rewards.quiz?.claimed;
  const marketingClaimed = !!rewards.marketingPush?.claimed;

  const nextReward = !user
    ? {
        to: "/register",
        title: "회원가입하고 순금 0.01g 받기",
        text: "이메일 인증을 완료하면 계정당 1회 적립됩니다.",
        action: "0.01g 받기",
      }
    : !welcomeClaimed
      ? {
          to: "/welcome",
          title: "회원가입 혜택 0.01g 받기",
          text: "이메일 인증을 완료하면 웰컴 순금이 적립됩니다.",
          action: "0.01g 받기",
        }
      : !quizClaimed
        ? {
            to: "/quiz/gold-bonus",
            title: `내 순금 혜택 ${earnedG.toFixed(2)}g`,
            text: "퀵퀴즈를 풀고 순금 0.01g을 더 받을 수 있습니다.",
            action: "0.01g 더 받기",
          }
        : !marketingClaimed
          ? {
              to: "/settings",
              title: `내 순금 혜택 ${earnedG.toFixed(2)}g`,
              text: "금시세 알림을 설정하고 순금 0.01g을 더 받을 수 있습니다.",
              action: "0.01g 더 받기",
            }
          : {
              to: "/profile",
              title: `내 순금 혜택 ${earnedG.toFixed(2)}g`,
              text: "받은 순금 혜택과 사용 가능한 적립 순금을 확인하세요.",
              action: "혜택 확인",
            };

  return (
    <Page>
      <AppGoldPriceSummary />

      <ExchangeHero aria-labelledby="app-home-title">
        <HeroKicker>GOLD TO GOLD</HeroKicker>
        <HeroTitle id="app-home-title">
          가지고 있는 금,
          <br />
          <em>999.9 골드바로 바꿔보세요.</em>
        </HeroTitle>
        <HeroLead>
          14K·18K·순금의 중량을 입력하면 예상 순금 중량과 받을 수 있는
          골드바 조합을 바로 확인할 수 있습니다.
        </HeroLead>

        <PrimaryAction to="/gold-exchange">
          <span>
            <Calculator aria-hidden />
            내 금 계산하기
          </span>
          <ChevronRight aria-hidden />
        </PrimaryAction>

        <TrustLine>
          <span><ShieldCheck aria-hidden /> 로그인 없이 예상 계산</span>
          <span><ReceiptText aria-hidden /> 교환 수수료 없음</span>
        </TrustLine>
      </ExchangeHero>

      <SectionCard aria-labelledby="quick-menu-title">
        <SectionHead>
          <div>
            <small>QUICK MENU</small>
            <h2 id="quick-menu-title">필요한 기능으로 바로 이동</h2>
          </div>
        </SectionHead>

        <MenuGrid>
          <MenuLink to="/gold-price">
            <span><Scale aria-hidden /></span>
            <div>
              <strong>금시세</strong>
              <small>오늘 시세·과거 시세</small>
            </div>
            <ChevronRight aria-hidden />
          </MenuLink>

          <MenuLink to="/gold-exchange">
            <span><Calculator aria-hidden /></span>
            <div>
              <strong>금교환</strong>
              <small>예상 골드바 계산</small>
            </div>
            <ChevronRight aria-hidden />
          </MenuLink>

          <MenuLink to="/my-exchanges">
            <span><ClipboardList aria-hidden /></span>
            <div>
              <strong>예약 확인</strong>
              <small>신청·변경·진행 상태</small>
            </div>
            <ChevronRight aria-hidden />
          </MenuLink>

          <MenuLink to="/goldbar-fee">
            <span><ReceiptText aria-hidden /></span>
            <div>
              <strong>골드바 공임</strong>
              <small>규격별 제작 공임</small>
            </div>
            <ChevronRight aria-hidden />
          </MenuLink>
        </MenuGrid>
      </SectionCard>

      <AccountCard>
        <AccountIcon>
          <Gift aria-hidden />
        </AccountIcon>
        <AccountCopy>
          <strong>{nextReward.title}</strong>
          <p>{nextReward.text}</p>
        </AccountCopy>
        <AccountLink to={nextReward.to}>
          {nextReward.action}
          <ChevronRight aria-hidden />
        </AccountLink>
      </AccountCard>

      <RewardBanner to="/quiz/gold-bonus">
        <span><Sparkles aria-hidden /></span>
        <div>
          <strong>
            {quizClaimed
              ? "퀵퀴즈 완료 · 순금 0.01g 받음"
              : "퀵퀴즈 풀고 순금 0.01g 더 받기"}
          </strong>
          <small>
            {quizClaimed
              ? "받은 혜택은 내 정보에서 확인할 수 있습니다."
              : "금 상식 5문제를 모두 맞히면 받을 수 있습니다."}
          </small>
        </div>
        <ChevronRight aria-hidden />
      </RewardBanner>

      <PushCard>
        <PushIcon><BellRing aria-hidden /></PushIcon>
        <PushCopy>
          <strong>
            {marketingClaimed
              ? "금시세 알림 설정 완료"
              : "금시세 알림 받고 0.01g 더 받기"}
          </strong>
          <p>
            {marketingClaimed
              ? "주요 시세 변동과 혜택을 현재 기기로 받아봅니다."
              : "주요 금시세 변동과 혜택을 놓치지 마세요."}
          </p>
        </PushCopy>
        <PushLink to={user ? "/settings" : "/register"}>
          {marketingClaimed ? "알림 관리" : user ? "0.01g 더 받기" : "회원가입"}
          <ChevronRight aria-hidden />
        </PushLink>
      </PushCard>

      <FooterNote>
        실제 교환 중량과 비용은 매장 실측 후 최종 확인합니다.
      </FooterNote>
    </Page>
  );
}
