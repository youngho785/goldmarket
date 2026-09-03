//src/pages/Stores.jsx
import React from "react";
import styled from "styled-components";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Scale,
} from "lucide-react";

const STORE = {
  name: "원일귀금속",
  address: "부산광역시 부산진구 골드테마길 21",
  hours: "월–토 10:00–18:00",
  mobile: "010-7713-3739",
  phone: "051-646-9700",
  google: "https://maps.google.com/?q=부산광역시+부산진구+골드테마길+21",
  naver:
    "https://map.naver.com/v5/search/부산광역시 부산진구 골드테마길 21 원일귀금속",
};

const Page = styled.main`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 18px 0 46px;

  @media (max-width: 720px) {
    padding: 8px 0 18px;
  }
`;

const Header = styled.header`
  position: relative;
  overflow: hidden;
  padding: clamp(24px, 4.5vw, 44px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 72%, transparent);
  border-radius: 24px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 12px 30px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 13%, transparent);

  &::after {
    content: "G";
    position: absolute;
    right: -16px;
    bottom: -52px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 8%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(8rem, 18vw, 12rem);
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 540px) {
    padding: 21px 17px 22px;
    border-radius: 20px;
  }
`;

const Kicker = styled.p`
  position: relative;
  z-index: 1;
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .64rem;
  font-weight: 900;
  letter-spacing: .14em;

  ${Header} & {
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const Title = styled.h1`
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(1.8rem, 4.7vw, 3.2rem);
  line-height: 1.15;
  letter-spacing: -.04em;
  word-break: keep-all;
`;

const Lead = styled.p`
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 10px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
  font-size: .88rem;
  line-height: 1.65;
  word-break: keep-all;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(330px, .92fr);
  gap: 12px;
  margin-top: 12px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const StoreInfo = styled.section`
  padding: clamp(22px, 4vw, 38px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 24px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

const StoreHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 24px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.42rem, 3vw, 1.95rem);
    letter-spacing: -.03em;
  }
`;

const Seal = styled.span`
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: .69rem;
  font-weight: 850;
  line-height: 1.25;
  text-align: center;
  box-shadow: inset 0 0 0 4px ${({ theme }) => theme.colors.surface};

  @media (max-width: 390px) {
    width: 60px;
    height: 60px;
    font-size: .63rem;
  }
`;

const Details = styled.div`
  display: grid;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Detail = styled.div`
  display: grid;
  grid-template-columns: 105px minmax(0, 1fr);
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  > span:first-child {
    display: flex;
    align-items: center;
    gap: 7px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .76rem;
    font-weight: 800;
  }

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  a,
  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .86rem;
    font-weight: 850;
    word-break: keep-all;
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
    gap: 4px;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;

  @media (max-width: 540px) {
    display: grid;
    grid-template-columns: 1fr 1fr;

    > a:first-child {
      grid-column: 1 / -1;
    }
  }
`;

const PrimaryAction = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 10px 16px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent);
  border-radius: 13px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: .82rem;
  font-weight: 850;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.goldLight};
    filter: brightness(1.04);
  }
`;

const OutlineAction = styled(PrimaryAction)`
  border-color: ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const VisitGuide = styled.aside`
  padding: clamp(22px, 4vw, 38px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 55%, white) 0%,
      ${({ theme }) => theme.colors.surfaceAlt} 68%
    );
`;

const GuideTitle = styled.h2`
  margin: 0 0 20px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.25rem, 3vw, 1.55rem);
  letter-spacing: -.025em;
`;

const Checklist = styled.ol`
  display: grid;
  gap: 15px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: visit;

  li {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 11px;
    color: ${({ theme }) => theme.colors.textSecondary};
    counter-increment: visit;
    font-size: .82rem;
    line-height: 1.5;
  }

  li::before {
    content: counter(visit, decimal-leading-zero);
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .64rem;
    font-weight: 900;
  }

  strong {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .86rem;
  }
`;

const Assurance = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 24px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .76rem;
  line-height: 1.5;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
    color: ${({ theme }) => theme.colors.success};
  }
`;

const toTel = (phone) => `tel:${phone.replace(/\D/g, "")}`;

export default function Stores() {
  return (
    <Page>
      <Header>
        <Kicker>OFFLINE VERIFICATION STORE</Kicker>
        <Title>교환 절차와 매장 안내</Title>
        <Lead>
          한국골드마켓의 골드바 교환은 부산 범천동 원일귀금속에서 진행합니다.
          방문 전 전화로 준비사항과 가능한 시간을 확인하면 더 빠르게 안내받을 수 있습니다.
        </Lead>
      </Header>

      <Layout>
        <StoreInfo aria-labelledby="store-name">
          <StoreHead>
            <div>
              <Kicker>OPERATED DIRECTLY</Kicker>
              <h2 id="store-name">{STORE.name}</h2>
            </div>
            <Seal>현장확인<br />교환매장</Seal>
          </StoreHead>
          <Details>
            <Detail>
              <span><MapPin size={16} aria-hidden /> 주소</span>
              <strong>{STORE.address}</strong>
            </Detail>
            <Detail>
              <span><Clock3 size={16} aria-hidden /> 영업시간</span>
              <strong>{STORE.hours}</strong>
            </Detail>
            <Detail>
              <span><Phone size={16} aria-hidden /> 매장전화</span>
              <a href={toTel(STORE.phone)}>{STORE.phone}</a>
            </Detail>
            <Detail>
              <span><Phone size={16} aria-hidden /> 교환상담</span>
              <a href={toTel(STORE.mobile)}>{STORE.mobile}</a>
            </Detail>
          </Details>
          <Actions>
            <PrimaryAction href={toTel(STORE.phone)}>
              방문 전 전화
              <Phone size={16} aria-hidden />
            </PrimaryAction>
            <OutlineAction href={STORE.naver} target="_blank" rel="noreferrer">
              네이버 지도
              <ArrowUpRight size={16} aria-hidden />
            </OutlineAction>
            <OutlineAction href={STORE.google} target="_blank" rel="noreferrer">
              Google 지도
              <ArrowUpRight size={16} aria-hidden />
            </OutlineAction>
          </Actions>
        </StoreInfo>

        <VisitGuide aria-labelledby="visit-guide-title">
          <Kicker>BEFORE YOUR VISIT</Kicker>
          <GuideTitle id="visit-guide-title">매장에서는 이렇게 확인합니다</GuideTitle>
          <Checklist>
            <li>
              <span><strong>보유 금 접수</strong>제품 종류와 수량을 고객과 함께 확인합니다.</span>
            </li>
            <li>
              <span><strong>순도·중량 실측</strong>전문가가 고객 앞에서 측정하고 반영 기준을 설명합니다.</span>
            </li>
            <li>
              <span><strong>공임·조합 안내</strong>교환 가능한 골드바 규격과 잔여 중량을 안내합니다.</span>
            </li>
            <li>
              <span><strong>동의 후 확정</strong>모든 결과와 조건을 확인한 경우에만 교환을 진행합니다.</span>
            </li>
          </Checklist>
          <Assurance>
            <CheckCircle2 size={18} aria-hidden />
            측정 결과를 확인한 뒤 교환하지 않기로 결정할 수 있습니다. 온라인 계산값만으로
            교환이 자동 확정되지 않습니다.
          </Assurance>
        </VisitGuide>
      </Layout>
    </Page>
  );
}
