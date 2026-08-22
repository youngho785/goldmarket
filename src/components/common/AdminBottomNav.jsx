import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Bell, BellRing, LayoutDashboard, ListChecks } from "lucide-react";
import usePendingGoldExchangeCount from "@/hooks/usePendingGoldExchangeCount";
import { useNotificationContext } from "@/context/NotificationContext";

const Nav = styled.nav.attrs({
  role: "navigation",
  "aria-label": "관리자 빠른 메뉴",
})`
  position: fixed;
  right: 10px;
  bottom: max(10px, env(safe-area-inset-bottom, 0px));
  left: 10px;
  z-index: 1100;
  display: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-height: 66px;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 96%, transparent);
  box-shadow: ${({ theme }) => theme.shadows.hover};
  backdrop-filter: blur(18px);

  @media (max-width: 768px) {
    display: grid;
  }
`;

const Item = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  min-height: 54px;
  padding: 5px 2px;
  border-radius: 8px;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.white : theme.colors.textLight)};
  font-size: .67rem;
  font-weight: 800;
  text-align: center;

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 1.9;
  }

  &:focus-visible {
    outline-offset: -2px;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 2px;
  left: calc(50% + 7px);
  display: grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border: 2px solid ${({ theme }) => theme.colors.surface};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.on.error};
  font-size: .62rem;
  font-weight: 900;
`;

function countLabel(value) {
  const number = Number(value || 0);
  if (number <= 0) return "";
  return number > 99 ? "99+" : String(number);
}

export default function AdminBottomNav() {
  const location = useLocation();
  const pendingCount = usePendingGoldExchangeCount();
  const { unreadNotifications = 0 } = useNotificationContext() || {};
  if (typeof document === "undefined") return null;

  const params = new URLSearchParams(location.search);
  const status = params.get("status") || "";
  const items = [
    {
      key: "home",
      to: "/admin",
      label: "관리홈",
      icon: LayoutDashboard,
      active: location.pathname === "/admin",
    },
    {
      key: "exchange",
      to: "/admin/gold-exchange",
      label: "금교환",
      icon: BellRing,
      badge: countLabel(pendingCount),
      active: location.pathname === "/admin/gold-exchange",
    },
    {
      key: "active",
      to: "/admin/gold-exchange?status=active",
      label: "처리중",
      icon: ListChecks,
      active: location.pathname === "/admin/gold-exchange" && status === "active",
    },
    {
      key: "notifications",
      to: "/admin/notifications",
      label: "알림",
      icon: Bell,
      badge: countLabel(unreadNotifications),
      active: location.pathname === "/admin/notifications",
    },
  ];

  return createPortal(
    <Nav>
      {items.map(({ key, to, label, icon, badge, active }) => (
        <Item key={key} to={to} $active={active} aria-current={active ? "page" : undefined}>
          {React.createElement(icon, { "aria-hidden": true })}
          <span>{label}</span>
          {badge && <Badge aria-label={`${label} ${badge}건`}>{badge}</Badge>}
        </Item>
      ))}
    </Nav>,
    document.body
  );
}
