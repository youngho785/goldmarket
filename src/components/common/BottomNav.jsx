// src/components/common/BottomNav.jsx
import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import {
  Home,
  MessageSquare,
  PlusCircle,
  Bell,
  CreditCard,
  User
} from "lucide-react";
import { useNotificationContext } from "../../context/NotificationContext";
import usePendingGoldExchangeCount from "../../hooks/usePendingGoldExchangeCount";
import useGoldExchangeCount from "../../hooks/useGoldExchangeCount";
import { useAuthContext } from "../../context/AuthContext";

const Nav = styled.nav.attrs({
  role: "navigation",
  "aria-label": "하단 네비게이션"
})`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100vw;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  transition: transform .2s ease;
  will-change: transform;

  ${({ $hidden }) =>
    $hidden &&
    css`
      transform: translateY(100%);
      pointer-events: none;
    `}
`;

const NavItem = styled(NavLink)`
  flex: 1;
  text-align: center;
  position: relative;
  font-size: 0.75rem;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.textSecondary};
  text-decoration: none;

  svg {
    display: block;
    margin: 0 auto 4px;
    font-size: 1.4rem;
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 4px;
  right: 16px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: ${({ theme }) => theme.colors.secondary};
  color: #fff;
  font-size: 0.625rem;
  font-weight: bold;
  border-radius: 8px;
  line-height: 16px;
`;

function BottomNavContent() {
  const { pathname } = useLocation();
  const {
    unreadChats = 0,
    unreadNotifications = 0,
  } = useNotificationContext() || {};
  const pendingCount = usePendingGoldExchangeCount() || 0;
  const myExchangeCount = useGoldExchangeCount() || 0;
  const { isAdmin } = useAuthContext() || {};

  // ✅ 훅은 항상 실행하고, 채팅 화면에서만 시각적으로 숨김
  const shouldHide = pathname === "/chat" || pathname.startsWith("/chat/");

  const isActiveTab = (to) =>
    pathname === to || pathname.startsWith(`${to}/`);

  const tabs = useMemo(
    () => [
      { to: "/",               icon: <Home aria-hidden />,           label: "홈" },
      {
        to: "/chat",
        icon: <MessageSquare aria-hidden />,
        label: "채팅",
        badge: unreadChats > 0 ? unreadChats : null
      },
      { to: "/sell",           icon: <PlusCircle aria-hidden />,     label: "등록" },
      {
        to: "/notifications",
        icon: <Bell aria-hidden />,
        label: "알림",
        badge: unreadNotifications > 0 ? unreadNotifications : null
      },
      {
        to: "/gold-exchange",
        icon: <CreditCard aria-hidden />,
        label: "금교환",
        badge:
          isAdmin && pendingCount > 0
            ? pendingCount
            : !isAdmin && myExchangeCount > 0
            ? myExchangeCount
            : null
      },
      { to: "/profile",        icon: <User aria-hidden />,           label: "내정보" }
    ],
    [unreadChats, unreadNotifications, pendingCount, myExchangeCount, isAdmin]
  );

  return (
    <Nav $hidden={shouldHide}>
      {tabs.map(({ to, icon, label, badge }) => (
        <NavItem
          key={to}
          to={to}
          end={to === "/"}
          $active={isActiveTab(to) ? 1 : 0}
          aria-label={badge ? `${label} (새 알림 ${badge}개)` : label}
          title={badge ? `${label} • ${badge}` : label}
        >
          {icon}
          {badge ? <Badge aria-label={`새 알림 ${badge}개`}>{badge}</Badge> : null}
          {label}
        </NavItem>
      ))}
    </Nav>
  );
}

export default function BottomNav() {
  // SPA 환경 가정: SSR 대응 불필요. (document.body 존재)
  return createPortal(<BottomNavContent />, document.body);
}
