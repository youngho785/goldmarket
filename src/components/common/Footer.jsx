import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";

const OPERATOR = {
  company: "원일귀금속",
  representative: "나영호",
  registrationNumber: "865-41-00244",
  address: "부산광역시 부산진구 골드테마길 21 (범천동) 원일귀금속",
  hours: "월–토 10:00–18:00",
  phone: "051-646-9700",
  mobile: "010-7713-3739",
  email: "lifeapproch@naver.com",
};

const FooterWrap = styled.footer`
  margin-top: auto;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
`;

const Top = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 1.35fr) repeat(2, minmax(160px, .65fr));
  gap: clamp(38px, 6vw, 90px);
  max-width: 1440px;
  margin: 0 auto;
  padding: clamp(52px, 7vw, 88px) clamp(16px, 4vw, 64px) 44px;

  @media (max-width: 820px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const Brand = styled.div`
  max-width: 470px;

  h2 { margin: 0 0 12px; color: white; font-size: 1.65rem; }
  p { margin: 0; color: #C9D0D6; line-height: 1.8; }
`;

const SealRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Seal = styled.span`
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.heading};
  box-shadow: inset 0 0 0 4px ${({ theme }) => theme.colors.primary},
    inset 0 0 0 5px ${({ theme }) => theme.colors.secondary}77;
`;

const Operator = styled.span`
  display: grid;
  gap: 3px;
  color: white;
  font-weight: 800;

  small {
    color: #9EABB6;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .62rem;
    letter-spacing: .11em;
  }
`;

const Col = styled.div`
  h3 {
    margin: 0 0 17px;
    color: white;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: .75rem;
    font-weight: 850;
    letter-spacing: .12em;
  }
`;

const LinkList = styled.div`
  display: grid;
  gap: 10px;

  a {
    color: #C9D0D6;
    font-size: .88rem;
    &:hover { color: white; }
  }
`;

const ContactList = styled.div`
  display: grid;
  gap: 12px;

  span, a {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: #C9D0D6;
    font-size: .84rem;
    line-height: 1.55;
  }
  svg { flex: 0 0 auto; margin-top: 2px; color: ${({ theme }) => theme.colors.secondary}; }
`;

const Notice = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 22px clamp(16px, 4vw, 64px);
  border-top: 1px solid rgba(255,255,255,.12);
  border-bottom: 1px solid rgba(255,255,255,.12);
  color: #AEB8C1;
  font-size: .78rem;
  line-height: 1.75;

  strong { color: ${({ theme }) => theme.colors.goldLight}; }
`;

const Bottom = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 22px clamp(16px, 4vw, 64px) 28px;
  color: #8997A3;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .68rem;

  @media (max-width: 720px) { flex-direction: column; }
`;

export default function Footer() {
  return (
    <FooterWrap>
      <Top>
        <Brand>
          <SealRow>
            <Seal aria-hidden>금</Seal>
            <Operator>
              한국골드마켓
              <small>OPERATED BY WONIL JEWELRY</small>
            </Operator>
          </SealRow>
          <h2>확인하고 결정하는 금교환</h2>
          <p>
            보유 금의 예상 순금 중량을 먼저 계산하고, 원일귀금속 매장에서
            순도·중량·공임을 고객과 함께 확인한 뒤 999.9 골드바로 교환합니다.
          </p>
        </Brand>

        <Col>
          <h3>SERVICE</h3>
          <LinkList>
            <Link to="/gold-exchange">내 금 계산</Link>
            <Link to="/goldbar-fee">골드바 공임</Link>
            <Link to="/stores">교환 절차·매장</Link>
            <Link to="/my-exchanges">교환내역</Link>
            <Link to="/quiz/gold-bonus">금 퀵퀴즈</Link>
          </LinkList>
        </Col>

        <Col>
          <h3>CONTACT</h3>
          <ContactList>
            <span><MapPin size={15} aria-hidden /> {OPERATOR.address}</span>
            <span><Clock3 size={15} aria-hidden /> {OPERATOR.hours}</span>
            <a href={`tel:${OPERATOR.phone.replaceAll("-", "")}`}>
              <Phone size={15} aria-hidden /> {OPERATOR.phone}
            </a>
            <a href={`mailto:${OPERATOR.email}`}>
              <Mail size={15} aria-hidden /> {OPERATOR.email}
            </a>
          </ContactList>
        </Col>
      </Top>

      <Notice>
        <strong>서비스 고지:</strong> 한국골드마켓의 골드바 교환은 원일귀금속이
        직접 제공합니다. 온라인 계산은 예상값이며, 최종 순도·중량·공임은 매장에서
        안내하고 고객 동의 후 확정합니다.
      </Notice>

      <Bottom>
        <span>
          {OPERATOR.company} · 대표 {OPERATOR.representative} · 사업자등록번호{" "}
          {OPERATOR.registrationNumber} · 모바일 {OPERATOR.mobile}
        </span>
        <span>
          <Link to="/terms">이용약관</Link> · <Link to="/privacy">개인정보처리방침</Link>
          {" "}· © {new Date().getFullYear()} KOREA GOLD MARKET
        </span>
      </Bottom>
    </FooterWrap>
  );
}
