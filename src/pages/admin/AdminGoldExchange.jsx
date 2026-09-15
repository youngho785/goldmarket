// src/pages/admin/AdminGoldExchange.jsx
import React from "react";
import styled from "styled-components";
import { Link, useSearchParams } from "react-router-dom";
import ExchangeList from "@/components/admin/ExchangeList";
import BookingAvailabilityManager from "@/components/admin/BookingAvailabilityManager";

const Page = styled.div`
  padding: 0 0 24px;
`;
const H1 = styled.h1`
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.text};
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

export default function AdminGoldExchange() {
  const [searchParams] = useSearchParams();
  const status = String(searchParams.get("status") || "");

  return (
    <Page>
      <H1>관리자 금교환 요청 관리</H1>
      <Legend aria-label="금교환 요청 상태 필터">
        <Pill to="/admin/gold-exchange" $active={!status}>전체</Pill>
        <Pill to="/admin/gold-exchange?status=requested" $active={status === "requested"}>신규 접수</Pill>
        <Pill to="/admin/gold-exchange?status=active" $active={status === "active"}>예약·진행</Pill>
        <Pill to="/admin/gold-exchange?status=completed" $active={status === "completed"}>완료</Pill>
        <Pill to="/admin/gold-exchange?status=canceled" $active={status === "canceled"}>취소</Pill>
        <Pill to="/admin/gold-exchange?status=rejected" $active={status === "rejected"}>거절</Pill>
      </Legend>
      <BookingAvailabilityManager />
      <ExchangeList />
    </Page>
  );
}
