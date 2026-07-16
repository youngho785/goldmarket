// src/pages/admin/AdminGoldExchange.js
import React from "react";
import styled from "styled-components";
import ExchangeList from "../../components/admin/ExchangeList";

const Page = styled.div`
  padding: 20px;
`;
const H1 = styled.h1`
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.primary};
`;
const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;
const Pill = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export default function AdminGoldExchange() {
  return (
    <Page>
      <H1>관리자 금교환 요청 관리</H1>
      <Legend>
        <Pill>requested: 접수</Pill>
        <Pill>scheduled: 예약 승인</Pill>
        <Pill>in_progress: 진행 중</Pill>
        <Pill>completed: 완료</Pill>
        <Pill>rejected: 거절</Pill>
        <Pill>canceled: 취소</Pill>
      </Legend>
      <ExchangeList />
    </Page>
  );
}
