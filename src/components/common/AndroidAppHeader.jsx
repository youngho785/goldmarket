// src/components/common/AndroidAppHeader.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowLeft,
  BellRing,
  Calculator,
  ChevronRight,
  ClipboardList,
  FileText,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { getAuth, signOut } from "firebase/auth";

import { useAuthContext } from "@/context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 980;
  padding-top: env(safe-area-inset-top, 0px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: color-mix(
    in srgb,
    ${({ theme }) => theme.colors.surface} 96%,
    transparent
  );
  backdrop-filter: blur(18px);
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
  font-size: 0.52rem;
  font-weight: 900;
  line-height: 1;
`;

const BrandMark = styled(Link)`
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
  display: ${({ $open }) => ($open ? "block" : "none")};
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: ${({ theme }) => theme.semantic.overlay};
  box-shadow: none;
`;

const Drawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1300;
  display: ${({ $open }) => ($open ? "flex" : "none")};
  flex-direction: column;
  width: min(88vw, 370px);
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px
    calc(20px + env(safe-area-inset-bottom, 0px));
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  box-shadow: ${({ theme }) => theme.shadows.lg};
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  "/my-exchanges",
  "/profile",
]);

function titleForPath(pathname) {
  if (pathname === "/") return "한국골드마켓";
  if (pathname === "/gold-price") return "금시세";
  if (pathname === "/gold-exchange") return "금교환";
  if (pathname === "/my-exchanges") return "예약";
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
  const { user } = useAuthContext() || {};
  const { unreadNotifications = 0 } = useNotificationContext() || {};
  const [menuOpen, setMenuOpen] = useState(false);

  const isTopLevel = TOP_LEVEL_PATHS.has(pathname);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const goBack = () => {
    const historyIndex = Number(window.history.state?.idx);

    if (Number.isFinite(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
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
              onClick={() => setMenuOpen(false)}
              aria-label="메뉴 닫기"
              tabIndex={menuOpen ? 0 : -1}
            />

            <Drawer
              id="android-app-menu"
              $open={menuOpen}
              role="dialog"
              aria-modal="true"
              aria-label="한국골드마켓 전체 메뉴"
              aria-hidden={!menuOpen}
            >
              <DrawerHead>
                <DrawerBrand>
                  <strong>한국골드마켓</strong>
                  <small>GOLD TO GOLD</small>
                </DrawerBrand>

                <IconButton
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="메뉴 닫기"
                >
                  <X aria-hidden />
                </IconButton>
              </DrawerHead>

              {!user ? (
                <AccountPanel>
                  <AccountCopy>
                    <strong>회원가입하고 순금 0.01g 받기</strong>
                    <p>퀵퀴즈와 금시세 알림으로 최대 순금 0.03g까지 받을 수 있어요.</p>
                  </AccountCopy>

                  <AccountActions>
                    <AccountLink to="/login">
                      <LogIn aria-hidden />
                      로그인
                    </AccountLink>
                    <AccountLink to="/register" $primary>
                      <UserPlus aria-hidden />
                      순금 0.01g 받기
                    </AccountLink>
                  </AccountActions>
                </AccountPanel>
              ) : (
                <AccountPanel>
                  <AccountCopy>
                    <strong>회원 메뉴</strong>
                    <p>내 순금 혜택과 예약·교환 내역을 확인하세요.</p>
                  </AccountCopy>

                  <AccountActions>
                    <AccountLink to="/profile" $primary>
                      <User aria-hidden />
                      내 정보
                    </AccountLink>
                    <AccountLink to="/notifications">
                      <BellRing aria-hidden />
                      알림함
                    </AccountLink>
                  </AccountActions>
                </AccountPanel>
              )}

              {user && (
                <Section>
                  <SectionTitle>MY KGM</SectionTitle>
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

                    <MenuLink to="/settings">
                      <span>
                        <Settings aria-hidden />
                      </span>
                      <div>
                        <strong>알림 설정</strong>
                        <small>금시세 알림 받기·해제</small>
                      </div>
                      <ChevronRight aria-hidden />
                    </MenuLink>
                  </MenuList>
                </Section>
              )}

              <Section>
                <SectionTitle>SERVICE</SectionTitle>
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
                    <span>
                      <Sparkles aria-hidden />
                    </span>
                    <div>
                      <strong>금 퀵퀴즈 · 순금 0.01g</strong>
                      <small>5문제 모두 정답 시 혜택</small>
                    </div>
                    <ChevronRight aria-hidden />
                  </MenuLink>

                  <MenuLink to="/gold-exchange">
                    <span>
                      <Calculator aria-hidden />
                    </span>
                    <div>
                      <strong>내 금 계산</strong>
                      <small>999.9 골드바 교환 예상 확인</small>
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
                <SectionTitle>INFO</SectionTitle>
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
            <BrandMark to="/" aria-label="한국골드마켓 홈">
              G
            </BrandMark>
          ) : (
            <IconButton type="button" onClick={goBack} aria-label="이전 화면">
              <ArrowLeft aria-hidden />
            </IconButton>
          )}

          <Center>
            <strong>{titleForPath(pathname)}</strong>
            {pathname === "/" && <small>GOLD TO GOLD</small>}
          </Center>

          <HeaderActions>
            {user && (
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
              type="button"
              onClick={() => setMenuOpen(true)}
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
