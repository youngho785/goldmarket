// src/components/common/AndroidAppHeader.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled, { css, keyframes } from "styled-components";
import {
  ArrowLeft,
  BellRing,
  Calculator,
  ChevronRight,
  ClipboardList,
  FileText,
  Gem,
  BookOpen,
  LogIn,
  LogOut,
  MessageCircle,
  MapPin,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { getAuth, signOut } from "firebase/auth";

import { useAuthContext } from "@/context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import { hapticTap } from "@/platform/androidUx";
import { ANDROID_BACK_OVERLAY_EVENT, resolveAndroidBackAction } from "@/platform/androidBackRoute";

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 980;
  padding-top: 0; /* GlobalStyle body already reserves env(safe-area-inset-top). */
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 0 ${({ theme }) => theme.colors.border},
    0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);
`;

const Bar = styled.div`
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) 84px;
  align-items: center;
  min-height: 58px;
  padding: 0 10px;
`;

const IconButton = styled.button`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;
  cursor: pointer;

  svg {
    width: 21px;
    height: 21px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 2px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
`;

const NotificationLink = styled(Link)`
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  svg {
    width: 20px;
    height: 20px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 2px;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 5px;
  right: 3px;
  display: grid;
  place-items: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border: 2px solid ${({ theme }) => theme.colors.surface};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.on.error};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.62rem;
  font-weight: 900;
  line-height: 1;
`;

const brandHalo = keyframes`
  0% { opacity: 0; transform: scale(0.72); }
  38% { opacity: 0.42; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(1.48); }
`;

const BrandMark = styled(Link)`
  position: relative;
  z-index: 0;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-left: 4px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.92rem;
  font-weight: 900;
  text-decoration: none;

  &::after {
    content: "";
    position: absolute;
    inset: -5px;
    z-index: -1;
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, transparent);
    border-radius: 50%;
    box-shadow: 0 0 16px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);
    opacity: 0;
    pointer-events: none;
    animation: ${({ $myGold }) => $myGold
      ? css`${brandHalo} 980ms cubic-bezier(.2,.8,.2,1) 90ms both`
      : css`${brandHalo} 720ms cubic-bezier(.2,.8,.2,1) 120ms both`};
  }
`;

const Center = styled.div`
  min-width: 0;
  text-align: center;

  strong {
    display: block;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.98rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.61rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }
`;

const Backdrop = styled.button`
  position: fixed;
  inset: 0;
  z-index: 1290;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: ${({ theme }) => theme.semantic.overlay};
  box-shadow: none;
  opacity: ${({ $open, $dragRatio = 0 }) =>
    $open ? Math.max(0, 1 - $dragRatio) : 0};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition:
    opacity 180ms ease,
    visibility 0s linear ${({ $open }) => ($open ? "0ms" : "180ms")};
`;

const Drawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1300;
  display: flex;
  flex-direction: column;
  width: min(88vw, 370px);
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  padding: calc(14px + max(28px, env(safe-area-inset-top, 0px))) 16px
    calc(20px + env(safe-area-inset-bottom, 0px));
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transform: ${({ $open, $dragX = 0 }) =>
    $open
      ? `translate3d(${$dragX}px, 0, 0)`
      : "translate3d(100%, 0, 0)"};
  transition: ${({ $dragging, $open }) =>
    $dragging
      ? "none"
      : `transform 220ms cubic-bezier(.22,.61,.36,1), visibility 0s linear ${
          $open ? "0ms" : "220ms"
        }`};
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const DrawerHead = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const DrawerBrand = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.05rem;
    line-height: 1.35;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.06em;
  }
`;

const AccountPanel = styled.div`
  margin-top: 14px;
  padding: 14px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 38%, ${({ theme }) => theme.colors.border});
  border-radius: 14px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
`;

const AccountCopy = styled.div`
  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.86rem;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.7rem;
    line-height: 1.45;
  }
`;

const AccountActions = styled.div`
  display: grid;
  grid-template-columns: ${({ $single }) => ($single ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))")};
  gap: 8px;
  margin-top: 11px;
`;

const AccountLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 9px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ $primary, theme }) =>
    $primary ? theme.colors.primary : theme.colors.surface};
  color: ${({ $primary, theme }) =>
    $primary ? theme.on.primary : theme.colors.primary};
  font-size: 0.74rem;
  font-weight: 900;
  text-decoration: none;

  svg {
    width: 15px;
    height: 15px;
  }
`;

const Section = styled.section`
  margin-top: 18px;
`;

const SectionTitle = styled.p`
  margin: 0 4px 6px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.09em;
`;

const MenuList = styled.div`
  display: grid;
`;

const MenuLink = styled(Link)`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 18px;
  gap: 9px;
  align-items: center;
  min-height: 52px;
  padding: 8px 5px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  > span:first-child {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 16px;
    height: 16px;
  }

  div {
    min-width: 0;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    line-height: 1.35;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.66rem;
    line-height: 1.35;
  }

  > svg:last-child {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const TextLink = styled(Link)`
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 5px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.74rem;
  font-weight: 780;
  text-decoration: none;
`;

const LogoutButton = styled.button`
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 46px;
  margin-top: 18px;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.76rem;
  font-weight: 850;
  box-shadow: none;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TOP_LEVEL_PATHS = new Set([
  "/",
  "/gold-price",
  "/gold-exchange",
  "/my-gold",
  "/my-gold/items",
  "/my-gold/trend",
  "/my-exchanges",
  "/profile",
]);

function titleForPath(pathname) {
  if (pathname === "/") return "한국골드마켓";
  if (pathname === "/gold-price") return "금시세";
  if (pathname === "/gold-exchange") return "금교환";
  if (pathname === "/gold-to-gold") return "GOLD TO GOLD 이야기";
  if (pathname === "/my-gold" || pathname === "/my-gold/items" || pathname === "/my-gold/trend") return "MY GOLD";
  if (pathname === "/my-gold/alerts") return "내 금 알림";
  if (pathname === "/my-exchanges") return "예약";
  if (pathname === "/member-gold") return "MEMBER GOLD";
  if (pathname === "/profile") return "내정보";
  if (pathname === "/settings") return "설정";
  if (pathname === "/notifications") return "알림";
  if (pathname === "/goldbar-fee") return "골드바 공임";
  if (pathname === "/stores") return "교환 절차·매장";
  if (pathname === "/reviews") return "교환 후기";
  if (pathname === "/quiz/gold-bonus") return "금 퀵퀴즈";
  if (pathname === "/welcome") return "신규회원 혜택";
  if (pathname === "/login") return "로그인";
  if (pathname === "/register") return "회원가입";
  if (pathname === "/verify-email") return "이메일 인증";
  if (pathname === "/reset-password") return "비밀번호 재설정";
  if (pathname === "/terms") return "이용약관";
  if (pathname === "/privacy") return "개인정보처리방침";
  if (pathname.startsWith("/support")) return "고객 문의";
  return "한국골드마켓";
}

export default function AndroidAppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isMember } = useAuthContext() || {};
  const { unreadNotifications = 0 } = useNotificationContext() || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerDragX, setDrawerDragX] = useState(0);
  const [drawerDragging, setDrawerDragging] = useState(false);
  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const drawerCloseButtonRef = useRef(null);
  const gestureRef = useRef(null);

  const isTopLevel = TOP_LEVEL_PATHS.has(pathname);
  const drawerWidth = drawerRef.current?.getBoundingClientRect?.().width || 340;
  const drawerDragRatio = Math.min(1, Math.max(0, drawerDragX / Math.max(1, drawerWidth)));

  const closeMenu = useCallback(({ feedback = false } = {}) => {
    if (menuOpen) menuButtonRef.current?.focus?.();
    setDrawerDragX(0);
    setDrawerDragging(false);
    setMenuOpen(false);
    if (feedback) void hapticTap();
  }, [menuOpen]);

  const openMenu = useCallback(() => {
    setDrawerDragX(0);
    setDrawerDragging(false);
    setMenuOpen(true);
    void hapticTap();
  }, []);

  useEffect(() => {
    setDrawerDragX(0);
    setDrawerDragging(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Drawer is rendered in a portal: keep keyboard users inside it until closed.
    const frame = window.requestAnimationFrame(() => drawerCloseButtonRef.current?.focus());

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ feedback: true });
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(drawerRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []).filter((node) => node.getClientRects().length > 0);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenu, menuOpen]);

  // The RootShell owns the sole native back listener. The open drawer
  // consumes its event so one press cannot pop the underlying page too.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onAndroidBack = (event) => {
      event.preventDefault();
      closeMenu({ feedback: true });
    };

    window.addEventListener(ANDROID_BACK_OVERLAY_EVENT, onAndroidBack);
    return () => {
      window.removeEventListener(ANDROID_BACK_OVERLAY_EVENT, onAndroidBack);
    };
  }, [closeMenu, menuOpen]);

  const goBack = () => {
    void hapticTap();
    const action = resolveAndroidBackAction(pathname, window.history.state);
    if (action === "previous") {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleDrawerPointerDown = (event) => {
    if (!menuOpen || (event.pointerType === "mouse" && event.button !== 0)) return;

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAt: performance.now(),
      horizontal: false,
      cancelled: false,
    };
  };

  const handleDrawerPointerMove = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.cancelled) return;

    const dx = Math.max(0, event.clientX - gesture.startX);
    const dy = event.clientY - gesture.startY;
    const absY = Math.abs(dy);

    if (!gesture.horizontal) {
      if (absY > 10 && absY > dx) {
        gesture.cancelled = true;
        return;
      }
      if (dx < 8 || dx <= absY * 1.12) return;

      gesture.horizontal = true;
      setDrawerDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
    }

    const width = drawerRef.current?.getBoundingClientRect?.().width || 340;
    setDrawerDragX(Math.min(width, dx));
  };

  const finishDrawerGesture = (event) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      setDrawerDragging(false);
      setDrawerDragX(0);
      return;
    }

    if (!gesture.horizontal || gesture.cancelled) {
      setDrawerDragging(false);
      setDrawerDragX(0);
      return;
    }

    const now = performance.now();
    const totalDx = Math.max(0, event.clientX - gesture.startX);
    const elapsedMs = Math.max(1, now - gesture.startAt);
    const velocity = totalDx / elapsedMs;
    const width = drawerRef.current?.getBoundingClientRect?.().width || 340;
    const shouldClose =
      totalDx >= Math.max(72, width * 0.22) ||
      velocity >= 0.55;

    setDrawerDragging(false);

    if (shouldClose) {
      closeMenu({ feedback: true });
    } else {
      setDrawerDragX(0);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      setMenuOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("로그아웃 실패", error);
    }
  };

  const drawer =
    typeof document === "undefined"
      ? null
      : createPortal(
          <>
            <Backdrop
              type="button"
              $open={menuOpen}
              $dragRatio={drawerDragRatio}
              onClick={() => closeMenu({ feedback: true })}
              aria-label="메뉴 닫기"
              tabIndex={menuOpen ? 0 : -1}
            />

            <Drawer
              ref={drawerRef}
              id="android-app-menu"
              $open={menuOpen}
              $dragX={drawerDragX}
              $dragging={drawerDragging}
              onPointerDown={handleDrawerPointerDown}
              onPointerMove={handleDrawerPointerMove}
              onPointerUp={finishDrawerGesture}
              onPointerCancel={finishDrawerGesture}
              role="dialog"
              aria-modal="true"
              aria-label="한국골드마켓 전체 메뉴"
              aria-hidden={!menuOpen}
            >
              <DrawerHead>
                <DrawerBrand>
                  <strong>한국골드마켓</strong>
                  <small>금의 가치를 이어가다</small>
                </DrawerBrand>

                <IconButton
                  ref={drawerCloseButtonRef}
                  type="button"
                  onClick={() => closeMenu({ feedback: true })}
                  aria-label="메뉴 닫기"
                >
                  <X aria-hidden />
                </IconButton>
              </DrawerHead>

              {!user ? (
                <AccountPanel>
                  <AccountCopy>
                    <strong>먼저 내 금의 오늘 가치를 확인해 보세요</strong>
                    <p>회원가입 없이 계산하고, 계속 보고 싶은 금만 MY GOLD에 이어둘 수 있어요.</p>
                  </AccountCopy>

                  <AccountActions $single>
                    <AccountLink to="/login">
                      <LogIn aria-hidden />
                      로그인
                    </AccountLink>
                  </AccountActions>
                </AccountPanel>
              ) : !isMember ? (
                <AccountPanel>
                  <AccountCopy>
                    <strong>이메일 인증을 완료해 주세요</strong>
                    <p>인증이 끝나면 MY GOLD와 예약·회원 기능이 바로 열립니다.</p>
                  </AccountCopy>

                  <AccountActions>
                    <AccountLink to="/verify-email" $primary>
                      <ShieldCheck aria-hidden />
                      이메일 인증
                    </AccountLink>
                  </AccountActions>
                </AccountPanel>
              ) : (
                <AccountPanel>
                  <AccountCopy>
                    <strong>나의 한국골드마켓</strong>
                    <p>내 금과 회원혜택, 예약을 한곳에서 관리하세요.</p>
                  </AccountCopy>

                  <AccountActions>
                    <AccountLink to="/profile" $primary>
                      <User aria-hidden />
                      MY
                    </AccountLink>
                    <AccountLink to="/member-gold">
                      <Gem aria-hidden />
                      MEMBER GOLD
                    </AccountLink>
                  </AccountActions>
                </AccountPanel>
              )}

              {isMember && (
                <Section>
                  <SectionTitle>내 메뉴</SectionTitle>
                  <MenuList>
                    <MenuLink to="/my-exchanges">
                      <span>
                        <ClipboardList aria-hidden />
                      </span>
                      <div>
                        <strong>예약·교환 내역</strong>
                        <small>신청, 변경, 진행 상태 확인</small>
                      </div>
                      <ChevronRight aria-hidden />
                    </MenuLink>

                    <MenuLink to="/notifications">
                      <span>
                        <BellRing aria-hidden />
                      </span>
                      <div>
                        <strong>알림함</strong>
                        <small>
                          {unreadNotifications > 0
                            ? `읽지 않은 알림 ${unreadNotifications}개`
                            : "예약·금시세·혜택 알림"}
                        </small>
                      </div>
                      <ChevronRight aria-hidden />
                    </MenuLink>

                    <MenuLink to="/settings">
                      <span>
                        <Settings aria-hidden />
                      </span>
                      <div>
                        <strong>설정</strong>
                        <small>알림·계정·보안</small>
                      </div>
                      <ChevronRight aria-hidden />
                    </MenuLink>

                    <MenuLink to="/support">
                      <span>
                        <MessageCircle aria-hidden />
                      </span>
                      <div>
                        <strong>1:1 문의</strong>
                        <small>도움이 필요할 때 문의하세요</small>
                      </div>
                      <ChevronRight aria-hidden />
                    </MenuLink>
                  </MenuList>
                </Section>
              )}

              <Section>
                <SectionTitle>서비스</SectionTitle>
                <MenuList>
                  <MenuLink to="/gold-price">
                    <span>
                      <TrendingUp aria-hidden />
                    </span>
                    <div>
                      <strong>오늘 금시세</strong>
                      <small>금시세 페이지에서 확인</small>
                    </div>
                    <ChevronRight aria-hidden />
                  </MenuLink>

                  <MenuLink to="/quiz/gold-bonus">
                    <span><Gem aria-hidden /></span>
                    <div>
                      <strong>금 퀵퀴즈·회원 혜택</strong>
                      <small>참여 조건과 MEMBER GOLD 확인</small>
                    </div>
                    <ChevronRight aria-hidden />
                  </MenuLink>

                  <MenuLink to="/gold-to-gold">
                    <span><BookOpen aria-hidden /></span>
                    <div>
                      <strong>GOLD TO GOLD 이야기</strong>
                      <small>쓰임은 달라도 이어지는 금의 가치</small>
                    </div>
                    <ChevronRight aria-hidden />
                  </MenuLink>

                  <MenuLink to="/gold-exchange">
                    <span>
                      <Calculator aria-hidden />
                    </span>
                    <div>
                      <strong>골드바 교환 계산</strong>
                      <small>내 금으로 받을 골드바 미리 확인</small>
                    </div>
                    <ChevronRight aria-hidden />
                  </MenuLink>

                  <MenuLink to="/goldbar-fee">
                    <span>
                      <ReceiptText aria-hidden />
                    </span>
                    <div>
                      <strong>골드바 공임 안내</strong>
                      <small>제작 공임을 미리 확인</small>
                    </div>
                    <ChevronRight aria-hidden />
                  </MenuLink>

                  <MenuLink to="/stores">
                    <span>
                      <MapPin aria-hidden />
                    </span>
                    <div>
                      <strong>교환 절차·매장</strong>
                      <small>방문과 현장 확인 안내</small>
                    </div>
                    <ChevronRight aria-hidden />
                  </MenuLink>

                </MenuList>
              </Section>

              <Section>
                <SectionTitle>안내</SectionTitle>
                <TextLink to="/terms">
                  <FileText aria-hidden style={{ width: 15, marginRight: 8 }} />
                  이용약관
                </TextLink>
                <TextLink to="/privacy">
                  <ShieldCheck aria-hidden style={{ width: 15, marginRight: 8 }} />
                  개인정보처리방침
                </TextLink>
              </Section>

              {user && (
                <LogoutButton type="button" onClick={handleLogout}>
                  <LogOut aria-hidden />
                  로그아웃
                </LogoutButton>
              )}
            </Drawer>
          </>,
          document.body
        );

  return (
    <>
      <Header role="banner">
        <Bar>
          {isTopLevel ? (
            <BrandMark
              to="/"
              aria-label="한국골드마켓 홈"
              $myGold={pathname === "/my-gold" || pathname === "/my-gold/items" || pathname === "/my-gold/trend"}
            >
              금
            </BrandMark>
          ) : (
            <IconButton type="button" onClick={goBack} aria-label="이전 화면">
              <ArrowLeft aria-hidden />
            </IconButton>
          )}

          <Center>
            <strong>{titleForPath(pathname)}</strong>
            {pathname === "/" && <small>금의 가치를 이어가다</small>}
          </Center>

          <HeaderActions>
            {isMember && (
              <NotificationLink
                to="/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? `알림함, 읽지 않은 알림 ${unreadNotifications}개`
                    : "알림함"
                }
              >
                <BellRing aria-hidden />
                {unreadNotifications > 0 && (
                  <NotificationBadge aria-hidden>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </NotificationBadge>
                )}
              </NotificationLink>
            )}

            <IconButton
              ref={menuButtonRef}
              type="button"
              onClick={openMenu}
              aria-label="전체 메뉴 열기"
              aria-expanded={menuOpen}
              aria-controls="android-app-menu"
            >
              <Menu aria-hidden />
            </IconButton>
          </HeaderActions>
        </Bar>
      </Header>

      {drawer}
    </>
  );
}
