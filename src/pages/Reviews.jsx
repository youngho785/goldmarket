import React from "react";
import styled from "styled-components";
import GoldExchangeReviewList from "@/components/reviews/GoldExchangeReviewList";

const Page = styled.main`
  padding: clamp(42px, 6vw, 72px) 0 80px;
`;

const Head = styled.header`
  margin-bottom: 28px;
`;

const Kicker = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.7rem;
  font-weight: 850;
  letter-spacing: 0.14em;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.2;
`;

const Lead = styled.p`
  max-width: 700px;
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;
  line-height: 1.7;
  word-break: keep-all;
`;

export default function Reviews() {
  return (
    <Page>
      <Head>
        <Kicker>VERIFIED EXCHANGE REVIEWS</Kicker>
        <Title>교환 완료 고객 후기</Title>
        <Lead>
          실제 금교환이 완료된 고객이 직접 남긴 후기입니다.
          교환 완료 여부가 확인된 후기만 공개됩니다.
        </Lead>
      </Head>

      <GoldExchangeReviewList limitCount={30} />
    </Page>
  );
}