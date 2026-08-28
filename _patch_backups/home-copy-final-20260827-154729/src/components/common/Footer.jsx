// src/components/common/Footer.jsx
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
  grid-template-columns: minmax(280px, 1.35fr) repeat(2, minmax(160px, 0.65fr));
  gap: clamp(38px, 6vw, 90px);
  max-width: 1440px;
  margin: 0 auto;
  padding: clamp(52px, 7vw, 88px) clamp(16px, 4vw, 64px) 44px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr 1fr;
    gap: 34px 26px;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-top: 38px;
    padding-bottom: 32px;
  }
`;

const Brand = styled.div`
  max-width: 470px;

  h2 {
    margin: 0 0 12px;
    color: ${({ theme }) => theme.on.primary};
    font-size: 1.65rem;
  }

  p {
    margin: 0;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 78%, transparent);
    line-height: 1.8;
    word-break: keep-all;
  }

  @media (max-width: 560px) {
    h2 {
      font-size: 1.45rem;
    }

    p {
      font-size: 0.9rem;
      line-height: 1.7;
    }
  }
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
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.heading};
  box-shadow:
    inset 0 0 0 4px ${({ theme }) => theme.colors.primary},
    inset 0 0 0 5px ${({ theme }) => theme.colors.secondary}77;
`;

const Operator = styled.span`
  display: grid;
  gap: 3px;
  color: ${({ theme }) => theme.on.primary};
  font-weight: 800;

  small {
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 62%, transparent);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.62rem;
    letter-spacing: 0.11em;
  }
`;

const Col = styled.div`
  h3 {
    margin: 0 0 17px;
    color: ${({ theme }) => theme.on.primary};
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: 0.75rem;
    font-weight: 850;
    letter-spacing: 0.12em;
  }
`;

const LinkList = styled.div`
  display: grid;
  gap: 10px;

  a {
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 78%, transparent);
    font-size: 0.88rem;
    text-decoration: none;
    transition: color 0.18s ease;

    &:hover {
      color: ${({ theme }) => theme.on.primary};
    }
  }
`;

const ContactList = styled.div`
  display: grid;
  gap: 12px;

  span,
  a {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 78%, transparent);
    font-size: 0.84rem;
    line-height: 1.55;
    text-decoration: none;
  }

  a:hover {
    color: ${({ theme }) => theme.on.primary};
  }

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.secondary};
  }
`;

const Notice = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px clamp(16px, 4vw, 64px);
  border-top: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 14%, transparent);
  border-bottom: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 14%, transparent);
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 68%, transparent);
  font-size: 0.78rem;
  line-height: 1.75;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.goldLight};
  }

  @media (max-width: 560px) {
    padding-top: 16px;
    padding-bottom: 16px;
    font-size: 0.73rem;
    line-height: 1.65;
  }
`;

const Bottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px clamp(16px, 4vw, 64px) 26px;

  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 62%, transparent);
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.72rem;
  line-height: 1.6;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;

    /* 모바일 하단 고정 네비게이션 + 기기 안전영역에 가리지 않도록 여백 확보 */
    padding-bottom: calc(118px + env(safe-area-inset-bottom));
  }
`;

const BusinessInfo = styled.span`
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 62%, transparent);

  @media (max-width: 560px) {
    font-size: 0.7rem;
    line-height: 1.7;
  }
`;

const LegalLinks = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;

  a {
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 92%, transparent);
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: 0.84rem;
    font-weight: 800;
    text-decoration: none;
    transition:
      color 0.18s ease,
      text-decoration-color 0.18s ease;

    &:hover {
      color: ${({ theme }) => theme.on.primary};
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }

  .privacy {
    color: ${({ theme }) => theme.colors.goldLight};
    font-weight: 900;
  }

  .divider {
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 40%, transparent);
  }

  .copyright {
    margin-left: 3px;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 54%, transparent);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.69rem;
  }

  @media (max-width: 560px) {
    width: 100%;
    gap: 7px 8px;

    a {
      font-size: 0.82rem;
    }

    .copyright {
      width: 100%;
      margin: 4px 0 0;
      font-size: 0.66rem;
    }
  }
`;

export default function Footer() {
  return (
    <FooterWrap>
      <Top>
        <Brand>
          <SealRow>
            <Seal>금</Seal>

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
            <span>
              <MapPin size={15} aria-hidden />
              {OPERATOR.address}
            </span>

            <span>
              <Clock3 size={15} aria-hidden />
              {OPERATOR.hours}
            </span>

            <a href={`tel:${OPERATOR.phone.replaceAll("-", "")}`}>
              <Phone size={15} aria-hidden />
              {OPERATOR.phone}
            </a>

            <a href={`mailto:${OPERATOR.email}`}>
              <Mail size={15} aria-hidden />
              {OPERATOR.email}
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
        <BusinessInfo>
          {OPERATOR.company} · 대표 {OPERATOR.representative} · 사업자등록번호{" "}
          {OPERATOR.registrationNumber} · 모바일 {OPERATOR.mobile}
        </BusinessInfo>

        <LegalLinks>
          <Link to="/terms">이용약관</Link>

          <span className="divider">·</span>

          <Link to="/privacy" className="privacy">
            개인정보처리방침
          </Link>

          <span className="divider">·</span>

          <span className="copyright">
            © {new Date().getFullYear()} KOREA GOLD MARKET
          </span>
        </LegalLinks>
      </Bottom>
    </FooterWrap>
  );
}
