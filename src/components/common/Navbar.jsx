// src/components/common/Navbar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { FiMenu, FiX } from "react-icons/fi";
import { useAuthContext } from "@/context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import { getAuth, signOut } from "firebase/auth";

/* Firestore */
import { db } from "@/firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/* ───────────────────────────────── 공통 유틸 ───────────────────────────────── */
function toInt(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}
function formatBadge(n, max = 99) {
  const v = toInt(n);
  if (v <= 0) return null; // 0 이하면 렌더링 X
  return v > max ? `${max}+` : String(v);
}

/* 언더라인 애니메이션 */
const slideIn = keyframes`
  from { width: 0; opacity: 0; }
  to   { width: 100%; opacity: 1; }
`;

/* 네비바(상단 밀착, 여백 없음) */
const Nav = styled.nav`
  background: linear-gradient(135deg, #fff, #f9f9f9);
  /* 노치 대응: 외부 여백 없이 내부 패딩만 */
  padding: calc(16px + env(safe-area-inset-top, 0px)) 24px 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  position: sticky;
  top: 0;         /* 화면 최상단에 밀착 */
  margin-top: 0;  /* 외부 여백 제거 */

  z-index: 1000;
`;

const NavLeft = styled.div`
  display: flex;
  align-items: center;
`;

const LogoLink = styled(NavLink)`
  text-decoration: none;
  display: flex;
  align-items: center;
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.8rem;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: 1px;
  }
`;

const AdminBadge = styled.span`
  background: ${({ theme }) => theme.colors.secondary};
  color: #fff;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.75rem;
  margin-left: 8px;
`;

const NavRight = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledNavLink = styled(NavLink)`
  position: relative;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  padding-bottom: 3px;
  transition: color 0.2s ease;

  &:hover,
  &.active {
    color: ${({ theme }) => theme.colors.primary};
  }

  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 0;
    background-color: ${({ theme }) => theme.colors.primary};
    opacity: 0;
    transition: width 0.3s ease, opacity 0.3s ease;
  }

  &:hover::after,
  &.active::after {
    width: 100%;
    opacity: 1;
    animation: ${slideIn} 0.3s forwards;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Badge = styled.span`
  margin-left: 4px;
  background: ${({ theme }) => theme.colors.secondary};
  color: #fff;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-weight: bold;
  line-height: 1;
`;

const LogoutButton = styled.button`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }

  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -2px;
    height: 2px;
    width: 0;
    background-color: ${({ theme }) => theme.colors.primary};
    opacity: 0;
    transition: width 0.3s ease, opacity 0.3s ease;
  }

  &:hover::after,
  &:focus-visible::after {
    width: 100%;
    opacity: 1;
    animation: ${slideIn} 0.3s forwards;
  }
`;

/* 모바일에서만 표시, 로고 앞에 배치 */
const HamburgerButton = styled.button`
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};

  @media (max-width: 768px) {
    display: block;
    padding: 8px;      /* 터치 타겟 확대 */
    margin-right: 8px; /* 로고와 간격 */
  }
`;

const Drawer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  transform: ${({ $open }) => ($open ? "translateX(0)" : "translateX(-100%)")};
  width: 80%;
  max-width: 300px;
  height: 100%;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  padding: ${({ theme }) => theme.spacing(4)};
  transition: transform 0.3s ease;
  z-index: 1100;
  display: flex;
  flex-direction: column;
`;

const DrawerClose = styled.button`
  background: none;
  border: none;
  align-self: flex-end;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DrawerLink = styled(NavLink)`
  margin: ${({ theme }) => theme.spacing(2)} 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  display: flex;
  align-items: center;

  &:hover,
  &.active {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

/* 타임스탬프 to ms */
function tsMs(ts) {
  if (!ts) return 0;
  try {
    return typeof ts.toDate === "function" ? ts.toDate().getTime() : new Date(ts).getTime();
  } catch {
    return 0;
  }
}

export default function Navbar() {
  const { user, isAdmin = false, isEmailVerified } = useAuthContext() || {};
  const { cleanup: cleanupNotifications = () => {}, unreadChats = 0 } = useNotificationContext() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);

  /* 배지 상태 */
  const [exchangeCount, setExchangeCount] = useState(0); // "골드바 조회" 새 변화 수(그룹)
  const [pendingCount, setPendingCount] = useState(0);   // 관리자 대기(그룹)

  const [lastSeenMs, setLastSeenMs] = useState(0);       // users/{uid}.myExchangesLastSeenAt
  const wroteSeenRef = useRef(0);

  const toggleDrawer = () => setDrawerOpen((o) => !o);

  const handleLogout = async () => {
    try {
      cleanupNotifications?.();
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("로그아웃 실패", err);
    } finally {
      setDrawerOpen(false);
    }
  };

  // users/{uid}.myExchangesLastSeenAt 구독
  useEffect(() => {
    if (!user?.uid) {
      setLastSeenMs(0);
      return;
    }
    const uref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      uref,
      (snap) => {
        const v = snap.data()?.myExchangesLastSeenAt;
        setLastSeenMs(tsMs(v));
      },
      () => setLastSeenMs(0)
    );
    return () => unsub();
  }, [user?.uid]);

  // 내가 만든 goldExchanges → 그룹 기준 배지
  useEffect(() => {
    if (!user?.uid) {
      setExchangeCount(0);
      return;
    }
    const qEx = query(collection(db, "goldExchanges"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      qEx,
      (snap) => {
        const byGroup = new Map();
        snap.forEach((d) => {
          const x = d.data() || {};
          const gid = x.groupId || d.id; // 과거 단일 문서 호환
          const u = tsMs(x.updatedAt) || tsMs(x.createdAt);
          const prev = byGroup.get(gid) ?? 0;
          if (u > prev) byGroup.set(gid, u);
        });

        const unseen = Array.from(byGroup.values()).filter((u) =>
          lastSeenMs > 0 ? u > lastSeenMs : true
        ).length;

        setExchangeCount(unseen);
      },
      () => setExchangeCount(0)
    );

    return () => unsub();
  }, [user?.uid, lastSeenMs]);

  // 어드민: 'requested' 상태 그룹 수
  useEffect(() => {
    if (!isAdmin) {
      setPendingCount(0);
      return;
    }
    const qReq = query(collection(db, "goldExchanges"), where("status", "==", "requested"));
    const unsub = onSnapshot(
      qReq,
      (snap) => {
        const groupIds = new Set();
        snap.forEach((d) => {
          const x = d.data() || {};
          groupIds.add(x.groupId || d.id);
        });
        setPendingCount(groupIds.size);
      },
      () => setPendingCount(0)
    );
    return () => unsub();
  }, [isAdmin]);

  // /my-exchanges 진입 시 마지막 확인 시각 갱신
  useEffect(() => {
    if (!user?.uid) return;
    if (location.pathname !== "/my-exchanges") return;

    const now = Date.now();
    if (now - wroteSeenRef.current < 5000) return;
    wroteSeenRef.current = now;

    const uref = doc(db, "users", user.uid);
    setDoc(uref, { myExchangesLastSeenAt: serverTimestamp() }, { merge: true })
      .catch((e) => console.warn("[Navbar] lastSeen write failed:", e?.message || e));
  }, [location.pathname, user?.uid]);

  const chatBadgeRaw = toInt(unreadChats); // 컨텍스트에서 집계된 전역 배지
  const exchangeBadgeRaw = toInt(exchangeCount);
  const pendingBadgeRaw = toInt(pendingCount);

  const navItems = useMemo(
    () => [
      { to: "/",               label: "홈" },
      { to: "/trade",          label: "귀금속 프리마켓" },
      { to: "/sell",           label: "내상품올리기" },
      { to: "/chat",           label: "채팅",            badge: formatBadge(chatBadgeRaw) },
      { to: "/board",          label: "게시판" },
      { to: "/favorites",      label: "찜" },
      { to: "/gold-exchange",  label: "골드바 신청" },
      { to: "/my-exchanges",   label: "나의 골드바 조회",    badge: formatBadge(exchangeBadgeRaw) },
      { to: "/my-products",    label: "내상품 조회" },
      ...(isAdmin ? [{ to: "/admin", label: "어드민", badge: formatBadge(pendingBadgeRaw) }] : []),
    ],
    [chatBadgeRaw, exchangeBadgeRaw, isAdmin, pendingBadgeRaw]
  );

  return (
    <>
      <Nav>
        <NavLeft>
          {/* 모바일: 햄버거 버튼을 로고 앞(왼쪽)에 배치 */}
          <HamburgerButton
            onClick={toggleDrawer}
            aria-label={drawerOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={drawerOpen}
            aria-controls="main-drawer"
          >
            {drawerOpen ? <FiX /> : <FiMenu />}
          </HamburgerButton>

          <LogoLink to="/" end aria-label="한국골드마켓 홈으로 이동">
            <h2>한국골드마켓</h2>
          </LogoLink>
          {isAdmin && <AdminBadge aria-label="관리자 뱃지">관리자</AdminBadge>}
        </NavLeft>

        <NavRight>
          {navItems.map(({ to, label, badge }) => (
            <StyledNavLink
              key={to}
              to={to}
              end
              aria-label={badge ? `${label} (미읽음 ${badge})` : label}
              title={badge ? `${label} • ${badge}` : label}
            >
              {label}
              {badge && <Badge role="status" aria-label={`미읽음 ${badge}`}>{badge}</Badge>}
            </StyledNavLink>
          ))}

          {!user ? (
            <>
              <StyledNavLink to="/login" end>로그인</StyledNavLink>
              <StyledNavLink to="/register" end>회원가입</StyledNavLink>
            </>
          ) : (
            <>
              <LogoutButton onClick={handleLogout}>로그아웃</LogoutButton>
              {!isEmailVerified && (
                <StyledNavLink to="/verify-email" end>
                  이메일 인증 필요
                </StyledNavLink>
              )}
            </>
          )}
        </NavRight>
      </Nav>

      <Drawer
        id="main-drawer"
        $open={drawerOpen}
        role="menu"
        aria-hidden={!drawerOpen}
      >
        <DrawerClose onClick={() => setDrawerOpen(false)} aria-label="메뉴 닫기">
          <FiX />
        </DrawerClose>

        {navItems.map(({ to, label, badge }) => (
          <DrawerLink
            key={to}
            to={to}
            end
            onClick={() => setDrawerOpen(false)}
            aria-label={badge ? `${label} (미읽음 ${badge})` : label}
            title={badge ? `${label} • ${badge}` : label}
          >
            {label}
            {badge && <Badge role="status" aria-label={`미읽음 ${badge}`}>{badge}</Badge>}
          </DrawerLink>
        ))}

        {!user ? (
          <>
            <DrawerLink to="/login" onClick={() => setDrawerOpen(false)}>
              로그인
            </DrawerLink>
            <DrawerLink to="/register" onClick={() => setDrawerOpen(false)}>
              회원가입
            </DrawerLink>
          </>
        ) : (
          <>
            <DrawerLink as="button" onClick={handleLogout}>
              로그아웃
            </DrawerLink>
            {!isEmailVerified && (
              <DrawerLink to="/verify-email" onClick={() => setDrawerOpen(false)}>
                이메일 인증 필요
              </DrawerLink>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
