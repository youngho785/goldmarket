import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Menu, X } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import Notifications from "./Notifications";

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 1000;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.background} 94%, transparent);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  backdrop-filter: blur(16px);
`;

const Utility = styled.div`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
`;

const UtilityInner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  max-width: 1440px;
  min-height: 34px;
  margin: 0 auto;
  padding: 6px clamp(16px, 4vw, 64px);
  font-size: .72rem;
  letter-spacing: .025em;

  span { display: inline-flex; align-items: center; gap: 8px; }
  span:first-child::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.secondary};
    box-shadow: 0 0 0 3px rgba(175, 132, 52, .18);
  }

  @media (max-width: 680px) {
    justify-content: center;
    span:last-child { display: none; }
  }
`;

const Nav = styled.nav`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto minmax(240px, 1fr);
  align-items: center;
  gap: 26px;
  max-width: 1440px;
  min-height: 80px;
  margin: 0 auto;
  padding: 10px clamp(16px, 4vw, 64px);

  @media (max-width: 980px) {
    grid-template-columns: 1fr auto;
  }
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
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.08rem;
  box-shadow: inset 0 0 0 4px ${({ theme }) => theme.colors.background},
    inset 0 0 0 5px ${({ theme }) => theme.colors.secondary}55;
`;

const BrandCopy = styled.span`
  display: grid;
  gap: 1px;

  strong {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.2rem, 2vw, 1.48rem);
    font-weight: 700;
    letter-spacing: -.045em;
    line-height: 1.1;
  }
  small {
    color: ${({ theme }) => theme.colors.textLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .56rem;
    letter-spacing: .13em;
  }
`;

const DesktopLinks = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(15px, 2vw, 30px);

  @media (max-width: 980px) { display: none; }
`;

const MenuLink = styled(NavLink)`
  position: relative;
  padding: 27px 0 25px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .88rem;
  font-weight: 780;
  white-space: nowrap;

  &::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: 10px;
    left: 0;
    height: 2px;
    background: ${({ theme }) => theme.colors.secondary};
    transform: scaleX(0);
    transition: transform ${({ theme }) => theme.transitions.base};
  }
  &:hover, &.active { color: ${({ theme }) => theme.colors.primary}; }
  &:hover::after, &.active::after { transform: scaleX(1); }
`;

const Account = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;

  @media (max-width: 980px) { display: none; }
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

const AccountLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 13px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.primary};
  font-size: .82rem;
  font-weight: 800;
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

const MobileButton = styled.button`
  display: none;
  width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;

  @media (max-width: 980px) { display: grid; place-items: center; }
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
  box-shadow: -24px 0 70px rgba(7, 22, 37, .24);
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
  const { user, isAdmin = false, isEmailVerified } = useAuthContext() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSeenMs, setLastSeenMs] = useState(0);
  const wroteSeenRef = useRef(0);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("로그아웃 실패", error);
    } finally {
      setDrawerOpen(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setLastSeenMs(0);
      return undefined;
    }
    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => setLastSeenMs(tsMs(snapshot.data()?.myExchangesLastSeenAt)),
      () => setLastSeenMs(0)
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setExchangeCount(0);
      return undefined;
    }
    const exchangeQuery = query(
      collection(db, "goldExchanges"),
      where("userId", "==", user.uid)
    );
    return onSnapshot(
      exchangeQuery,
      (snapshot) => {
        const byGroup = new Map();
        snapshot.forEach((item) => {
          const data = item.data() || {};
          const groupId = data.groupId || item.id;
          const updated = tsMs(data.updatedAt) || tsMs(data.createdAt);
          byGroup.set(groupId, Math.max(updated, byGroup.get(groupId) || 0));
        });
        setExchangeCount(
          Array.from(byGroup.values()).filter((updated) =>
            lastSeenMs > 0 ? updated > lastSeenMs : true
          ).length
        );
      },
      () => setExchangeCount(0)
    );
  }, [lastSeenMs, user?.uid]);

  useEffect(() => {
    if (!isAdmin) {
      setPendingCount(0);
      return undefined;
    }
    const pendingQuery = query(
      collection(db, "goldExchanges"),
      where("status", "==", "requested")
    );
    return onSnapshot(
      pendingQuery,
      (snapshot) => {
        const groups = new Set();
        snapshot.forEach((item) => groups.add(item.data()?.groupId || item.id));
        setPendingCount(groups.size);
      },
      () => setPendingCount(0)
    );
  }, [isAdmin]);

  useEffect(() => {
    if (!user?.uid || location.pathname !== "/my-exchanges") return;
    const now = Date.now();
    if (now - wroteSeenRef.current < 5000) return;
    wroteSeenRef.current = now;
    setDoc(
      doc(db, "users", user.uid),
      { myExchangesLastSeenAt: serverTimestamp() },
      { merge: true }
    ).catch((error) =>
      console.warn("[Navbar] lastSeen write failed:", error?.message || error)
    );
  }, [location.pathname, user?.uid]);

  const navItems = useMemo(
    () => [
      { to: "/gold-exchange", label: "금교환" },
      { to: "/goldbar-fee", label: "공임 안내" },
      { to: "/stores", label: "교환 절차·매장" },
      { to: "/quiz/gold-bonus", label: "퀵퀴즈" },
      {
        to: "/my-exchanges",
        label: "교환내역",
        badge: formatBadge(exchangeCount),
      },
      ...(isAdmin
        ? [{ to: "/admin/gold-exchange?status=requested", label: "금교환 관리", badge: formatBadge(pendingCount) }]
        : []),
    ],
    [exchangeCount, isAdmin, pendingCount]
  );

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
              <AccountLink to="/register">회원가입</AccountLink>
            </>
          ) : (
            <>
              <Notifications userId={user.uid} />
              {!isEmailVerified && <MenuLink to="/verify-email">이메일 인증</MenuLink>}
              <TextButton type="button" onClick={handleLogout}>로그아웃</TextButton>
              <AccountLink to="/profile">내 정보</AccountLink>
            </>
          )}
        </Account>

        <MobileButton
          type="button"
          aria-label="전체 메뉴 열기"
          aria-expanded={drawerOpen}
          aria-controls="mobile-menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} aria-hidden />
        </MobileButton>
      </Nav>

      <DrawerBackdrop
        type="button"
        $open={drawerOpen}
        aria-label="메뉴 닫기"
        onClick={() => setDrawerOpen(false)}
      />
      <Drawer id="mobile-menu" $open={drawerOpen} aria-hidden={!drawerOpen}>
        <DrawerHead>
          <Brand to="/" end>
            <BrandSeal aria-hidden>금</BrandSeal>
            <BrandCopy><strong>한국골드마켓</strong><small>GOLD EXCHANGE</small></BrandCopy>
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
              <DrawerAction to="/register" tabIndex={drawerOpen ? 0 : -1}>회원가입</DrawerAction>
            </>
          ) : (
            <>
              <DrawerAction to="/profile" tabIndex={drawerOpen ? 0 : -1}>내 정보</DrawerAction>
              <TextButton type="button" onClick={handleLogout} tabIndex={drawerOpen ? 0 : -1}>
                로그아웃
              </TextButton>
            </>
          )}
        </DrawerAccount>
      </Drawer>
    </Header>
  );
}
