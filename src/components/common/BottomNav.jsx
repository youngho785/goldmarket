import React from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Calculator, ClipboardList, Home, Sparkles, User } from "lucide-react";

const Nav = styled.nav.attrs({
  role: "navigation",
  "aria-label": "하단 네비게이션",
})`
  position: fixed;
  right: 10px;
  bottom: max(10px, env(safe-area-inset-bottom, 0px));
  left: 10px;
  z-index: 1000;
  display: none;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  min-height: 66px;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 95%, transparent);
  box-shadow: 0 16px 44px rgba(7, 22, 37, .18);
  backdrop-filter: blur(18px);
  transition: transform ${({ theme }) => theme.transitions.base};

  @media (max-width: 768px) { display: grid; }
`;

const Item = styled(NavLink)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  min-height: 54px;
  padding: 5px 2px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: .67rem;
  font-weight: 780;
  text-align: center;

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 1.8;
  }

  &.active {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.white};
  }

  &:focus-visible { outline-offset: -2px; }
`;

const ITEMS = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/gold-exchange", icon: Calculator, label: "금 계산" },
  { to: "/quiz/gold-bonus", icon: Sparkles, label: "퀵퀴즈" },
  { to: "/my-exchanges", icon: ClipboardList, label: "교환내역" },
  { to: "/profile", icon: User, label: "내정보" },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  if (typeof document === "undefined") return null;

  return createPortal(
    <Nav>
      {ITEMS.map(({ to, icon, label }) => (
        <Item
          key={to}
          to={to}
          end={to === "/"}
          aria-current={
            (to === "/" ? pathname === "/" : pathname.startsWith(to))
              ? "page"
              : undefined
          }
        >
          {React.createElement(icon, { "aria-hidden": true })}
          <span>{label}</span>
        </Item>
      ))}
    </Nav>,
    document.body
  );
}
