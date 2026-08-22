//src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styled from "styled-components";
import usePendingGoldExchangeCount from "../hooks/usePendingGoldExchangeCount";
import { db } from "../firebase/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { useNotificationContext } from "../context/NotificationContext";

const Container = styled.div`
  padding: 8px 0 32px;

  h1 {
    margin-bottom: 14px;
    font-size: clamp(1.55rem, 3vw, 2.25rem);
  }

  h2 { font-size: clamp(1.25rem, 2.4vw, 1.7rem); }
  h3 { font-size: clamp(1.05rem, 2vw, 1.3rem); }
  table { font-size: .92rem; }
  th, td { padding: 9px 11px; }
  input, select { min-height: 42px; padding-block: 8px; }

  @media (max-width: 768px) {
    padding-top: 4px;
    h1 { font-size: 1.55rem; }
    th, td { padding: 8px 9px; }
  }
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 1rem;
  font-size: clamp(1.65rem, 3vw, 2.35rem);
`;

const Menu = styled.nav`
  display: grid;
  grid-template-columns: 1.3fr 1fr 1.15fr 1.15fr;
  gap: 8px;
  margin-bottom: 1.5rem;
  padding: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    display: flex;
    overflow-x: auto;
  }
`;

const MenuGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 5px;
  padding: 7px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 620px) {
    min-width: 230px;
  }
`;

const MenuLabel = styled.strong`
  width: 100%;
  padding: 0 5px 3px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .7rem;
  letter-spacing: .08em;
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
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const coll = collection(db, "supportTickets");
        const q = query(
          coll,
          where("category", "==", "inquiry"),
          where("status", "==", "open")
        );
        const agg = await getCountFromServer(q);
        if (!cancelled) setPendingInquiryCount(agg.data().count || 0);
      } catch (e) {
        if (!cancelled) setPendingInquiryCount(0);
        console.warn(
          "[AdminDashboard] pending inquiry count failed:",
          e?.message || e
        );
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
        <MenuGroup>
          <MenuLabel>운영</MenuLabel>
          <Tab to="." end>개요</Tab>
          <Tab to="gold-exchange">
            금교환 관리
            {pendingGoldExchangeCount > 0 && (
              <Badge>{pendingGoldExchangeCount}</Badge>
            )}
          </Tab>
          <Tab to="support">
            문의
            {pendingInquiryCount > 0 && (
              <Badge>{pendingInquiryCount}</Badge>
            )}
          </Tab>
        </MenuGroup>

        <MenuGroup>
          <MenuLabel>가격·기준</MenuLabel>
          <Tab to="gold-rates">환산율</Tab>
          <Tab to="gold-price">금시세</Tab>
        </MenuGroup>

        <MenuGroup>
          <MenuLabel>고객·알림</MenuLabel>
          <Tab to="members">회원관리</Tab>
          <Tab to="notifications">
            알림함
            {unreadNotifications > 0 && (
              <Badge>{unreadNotifications}</Badge>
            )}
          </Tab>
          <Tab to="notification-send">알림 발송</Tab>
        </MenuGroup>

        <MenuGroup>
          <MenuLabel>분석·보안</MenuLabel>
          <Tab to="statistics">통계</Tab>
          <Tab to="audit-logs">감사로그</Tab>
          <Tab to="security">보안·MFA</Tab>
        </MenuGroup>
      </Menu>

      <Outlet />
    </Container>
  );
}
