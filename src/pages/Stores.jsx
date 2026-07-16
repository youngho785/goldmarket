// src/pages/Stores.js
import React from "react";
import styled from "styled-components";

const Page = styled.main`
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 16px 40px;
`;
const Title = styled.h1`
  margin: 0 0 12px;
  font-size: clamp(22px, 4.8vw, 28px);
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
`;
const Lead = styled.p`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;
const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  padding: 16px;
  margin-top: 12px;
`;
const StoreHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; flex-wrap: wrap;
`;
const StoreName = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
`;
const Chip = styled.span`
  display: inline-block; padding: 6px 10px; border-radius: 9999px;
  background: ${({ theme }) => theme.colors.primary}22;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800; font-size: .85rem;
`;
const Row = styled.p`
  margin: 8px 0;
  color: ${({ theme }) => theme.colors.text};
  strong {
    display: inline-block; width: 72px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;
const TelLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;
  text-decoration: none;
  &:hover { text-decoration: underline; }
  white-space: nowrap;
`;
const Actions = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;
`;
const Button = styled.a`
  text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 12px; border-radius: 10px; font-weight: 800;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.buttonText};
  &:hover { filter: brightness(1.03); }
`;
const Outline = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
`;

/** 전화 링크용: 숫자만 추출 → 한국번호면 +82로 변환 */
function toTelHref(raw) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return null;

  // 한국 내수번호(앞이 0)면 국가코드 +82 붙이고 첫 0 제거
  if (digits.startsWith("0")) {
    return `tel:+82${digits.slice(1)}`;
  }
  // 이미 국제형(+82..)이라면 그대로 혹은 숫자만이면 그대로
  return `tel:${digits}`;
}

const STORES = [
  {
    id: "busan-jingu",
    name: "원일귀금속 (부산)",
    address: "부산광역시 진구 골드테마길 21",
    hours: "월–토 10:00–18:00",
    mobile: "010-7713-3739",
    phone: "051-646-9700",

    google: "https://maps.google.com/?q=부산광역시+진구+골드테마길+21",
    naver:  "https://map.naver.com/v5/search/부산광역시 진구 골드테마길 21 원일귀금속",
  },
  // 지점이 생기면 여기에 계속 추가하면 됩니다.
];

export default function Stores() {
  return (
    <Page>
      <Title>오프라인 매장 안내</Title>
      <Lead>
        현재 <b>부산</b> 매장에서 서비스를 제공 중입니다.
      </Lead>

      {STORES.map((s) => {
        const telMobile = toTelHref(s.mobile);
        const telStore  = toTelHref(s.phone);

        return (
          <Card key={s.id} aria-labelledby={`store-${s.id}`}>
            <StoreHeader>
              <StoreName id={`store-${s.id}`}>{s.name}</StoreName>
              <Chip>운영중</Chip>
            </StoreHeader>

            <Row><strong>주소</strong> {s.address}</Row>
            <Row><strong>영업</strong> {s.hours}</Row>
            <Row>
              <strong>연락처</strong>
              {s.phone && telStore ? (
                <TelLink href={telStore} aria-label={`${s.name} 매장 전화하기`}>
                  {s.phone}
                </TelLink>
              ) : (
                s.phone || "-"
              )}
              {s.mobile && telMobile && (
                <>
                  {" · "}
                  <TelLink href={telMobile} aria-label={`${s.name} 모바일로 전화하기`}>
                    {s.mobile}
                  </TelLink>
                </>
              )}
            </Row>

            <Actions>
              {s.google && (
                <Button href={s.google} target="_blank" rel="noreferrer">
                  Google 지도
                </Button>
              )}
              {s.naver && (
                <Outline href={s.naver}  target="_blank" rel="noreferrer">
                  네이버 지도
                </Outline>
              )}
              {telMobile && (
                <Button href={telMobile} aria-label={`${s.name} 모바일로 전화하기`}>
                  모바일로 전화
                </Button>
              )}
              {telStore && (
                <Outline href={telStore} aria-label={`${s.name} 매장 전화하기`}>
                  매장 전화
                </Outline>
              )}
            </Actions>
          </Card>
        );
      })}
    </Page>
  );
}
