// src/pages/AppHome.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  BellRing,
  Calculator,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  ReceiptText,
  Scale,
  Sparkles,
  UserPlus,
} from "lucide-react";

import AppGoldPriceSummary from "@/components/gold/AppGoldPriceSummary";
import { useAuthContext } from "@/context/AuthContext";
import { getMemberBonusStatus } from "@/services/quizClient";

const Page = styled.div`
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 0 12px;
`;

const ExchangeCard = styled.section`
  position: relative;
  overflow: hidden;
  padding: 21px 18px 17px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 32%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  &::after {
    content: "G";
    position: absolute;
    right: -8px;
    bottom: -29px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 10%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 8.4rem;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }
`;

const ExchangeKicker = styled.div`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 9px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.08em;
`;

const ExchangeTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 11px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.48rem, 6.5vw, 2rem);
  line-height: 1.2;
  letter-spacing: -0.045em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-style: normal;
  }
`;

const ExchangeCopy = styled.p`
  position: relative;
  z-index: 1;
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.74rem;
  line-height: 1.55;
  word-break: keep-all;
`;

const ExchangeAction = styled(Link)`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 54px;
  margin-top: 15px;
  padding: 11px 13px 11px 15px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.9rem;
  font-weight: 900;
  text-decoration: none;
  box-shadow: 0 9px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 17%, transparent);

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

const Section = styled.section`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
`;

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }

  small {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.62rem;
    font-weight: 800;
  }
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
`;

const QuickLink = styled(Link)`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  min-height: 82px;
  padding: 8px 3px 5px;
  border-radius: 14px;
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  text-decoration: none;

  &:active {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  > span {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 15px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 1.9;
  }

  strong {
    display: block;
    max-width: 100%;
    font-size: 0.68rem;
    line-height: 1.25;
    word-break: keep-all;
  }

  @media (max-width: 350px) {
    > span {
      width: 40px;
      height: 40px;
      border-radius: 13px;
    }

    strong {
      font-size: 0.64rem;
    }
  }
`;

const BenefitCard = styled.section`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
`;

const BenefitHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 16px 14px;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.semantic.badgeGoldBg} 0%,
    ${({ theme }) => theme.colors.surface} 76%
  );

  small {
    display: block;
    margin-bottom: 3px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.61rem;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
  }
`;

const BenefitTotal = styled.div`
  flex: 0 0 auto;
  text-align: right;

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.6rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 1px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 1.05rem;
    line-height: 1.25;
  }
`;

const BenefitList = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const BenefitLink = styled(Link)`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 65px;
  padding: 10px 14px;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  }
`;

const BenefitIcon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: ${({ $done, theme }) =>
    $done ? theme.semantic.alertSuccessBg : theme.semantic.badgeGoldBg};
  color: ${({ $done, theme }) =>
    $done ? theme.semantic.alertSuccessText : theme.colors.secondaryDark};

  svg {
    width: 18px;
    height: 18px;
  }
`;

const BenefitCopy = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.77rem;
    line-height: 1.3;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    line-height: 1.35;
    word-break: keep-all;
  }
`;

const BenefitStatus = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 30px;
  padding: 6px 8px;
  border-radius: 999px;
  background: ${({ $done, theme }) =>
    $done ? theme.semantic.alertSuccessBg : theme.colors.primary};
  color: ${({ $done, theme }) =>
    $done ? theme.semantic.alertSuccessText : theme.colors.goldLight};
  font-size: 0.62rem;
  font-weight: 900;
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Note = styled.p`
  margin: -1px 5px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.6rem;
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

  const benefits = [
    {
      key: "welcome",
      to: user ? (welcomeClaimed ? "/profile" : "/welcome") : "/register",
      title: "회원가입",
      text: welcomeClaimed ? "순금 0.01g 혜택 완료" : "회원가입하고 순금 0.01g 받기",
      done: welcomeClaimed,
      icon: UserPlus,
    },
    {
      key: "quiz",
      to: "/quiz/gold-bonus",
      title: "금 상식 퀵퀴즈",
      text: quizClaimed ? "순금 0.01g 혜택 완료" : "5문제 맞히고 순금 0.01g 더 받기",
      done: quizClaimed,
      icon: Sparkles,
    },
    {
      key: "push",
      to: user ? "/settings" : "/register",
      title: "금시세 알림",
      text: marketingClaimed ? "순금 0.01g 혜택 완료" : "알림 설정하고 순금 0.01g 더 받기",
      done: marketingClaimed,
      icon: BellRing,
    },
  ];

  return (
    <Page>
      <AppGoldPriceSummary />

      <ExchangeCard aria-labelledby="app-home-title">
        <ExchangeKicker>GOLD TO GOLD</ExchangeKicker>
        <ExchangeTitle id="app-home-title">
          가지고 있는 금을
          <br />
          <em>999.9 골드바로</em>
        </ExchangeTitle>
        <ExchangeCopy>
          14K·18K·순금의 중량을 입력하고 예상 교환 결과를 바로 확인하세요.
        </ExchangeCopy>
        <ExchangeAction to="/gold-exchange">
          <span>
            <Calculator aria-hidden />
            내 금 계산하기
          </span>
          <ChevronRight aria-hidden />
        </ExchangeAction>
      </ExchangeCard>

      <Section aria-labelledby="quick-title">
        <SectionHead>
          <h2 id="quick-title">바로가기</h2>
          <small>자주 쓰는 메뉴</small>
        </SectionHead>
        <QuickGrid>
          <QuickLink to="/gold-price">
            <span><Scale aria-hidden /></span>
            <strong>금시세</strong>
          </QuickLink>
          <QuickLink to="/gold-exchange?reserve=1">
            <span><CalendarDays aria-hidden /></span>
            <strong>방문예약</strong>
          </QuickLink>
          <QuickLink to="/my-exchanges">
            <span><ClipboardList aria-hidden /></span>
            <strong>예약확인</strong>
          </QuickLink>
          <QuickLink to="/goldbar-fee">
            <span><ReceiptText aria-hidden /></span>
            <strong>골드바 공임</strong>
          </QuickLink>
        </QuickGrid>
      </Section>

      <BenefitCard aria-labelledby="benefit-title">
        <BenefitHead>
          <div>
            <small>MY GOLD BENEFIT</small>
            <h2 id="benefit-title">순금 혜택</h2>
          </div>
          <BenefitTotal>
            <span>{user ? "현재 적립" : "받을 수 있는 혜택"}</span>
            <strong>{user ? `${earnedG.toFixed(2)}g` : "최대 0.03g"}</strong>
          </BenefitTotal>
        </BenefitHead>

        <BenefitList>
          {benefits.map(({ key, to, title, text, done, icon: Icon }) => (
            <BenefitLink key={key} to={to}>
              <BenefitIcon $done={done}>
                {done ? <Check aria-hidden /> : <Icon aria-hidden />}
              </BenefitIcon>
              <BenefitCopy>
                <strong>{title}</strong>
                <small>{text}</small>
              </BenefitCopy>
              <BenefitStatus $done={done}>
                {done ? (
                  <>
                    <Check aria-hidden /> 받음
                  </>
                ) : (
                  "+0.01g"
                )}
              </BenefitStatus>
            </BenefitLink>
          ))}
        </BenefitList>
      </BenefitCard>

      <Note>실제 교환 중량과 비용은 매장 실측 후 최종 확인합니다.</Note>
    </Page>
  );
}
