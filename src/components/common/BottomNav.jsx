// src/components/common/BottomNav.jsx
import React from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import {
  Calculator,
  ClipboardList,
  Home,
  Scale,
  Sparkles,
  User,
} from "lucide-react";

import { isAndroid } from "@/platform/runtime";

const Nav = styled.nav.attrs({
  role: "navigation",
  "aria-label": "하단 네비게이션",
})`
  position: fixed;
  z-index: 1000;
  grid-template-columns: repeat(5, minmax(0, 1fr));

  ${({ $android, theme }) =>
    $android
      ? css`
          right: 0;
          bottom: 0;
          left: 0;
          display: grid;
          min-height: calc(72px + env(safe-area-inset-bottom, 0px));
          padding: 6px 8px env(safe-area-inset-bottom, 0px);
          border-top: 1px solid ${theme.colors.border};
          background: color-mix(
            in srgb,
            ${theme.colors.surface} 97%,
            transparent
          );
          box-shadow: 0 -8px 28px
            color-mix(in srgb, ${theme.colors.primary} 9%, transparent);
          backdrop-filter: blur(18px);
        `
      : css`
          right: 10px;
          bottom: max(10px, env(safe-area-inset-bottom, 0px));
          left: 10px;
          display: none;
          min-height: 66px;
          padding: 5px;
          border: 1px solid ${theme.colors.border};
          background: color-mix(
            in srgb,
            ${theme.colors.surface} 95%,
            transparent
          );
          box-shadow: ${theme.shadows.hover};
          backdrop-filter: blur(18px);

          @media (max-width: 768px) {
            display: grid;
          }
        `}
`;

const IconShell = styled.span`
  display: grid;
  place-items: center;
  width: 32px;
  height: 30px;
  border-radius: 10px;
  transition:
    background ${({ theme }) => theme.transitions.base},
    color ${({ theme }) => theme.transitions.base},
    transform ${({ theme }) => theme.transitions.base};

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 1.85;
  }
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
  font-size: 0.67rem;
  font-weight: 800;
  text-align: center;
  text-decoration: none;

  ${({ $android, $center, theme }) =>
    $android
      ? css`
          min-height: 60px;
          padding-top: ${$center ? "0" : "6px"};

          &.active {
            color: ${theme.colors.primary};
          }

          &.active ${IconShell} {
            background: ${$center
              ? theme.colors.primary
              : theme.semantic.badgeGoldBg};
            color: ${$center ? theme.colors.goldLight : theme.colors.primary};
          }

          ${$center &&
          css`
            transform: translateY(-14px);
            color: ${theme.colors.primary};
            font-weight: 900;

            ${IconShell} {
              width: 52px;
              height: 52px;
              margin-bottom: 1px;
              border: 4px solid ${theme.colors.surface};
              border-radius: 50%;
              background: ${theme.colors.primary};
              color: ${theme.colors.goldLight};
              box-shadow: ${theme.shadows.card};

              svg {
                width: 24px;
                height: 24px;
                stroke-width: 2;
              }
            }
          `}
        `
      : css`
          svg {
            width: 20px;
            height: 20px;
            stroke-width: 1.8;
          }

          &.active {
            background: ${theme.colors.primary};
            color: ${theme.colors.white};
          }
        `}

  &:focus-visible {
    outline-offset: -2px;
  }
`;

const WEB_ITEMS = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/gold-exchange", icon: Calculator, label: "금 계산" },
  { to: "/quiz/gold-bonus", icon: Sparkles, label: "퀵퀴즈" },
  { to: "/my-exchanges", icon: ClipboardList, label: "교환내역" },
  { to: "/profile", icon: User, label: "내정보" },
];

const ANDROID_ITEMS = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/gold-price", icon: Scale, label: "시세" },
  {
    to: "/gold-exchange",
    icon: Calculator,
    label: "금교환",
    center: true,
  },
  { to: "/my-exchanges", icon: ClipboardList, label: "예약" },
  { to: "/profile", icon: User, label: "내정보" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  if (typeof document === "undefined") return null;

  const items = isAndroid ? ANDROID_ITEMS : WEB_ITEMS;

  return createPortal(
    <Nav $android={isAndroid}>
      {items.map(({ to, icon, label, center = false }) => (
        <Item
          key={to}
          to={to}
          end={to === "/"}
          $android={isAndroid}
          $center={center}
          aria-current={
            (to === "/" ? pathname === "/" : pathname.startsWith(to))
              ? "page"
              : undefined
          }
        >
          <IconShell>
            {React.createElement(icon, { "aria-hidden": true })}
          </IconShell>
          <span>{label}</span>
        </Item>
      ))}
    </Nav>,
    document.body
  );
}
