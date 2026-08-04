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
  max-width: 1120px;
  margin: 0 auto;
  padding: 30px 0 68px;
`;

const Header = styled.header`
  padding: clamp(30px, 5vw, 56px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.surface};
`;

const Kicker = styled.p`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .7rem;
  font-weight: 850;
  letter-spacing: .15em;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(2rem, 5vw, 3.55rem);
`;

const Lead = styled.p`
  max-width: 720px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.85;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(330px, .92fr);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 0;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

const StoreInfo = styled.section`
  padding: clamp(30px, 5vw, 54px);
`;

const StoreHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;

  h2 { margin: 0; font-size: clamp(1.55rem, 3vw, 2.1rem); }
`;

const Seal = styled.span`
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: .76rem;
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  box-shadow: inset 0 0 0 5px ${({ theme }) => theme.colors.surface},
    inset 0 0 0 6px ${({ theme }) => theme.colors.secondary}66;
`;

const Details = styled.div`
  display: grid;
  gap: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Detail = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 16px;
  padding: 17px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  > span:first-child {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    font-weight: 800;
  }
  svg { color: ${({ theme }) => theme.colors.secondaryDark}; }
  a, strong { color: ${({ theme }) => theme.colors.primary}; font-weight: 800; }

  @media (max-width: 460px) { grid-template-columns: 1fr; gap: 5px; }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 28px;
`;

const PrimaryAction = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 50px;
  padding: 11px 18px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-weight: 820;

  &:hover { color: white; background: ${({ theme }) => theme.colors.primaryDark}; }
`;

const OutlineAction = styled(PrimaryAction)`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const VisitGuide = styled.aside`
  padding: clamp(30px, 5vw, 54px);
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  background:
    linear-gradient(rgba(13, 32, 52, .028) 1px, transparent 1px),
    ${({ theme }) => theme.colors.surfaceAlt};
  background-size: 100% 31px, auto;

  @media (max-width: 820px) {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    border-left: 0;
  }
`;

const GuideTitle = styled.h2`
  margin-bottom: 24px;
  font-size: 1.5rem;
`;

const Checklist = styled.ol`
  display: grid;
  gap: 18px;
  counter-reset: visit;

  li {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 13px;
    color: ${({ theme }) => theme.colors.textSecondary};
    counter-increment: visit;
  }
  li::before {
    content: counter(visit, decimal-leading-zero);
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .68rem;
    font-weight: 850;
  }
  strong { display: block; margin-bottom: 3px; color: ${({ theme }) => theme.colors.primary}; }
`;

const Assurance = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 30px;
  padding: 17px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .83rem;

  svg { flex: 0 0 auto; margin-top: 2px; color: ${({ theme }) => theme.colors.success}; }
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
