// src/pages/AdminDashboard.js
import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styled from "styled-components";
import usePendingGoldExchangeCount from "../hooks/usePendingGoldExchangeCount";
import { db } from "../firebase/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { useNotificationContext } from "../context/NotificationContext";

const Container = styled.div`
  padding: 8px 0 32px;
`;
const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 1.25rem;
`;
const Menu = styled.nav`
  display: flex;
  gap: 6px;
  margin-bottom: 1.5rem;
  padding: 6px;
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
`;
const Tab = styled(NavLink)`
  position: relative;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &.active {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.border};
    box-shadow: ${({ theme }) => theme.shadows.xs};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const Badge = styled.span`
  margin-left: 4px;
  background: ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.on.error};
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-weight: bold;
  line-height: 1;
`;

const UrgentCard = styled(NavLink)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: -4px 0 16px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: 14px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
  text-decoration: none;

  strong {
    display: block;
    font-size: 1.05rem;
  }
  span {
    font-size: .86rem;
  }
  b {
    white-space: nowrap;
  }
`;

export default function AdminDashboard() {
  const pendingGoldExchangeCount = usePendingGoldExchangeCount();
  const { unreadNotifications = 0 } = useNotificationContext() || {};

  // ▶ 답변대기 문의 수
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const coll = collection(db, "board");
        const q = query(
          coll,
          where("category", "==", "inquiry"),
          where("status", "==", "open")
        );
        const agg = await getCountFromServer(q);
        if (!cancelled) setPendingInquiryCount(agg.data().count || 0);
      } catch (e) {
        // 집계 실패 시 배지 표시 없이 넘어갑니다(UX 저하 방지)
        if (!cancelled) setPendingInquiryCount(0);
        // 콘솔에만 남겨 슬랙/로그수집 등과 연계 가능
        console.warn("[AdminDashboard] pending inquiry count failed:", e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container>
      <Title>관리자 대시보드</Title>
      {pendingGoldExchangeCount > 0 && (
        <UrgentCard to="gold-exchange?status=requested">
          <span>
            <strong>신규 금교환 요청 {pendingGoldExchangeCount}건</strong>
            접수 순서대로 확인하고 방문 일정을 승인해 주세요.
          </span>
          <b>바로 처리 →</b>
        </UrgentCard>
      )}
      <Menu>
        {/* 중첩 라우트 상대 경로 사용 */}
        <Tab to="." end>개요</Tab>

        <Tab to="gold-exchange?status=requested">
          금 교환 요청
          {pendingGoldExchangeCount > 0 && <Badge>{pendingGoldExchangeCount}</Badge>}
        </Tab>

        <Tab to="notifications">
          알림
          {unreadNotifications > 0 && <Badge>{unreadNotifications}</Badge>}
        </Tab>

        {/* ✅ 추가: 문의 관리 (답변대기 배지 표시) */}
        <Tab to="board/inquiries">
          문의 관리
          {pendingInquiryCount > 0 && <Badge>{pendingInquiryCount}</Badge>}
        </Tab>

        <Tab to="statistics">통계 보기</Tab>
      </Menu>

      <Outlet />
    </Container>
  );
}
