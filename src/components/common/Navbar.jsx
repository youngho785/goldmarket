//src\components\common\Navbar.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Menu, X } from "lucide-react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import Notifications from "./Notifications";
import MemberBenefitsDialog from "./MemberBenefitsDialog";
import usePendingGoldExchangeCount from "@/hooks/usePendingGoldExchangeCount";

const Header = styled.header`
position: sticky; top: 0; z-index: 1400; overflow: visible; isolation: isolate;
      background: color-mix(in srgb, var(--gm-background) 96%, transparent); border-bottom: 1px solid var(--gm-border); backdrop-filter: blur(18px);
`;

const Utility = styled.div`
background: var(--gm-primary); color: #e2e6d9;
`;

const UtilityInner = styled.div`
display: flex; align-items: center; justify-content: space-between; gap: 20px; max-width: 1408px;
      min-height: 30px; margin: auto; padding: 5px clamp(20px, 4.2vw, 72px); font-size: 10px; letter-spacing: .035em;
      span { display: inline-flex; gap: 8px; align-items: center; }
      span:first-child::before { content: ''; width: 4px; height: 4px; background: #bfa474; border-radius: 50%; }
      @media(max-width:680px) { justify-content: center; min-height: 26px; font-size: 9px; span:last-child { display: none; } }
`;

const Nav = styled.nav`
display: grid; grid-template-columns: minmax(210px,1fr) auto minmax(150px,.65fr); align-items: center;
      gap: 28px; max-width: 1408px; min-height: 85px; margin: auto; padding: 10px clamp(20px, 4.2vw, 72px);
      @media(max-width:1180px) { grid-template-columns: 1fr auto; min-height: 66px; gap: 12px; padding: 8px 20px; }
`;

const Brand = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 12px;
  color: ${({ theme }) => theme.colors.primary};

  &:hover { color: ${({ theme }) => theme.colors.primary}; }
`;

const BrandSeal = styled.span`
display: grid; place-items: center; width: 34px; height: 38px; border: 1px solid var(--gm-gold);
      border-radius: 1px; color: var(--gm-gold); font-family: Georgia, serif; font-size: 19px; flex-shrink: 0;
      transform: skewY(-7deg); box-shadow: 4px 3px 0 -1px var(--gm-background), 4px 3px 0 0 var(--gm-gold);
`;

const BrandCopy = styled.span`
display: grid; gap: 5px; strong { font-size: 19px; font-weight: 650; line-height: 1.15; letter-spacing: -.05em; }
      small { color: var(--gm-text-secondary); font-size: 8px; font-weight: 500; letter-spacing: .13em; }
      @media(max-width:520px) { strong { font-size: 17px; } small { font-size: 7px; } }
`;

const DesktopLinks = styled.div`
display: flex; align-items: center; justify-content: center; gap: clamp(15px,1.8vw,25px);
      @media(max-width:1180px) { display:none; }
`;

const MenuLink = styled(NavLink)`
position:relative; display: inline-flex; align-items: center; gap: 5px; min-height:44px; padding: 20px 0;
      color: var(--gm-text-secondary); font-size: 12px; font-weight: 550; white-space:nowrap;
      &::after { content:''; position:absolute; height:1px; bottom:12px; left:0; right:0; background:var(--gm-gold); transform:scaleX(0); transition:transform .2s; }
      &:hover, &.active { color:var(--gm-primary); } &:hover::after, &.active::after { transform:scaleX(1); }
`;

const Account = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;

  @media (max-width: 1180px) { display: none; }
`;

const TextButton = styled.button`
  min-height: 40px;
  padding: 6px 2px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  box-shadow: none;
  font-size: .84rem;

  &:hover:not(:disabled) {
    transform: none;
    box-shadow: none;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const AccountLink = styled.button`
display:inline-flex; align-items:center; min-height:40px; padding:9px 15px; border:1px solid var(--gm-primary);
      background:var(--gm-primary); color:white; font-size:11px; font-weight:600; border-radius:3px; box-shadow:none; cursor:pointer;
`;

const AccountMenuWrap = styled.div`
  position: relative;
  z-index: 1450;
`;

const AccountMenuButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 13px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;
  font-size: .82rem;
  font-weight: 800;

  &:hover:not(:disabled) {
    transform: none;
    box-shadow: none;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

const AccountMenu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 1500;
  pointer-events: auto;
  display: ${({ $open }) => ($open ? "grid" : "none")};
  width: 210px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const AccountMenuItem = styled(NavLink)`
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 9px 10px;
  color: ${({ theme }) => theme.colors.text};
  font-size: .84rem;
  font-weight: 720;

  &:hover, &:focus-visible, &.active {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const AccountMenuLogout = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 42px;
  margin-top: 6px;
  padding: 9px 10px;
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  box-shadow: none;
  font-size: .84rem;
  font-weight: 720;
  text-align: left;

  &:hover:not(:disabled), &:focus-visible {
    transform: none;
    box-shadow: none;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.error};
  }
`;

const Badge = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  margin-left: 5px;
  padding: 0 4px;
  border-radius: 99px;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .62rem;
`;

const MobileActions = styled.div`
  display: none;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;

  @media (max-width: 1180px) {
    display: flex;
  }
`;

const MobileNotificationSlot = styled.div`
  display: grid;
  place-items: center;

  /* Notifications.jsx 안의 버튼이 모바일 네비바 높이와 자연스럽게 맞도록 */
  > div > button {
    min-width: 44px;
    min-height: 44px;
    padding: 0 8px;
    font-size: 1.05rem;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const MobileButton = styled.button`
  display: none;
  width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;

  @media (max-width: 1180px) { display: grid; place-items: center; }
`;

const DrawerBackdrop = styled.button`
  position: fixed;
  inset: 0;
  z-index: 1090;
  display: ${({ $open }) => ($open ? "block" : "none")};
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: ${({ theme }) => theme.semantic.overlay};
`;

const Drawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1100;
  display: ${({ $open }) => ($open ? "flex" : "none")};
  flex-direction: column;
  width: min(88vw, 380px);
  height: 100dvh;
  padding: calc(18px + env(safe-area-inset-top, 0px)) 20px
    calc(24px + env(safe-area-inset-bottom, 0px));
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const DrawerHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const DrawerClose = styled(MobileButton)`
  display: grid;
  place-items: center;
`;

const DrawerLink = styled(NavLink)`
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 11px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
  font-weight: 700;

  &.active { color: ${({ theme }) => theme.colors.secondaryDark}; }
`;

const DrawerAccount = styled.div`
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding-top: 20px;
`;

const DrawerAction = styled(NavLink)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 48px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;
`;

const DrawerBenefitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
`;

function toInt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function formatBadge(value, max = 99) {
  const number = toInt(value);
  if (number <= 0) return null;
  return number > max ? `${max}+` : String(number);
}

function tsMs(timestamp) {
  if (!timestamp) return 0;
  try {
    return typeof timestamp.toDate === "function"
      ? timestamp.toDate().getTime()
      : new Date(timestamp).getTime();
  } catch {
    return 0;
  }
}

export default function Navbar() {
  const { user, memberUser, isMember, isAdmin = false, logout } = useAuthContext() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const pendingCount = usePendingGoldExchangeCount();
  const [lastSeenMs, setLastSeenMs] = useState(0);
  const wroteSeenRef = useRef(0);
  const menuButtonRef = useRef(null);
  const drawerRef = useRef(null);
  const accountMenuRef = useRef(null);
  const accountMenuButtonRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [benefitOpen, setBenefitOpen] = useState(false);
  const benefitDesktopTriggerRef = useRef(null);
  const benefitReturnFocusRef = useRef(null);
  const closeBenefitGuide = React.useCallback(() => setBenefitOpen(false), []);
  const openBenefitGuide = (trigger) => {
    benefitReturnFocusRef.current = trigger === "mobile" ? menuButtonRef.current : benefitDesktopTriggerRef.current;
    if (trigger === "mobile") setDrawerOpen(false);
    setBenefitOpen(true);
  };

  // Route transitions must close transient navigation UI before the next paint.
  // Using a normal effect can race with an immediate user click after login/navigation:
  // the user opens MY, then the still-pending route effect closes it again.
  useLayoutEffect(() => {
    setDrawerOpen(false);
    setAccountMenuOpen(false);
    setBenefitOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      const menu = accountMenuRef.current;
      const button = accountMenuButtonRef.current;
      if (menu?.contains(event.target) || button?.contains(event.target)) return;
      setAccountMenuOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setAccountMenuOpen(false);
      accountMenuButtonRef.current?.focus?.();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    const menuButton = menuButtonRef.current;
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const focusTimer = window.setTimeout(() => {
      const first = drawer?.querySelector(focusableSelector);
      first?.focus?.();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;

      const focusable = Array.from(drawer.querySelectorAll(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus?.();
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    try {
      await logout?.();
      navigate("/login");
    } catch (error) {
      console.error("로그아웃 실패", error);
    } finally {
      setDrawerOpen(false);
      setAccountMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!memberUser?.uid) {
      setLastSeenMs(0);
      return undefined;
    }
    return onSnapshot(
      doc(db, "users", memberUser.uid),
      (snapshot) => setLastSeenMs(tsMs(snapshot.data()?.myExchangesLastSeenAt)),
      () => setLastSeenMs(0)
    );
  }, [memberUser?.uid]);

  useEffect(() => {
    if (!memberUser?.uid) {
      setExchangeCount(0);
      return undefined;
    }
    // 새소식 뱃지는 과거 전체 이력이 아니라 마지막 확인 이후 그룹만 구독합니다.
    // 100건까지만 구독해 뱃지 표기(99+)에 필요한 범위 이상을 읽지 않습니다.
    const constraints = [
      where("ownerUid", "==", memberUser.uid),
      ...(lastSeenMs > 0
        ? [where("updatedAt", ">", Timestamp.fromMillis(lastSeenMs))]
        : []),
      orderBy("updatedAt", "desc"),
      limit(100),
    ];
    const exchangeQuery = query(collection(db, "goldExchangeGroups"), ...constraints);
    let fallbackUnsubscribe = null;
    let primaryUnsubscribe = null;

    primaryUnsubscribe = onSnapshot(
      exchangeQuery,
      (snapshot) => setExchangeCount(snapshot.size),
      (error) => {
        console.warn("[Navbar] optimized exchange badge query failed:", error?.message || error);
        primaryUnsubscribe?.();
        primaryUnsubscribe = null;

        const fallbackQuery = query(
          collection(db, "goldExchangeGroups"),
          where("ownerUid", "==", memberUser.uid)
        );
        fallbackUnsubscribe = onSnapshot(
          fallbackQuery,
          (snapshot) => {
            const count = snapshot.docs.reduce((total, item) => {
              const data = item.data() || {};
              const updated = tsMs(data.updatedAt) || tsMs(data.createdAt);
              return total + (lastSeenMs > 0 && updated <= lastSeenMs ? 0 : 1);
            }, 0);
            setExchangeCount(Math.min(count, 100));
          },
          () => setExchangeCount(0)
        );
      }
    );

    return () => {
      primaryUnsubscribe?.();
      fallbackUnsubscribe?.();
    };
  }, [lastSeenMs, memberUser?.uid]);

  useEffect(() => {
    if (!memberUser?.uid || location.pathname !== "/my-exchanges") return;
    const now = Date.now();
    if (now - wroteSeenRef.current < 5000) return;
    wroteSeenRef.current = now;
    setDoc(
      doc(db, "users", memberUser.uid),
      { myExchangesLastSeenAt: serverTimestamp() },
      { merge: true }
    ).catch((error) =>
      console.warn("[Navbar] lastSeen write failed:", error?.message || error)
    );
  }, [location.pathname, memberUser?.uid]);

  const navItems = useMemo(() => {
    if (isMember) {
      return [
        { to: "/my-gold", label: "MY GOLD" },
        { to: "/gold-price", label: "금시세" },
        { to: "/gold-exchange", label: "금교환 계산" },
        { to: "/gold-to-gold", label: "GOLD TO GOLD 이야기" },
        { to: "/my-exchanges", label: "교환내역", badge: formatBadge(exchangeCount) },
      ];
    }

    return [
      { to: "/my-gold", label: "MY GOLD" },
      { to: "/gold-price", label: "금시세" },
      { to: "/gold-exchange", label: "금교환 계산" },
        { to: "/gold-to-gold", label: "GOLD TO GOLD 이야기" },
      { to: "/stores", label: "매장안내" },
    ];
  }, [exchangeCount, isMember]);

  return (
    <Header role="banner">
      <Utility>
        <UtilityInner>
          <span>원일귀금속 직접 운영 · 부산 범천동 골드테마거리</span>
          <span>월–토 10:00–18:00 · 교환 상담 051-646-9700</span>
        </UtilityInner>
      </Utility>

      <Nav aria-label="주요 메뉴">
        <Brand to="/" end aria-label="한국골드마켓 홈">
          <BrandSeal aria-hidden>금</BrandSeal>
          <BrandCopy>
            <strong>한국골드마켓</strong>
            <small>KOREA GOLD MARKET</small>
          </BrandCopy>
        </Brand>

        <DesktopLinks>
          {navItems.map(({ to, label, badge }) => (
            <MenuLink key={to} to={to} end>
              {label}
              {badge && <Badge aria-label={`새 내역 ${badge}건`}>{badge}</Badge>}
            </MenuLink>
          ))}
        </DesktopLinks>

        <Account>
          {!user ? (
            <>
              <MenuLink to="/login" end>로그인</MenuLink>
              <AccountLink ref={benefitDesktopTriggerRef} type="button" onClick={() => openBenefitGuide("desktop")} aria-haspopup="dialog" aria-expanded={benefitOpen}>회원혜택 알아보기</AccountLink>
            </>
          ) : !isMember ? (
            <>
              <MenuLink to="/verify-email" end>이메일 인증</MenuLink>
              <TextButton type="button" onClick={handleLogout}>로그아웃</TextButton>
            </>
          ) : (
            <>
              <Notifications />
              {isAdmin && (
                <MenuLink to="/admin/gold-exchange" end>
                  관리{formatBadge(pendingCount) && <Badge aria-label={`대기 교환 ${formatBadge(pendingCount)}건`}>{formatBadge(pendingCount)}</Badge>}
                </MenuLink>
              )}
              <AccountMenuWrap>
                <AccountMenuButton
                  ref={accountMenuButtonRef}
                  type="button"
                  aria-label="MY 계정 메뉴"
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  aria-controls="desktop-account-menu"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  MY
                </AccountMenuButton>
                <AccountMenu
                  ref={accountMenuRef}
                  id="desktop-account-menu"
                  $open={accountMenuOpen}
                  role="menu"
                  aria-hidden={!accountMenuOpen}
                >
                  <AccountMenuItem to="/profile" role="menuitem" tabIndex={accountMenuOpen ? 0 : -1}>
                    내 정보
                  </AccountMenuItem>
                  <AccountMenuItem to="/settings" role="menuitem" tabIndex={accountMenuOpen ? 0 : -1}>
                    설정
                  </AccountMenuItem>
                  <AccountMenuItem to="/support" role="menuitem" tabIndex={accountMenuOpen ? 0 : -1}>
                    1:1 문의
                  </AccountMenuItem>
                  <AccountMenuLogout
                    type="button"
                    role="menuitem"
                    tabIndex={accountMenuOpen ? 0 : -1}
                    onClick={handleLogout}
                  >
                    로그아웃
                  </AccountMenuLogout>
                </AccountMenu>
              </AccountMenuWrap>
            </>
          )}
        </Account>

        <MobileActions>
          {isMember && (
            <MobileNotificationSlot>
              <Notifications />
            </MobileNotificationSlot>
          )}

          <MobileButton
            ref={menuButtonRef}
            type="button"
            aria-label="전체 메뉴 열기"
            aria-expanded={drawerOpen}
            aria-controls="mobile-menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={22} aria-hidden />
          </MobileButton>
        </MobileActions>
      </Nav>

      <DrawerBackdrop
        type="button"
        $open={drawerOpen}
        aria-label="메뉴 닫기"
        onClick={() => setDrawerOpen(false)}
      />
      <Drawer
        ref={drawerRef}
        id="mobile-menu"
        $open={drawerOpen}
        role="dialog"
        aria-modal="true"
        aria-label="전체 메뉴"
        aria-hidden={!drawerOpen}
      >
        <DrawerHead>
          <Brand to="/" end>
            <BrandSeal aria-hidden>금</BrandSeal>
            <BrandCopy><strong>한국골드마켓</strong><small>금의 가치를 이어가다</small></BrandCopy>
          </Brand>
          <DrawerClose type="button" aria-label="메뉴 닫기" onClick={() => setDrawerOpen(false)}>
            <X size={22} aria-hidden />
          </DrawerClose>
        </DrawerHead>
        {navItems.map(({ to, label, badge }) => (
          <DrawerLink key={to} to={to} end tabIndex={drawerOpen ? 0 : -1}>
            {label}
            {badge && <Badge aria-label={`새 내역 ${badge}건`}>{badge}</Badge>}
          </DrawerLink>
        ))}
        <DrawerAccount>
          {!user ? (
            <>
              <DrawerAction to="/login" tabIndex={drawerOpen ? 0 : -1}>로그인</DrawerAction>
              <DrawerBenefitButton type="button" tabIndex={drawerOpen ? 0 : -1} onClick={() => openBenefitGuide("mobile")} aria-haspopup="dialog">🎁 회원혜택</DrawerBenefitButton>
            </>
          ) : !isMember ? (
            <>
              <DrawerAction to="/verify-email" tabIndex={drawerOpen ? 0 : -1}>이메일 인증 완료하기</DrawerAction>
              <TextButton type="button" onClick={handleLogout} tabIndex={drawerOpen ? 0 : -1}>
                로그아웃
              </TextButton>
            </>
          ) : (
            <>
              <DrawerAction to="/notifications" tabIndex={drawerOpen ? 0 : -1}>알림</DrawerAction>
              <DrawerAction to="/profile" tabIndex={drawerOpen ? 0 : -1}>MY</DrawerAction>
              <DrawerAction to="/support" tabIndex={drawerOpen ? 0 : -1}>고객지원 · 1:1 문의</DrawerAction>
              <DrawerAction to="/settings" tabIndex={drawerOpen ? 0 : -1}>설정</DrawerAction>
              {isAdmin && (
                <DrawerAction to="/admin/gold-exchange" tabIndex={drawerOpen ? 0 : -1}>
                  관리자 · 금교환 관리 {formatBadge(pendingCount) ? `(${formatBadge(pendingCount)})` : ""}
                </DrawerAction>
              )}
              <TextButton type="button" onClick={handleLogout} tabIndex={drawerOpen ? 0 : -1}>로그아웃</TextButton>
            </>
          )}
        </DrawerAccount>
      </Drawer>
      {!user && (
        <MemberBenefitsDialog
          open={benefitOpen}
          onClose={closeBenefitGuide}
          triggerRef={benefitReturnFocusRef}
          registerPath="/register"
        />
      )}
    </Header>
  );
}