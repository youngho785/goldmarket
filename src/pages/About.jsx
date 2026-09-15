import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowRight,
  BarChart3,
  Building2,
  NotebookPen,
  Repeat2,
  ShieldCheck,
} from "lucide-react";

const Page = styled.main`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 18px 0 48px;

  @media (max-width: 720px) {
    padding: 8px 0 24px;
  }
`;

const Hero = styled.header`
  padding: clamp(28px, 5vw, 52px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 72%, transparent);
  border-radius: 24px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 12px 30px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 13%, transparent);

  @media (max-width: 540px) {
    padding: 24px 18px;
    border-radius: 20px;
  }
`;

const BrandName = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
`;

const Title = styled.h1`
  max-width: 860px;
  margin: 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(2rem, 5.3vw, 3.65rem);
  line-height: 1.12;
  letter-spacing: -0.045em;
  word-break: keep-all;
`;

const Lead = styled.p`
  max-width: 790px;
  margin: 16px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 76%, transparent);
  font-size: clamp(0.94rem, 2vw, 1.05rem);
  line-height: 1.85;
  word-break: keep-all;
`;

const OperatorLine = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 22px 0 0;
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.82rem;
  font-weight: 800;
`;

const Section = styled.section`
  margin-top: 14px;
  padding: clamp(24px, 4vw, 40px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
`;

const SectionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.45rem, 3.3vw, 2rem);
  letter-spacing: -0.035em;
  word-break: keep-all;
`;

const SectionLead = styled.p`
  max-width: 780px;
  margin: 10px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.8;
  word-break: keep-all;
`;

const FlowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 24px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const FlowCard = styled.article`
  padding: 22px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  h3 {
    margin: 13px 0 7px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.03rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
    line-height: 1.7;
    word-break: keep-all;
  }
`;

const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 22px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const ServiceLink = styled(Link)`
  display: grid;
  min-height: 166px;
  padding: 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  transition:
    border-color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }

  strong {
    font-size: 1.08rem;
  }

  p {
    margin: 9px 0 18px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.86rem;
    line-height: 1.7;
    word-break: keep-all;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.8rem;
    font-weight: 850;
  }
`;

const TrustGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(280px, 0.88fr);
  gap: 12px;
  margin-top: 14px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const OperatorCard = styled.section`
  padding: clamp(24px, 4vw, 40px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 52%, white) 0%,
      ${({ theme }) => theme.colors.surfaceAlt} 72%
    );

  h2 {
    margin: 13px 0 10px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.38rem, 3vw, 1.85rem);
    letter-spacing: -0.03em;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.8;
    word-break: keep-all;
  }

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const Facts = styled.dl`
  display: grid;
  margin: 22px 0 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  div {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  }

  dt {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.76rem;
    font-weight: 800;
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.86rem;
    font-weight: 820;
    word-break: keep-all;
  }

  @media (max-width: 430px) {
    div {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  }
`;

const StoreLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.84rem;
  font-weight: 850;
  text-decoration: none;
`;

const Clarification = styled.aside`
  padding: clamp(24px, 4vw, 36px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  h2 {
    margin: 13px 0 10px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.25rem;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
    line-height: 1.8;
    word-break: keep-all;

    & + p {
      margin-top: 12px;
    }
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;

  @media (max-width: 560px) {
    display: grid;
  }
`;

const PrimaryAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 48px;
  padding: 10px 16px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.84rem;
  font-weight: 850;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.goldLight};
    filter: brightness(1.05);
  }
`;

const SecondaryAction = styled(PrimaryAction)`
  border-color: ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export default function About() {
  return (
    <Page>
      <Hero>
        <BrandName>한국골드마켓 · Korea Gold Market</BrandName>
        <Title>내 금의 가치를 확인하고, 기록하고, 이어갑니다.</Title>
        <Lead>
          한국골드마켓은 오늘 금시세 확인부터 보유 금의 가치 기록·관리,
          999.9 골드바 교환까지 하나의 흐름으로 연결하는 금 생활 플랫폼입니다.
        </Lead>
        <OperatorLine>
          <Building2 size={16} aria-hidden />
          원일귀금속 직접 운영 · 부산 범천동 골드테마거리
        </OperatorLine>
      </Hero>

      <Section>
        <SectionTitle>금의 가치를 하나의 흐름으로</SectionTitle>
        <SectionLead>
          금은 가지고 있는 동안에도 가치가 계속 움직입니다. 한국골드마켓은
          오늘의 가격을 확인하는 데서 끝나지 않고, 내가 가진 금의 가치를 기록하고
          필요할 때 다음 가치로 이어갈 수 있도록 서비스를 연결합니다.
        </SectionLead>

        <FlowGrid>
          <FlowCard>
            <BarChart3 size={22} aria-hidden />
            <h3>확인</h3>
            <p>오늘 순금·18K·14K 시세와 시장 변화를 확인합니다.</p>
          </FlowCard>
          <FlowCard>
            <NotebookPen size={22} aria-hidden />
            <h3>기록·관리</h3>
            <p>MY GOLD에서 보유 금의 종류와 중량을 기록하고 현재 가치를 계속 확인합니다.</p>
          </FlowCard>
          <FlowCard>
            <Repeat2 size={22} aria-hidden />
            <h3>교환</h3>
            <p>GOLD TO GOLD로 보유 금의 가치를 999.9 골드바로 이어갈 수 있습니다.</p>
          </FlowCard>
        </FlowGrid>
      </Section>

      <Section>
        <SectionTitle>한국골드마켓의 주요 서비스</SectionTitle>
        <ServiceGrid>
          <ServiceLink to="/gold-price">
            <strong>오늘 금시세</strong>
            <p>순금·18K·14K의 오늘 가격과 전일 대비 변화를 확인합니다.</p>
            <span>금시세 확인 <ArrowRight size={14} aria-hidden /></span>
          </ServiceLink>

          <ServiceLink to="/my-gold">
            <strong>MY GOLD</strong>
            <p>내가 가진 금의 종류와 중량을 기록하고 오늘 가치와 예상 순금량을 관리합니다.</p>
            <span>MY GOLD 보기 <ArrowRight size={14} aria-hidden /></span>
          </ServiceLink>

          <ServiceLink to="/gold-to-gold">
            <strong>GOLD TO GOLD</strong>
            <p>보유 금의 예상 순금 가치를 확인하고 매장 실측 후 999.9 골드바로 이어갑니다.</p>
            <span>서비스 알아보기 <ArrowRight size={14} aria-hidden /></span>
          </ServiceLink>
        </ServiceGrid>
      </Section>

      <TrustGrid>
        <OperatorCard>
          <Building2 size={24} aria-hidden />
          <h2>원일귀금속이 직접 운영합니다.</h2>
          <p>
            한국골드마켓의 GOLD TO GOLD 오프라인 확인·교환은 부산 범천동
            원일귀금속에서 진행합니다. 온라인에서 예상값을 확인한 뒤 매장에서
            순도·중량·공임을 확인하고, 고객 동의 후 최종 교환을 결정합니다.
          </p>

          <Facts>
            <div>
              <dt>브랜드</dt>
              <dd>한국골드마켓 · Korea Gold Market</dd>
            </div>
            <div>
              <dt>운영</dt>
              <dd>원일귀금속</dd>
            </div>
            <div>
              <dt>오프라인 매장</dt>
              <dd>부산광역시 부산진구 골드테마길 21</dd>
            </div>
          </Facts>

          <StoreLink to="/stores">
            매장 안내 보기 <ArrowRight size={14} aria-hidden />
          </StoreLink>
        </OperatorCard>

        <Clarification>
          <ShieldCheck size={24} aria-hidden />
          <h2>서비스를 이렇게 구분합니다.</h2>
          <p>
            MY GOLD는 금을 실제로 맡기거나 예치하는 서비스가 아닙니다.
            사용자가 보유 금의 종류와 중량을 기록해 예상 가치와 변화를 확인하는
            개인 관리 기능입니다.
          </p>
          <p>
            GOLD TO GOLD는 실제 교환 서비스이며, 온라인 계산은 예상값입니다.
            최종 순도·중량·공임은 매장 확인 후 확정합니다.
          </p>
        </Clarification>
      </TrustGrid>

      <Section>
        <SectionTitle>내 금의 가치부터 확인해 보세요.</SectionTitle>
        <SectionLead>
          오늘 가격을 확인하고, MY GOLD에 기록하고, 필요할 때 GOLD TO GOLD로
          이어가는 것이 한국골드마켓의 기본 흐름입니다.
        </SectionLead>
        <Actions>
          <PrimaryAction to="/gold-price">
            오늘 금시세 확인 <ArrowRight size={15} aria-hidden />
          </PrimaryAction>
          <SecondaryAction to="/my-gold">MY GOLD</SecondaryAction>
          <SecondaryAction to="/gold-to-gold">GOLD TO GOLD</SecondaryAction>
        </Actions>
      </Section>
    </Page>
  );
}
