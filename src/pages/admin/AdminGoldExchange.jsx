// src/pages/admin/AdminGoldExchange.jsx
import React from "react";
import styled from "styled-components";
import { Link, useSearchParams } from "react-router-dom";
import ExchangeList from "@/components/admin/ExchangeList";
import BookingAvailabilityManager from "@/components/admin/BookingAvailabilityManager";

const Page = styled.div`
  padding: 0 0 24px;
`;

const Header = styled.header`
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
`;

const H1 = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const Lead = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  line-height: 1.55;
`;

const Flow = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  margin: 14px 0 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 540px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const FlowStep = styled.div`
  padding: 9px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.78rem;
  font-weight: 800;
  text-align: center;
`;

const FlowNote = styled.p`
  margin: -2px 0 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  line-height: 1.45;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  font-size: .9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Pill = styled(Link)`
  display: inline-block;
  padding: 7px 11px;
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.border};
  border-radius: 9999px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.surfaceAlt};
  color: ${({ $active, theme }) =>
    $active ? theme.on.primary : theme.colors.textSecondary};
  font-weight: 750;
  text-decoration: none;
`;

const FLOW_STEPS = [
  "요청 접수",
  "확인 대기",
  "예약 확정",
  "방문 예정",
  "매장 확인",
  "교환 완료",
];

export default function AdminGoldExchange() {
  const [searchParams] = useSearchParams();
  const status = String(searchParams.get("status") || "");

  return (
    <Page>
      <Header>
        <H1>금교환 운영 관리</H1>
        <Lead>
          고객 화면과 같은 상태 기준으로 예약 확인부터 방문·매장 확인·교환 완료까지 관리합니다.
        </Lead>
      </Header>

      <Flow aria-label="금교환 운영 단계">
        {FLOW_STEPS.map((step) => (
          <FlowStep key={step}>{step}</FlowStep>
        ))}
      </Flow>
      <FlowNote>
        예외 상태는 취소 · 거절 · 방문일 경과 확인 필요로 분리합니다. “확인 필요”는 Firestore 상태를
        새로 만들지 않고 방문일과 현재 상태를 기준으로 화면에서 판단합니다.
      </FlowNote>

      <Legend aria-label="금교환 요청 상태 필터">
        <Pill to="/admin/gold-exchange" $active={!status}>전체</Pill>
        <Pill to="/admin/gold-exchange?status=requested" $active={status === "requested"}>확인 대기</Pill>
        <Pill to="/admin/gold-exchange?status=scheduled" $active={status === "scheduled"}>예약 확정</Pill>
        <Pill to="/admin/gold-exchange?status=attention" $active={status === "attention"}>확인 필요</Pill>
        <Pill to="/admin/gold-exchange?status=in_progress" $active={status === "in_progress"}>매장 확인</Pill>
        <Pill to="/admin/gold-exchange?status=completed" $active={status === "completed"}>완료</Pill>
        <Pill to="/admin/gold-exchange?status=canceled" $active={status === "canceled"}>취소</Pill>
        <Pill to="/admin/gold-exchange?status=rejected" $active={status === "rejected"}>거절</Pill>
      </Legend>

      <BookingAvailabilityManager />
      <ExchangeList />
    </Page>
  );
}
