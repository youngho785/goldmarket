//src/pages/NotificationsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import {
  fetchNotificationsPage,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationService";

const PAGE_SIZE = 30;

const Wrap = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 7px 0 28px;
`;
const HeaderCard = styled.header`
  position: relative;
  margin-bottom: 10px;
  padding: clamp(20px, 4vw, 29px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 78%, transparent);
  border-radius: 22px;
  background:
    radial-gradient(circle at 92% 8%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, transparent) 0, transparent 31%),
    ${({ theme }) => theme.gradients.primary};
  box-shadow: 0 12px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);

  &::after {
    content: "N";
    position: absolute;
    right: -5px;
    bottom: -35px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 7%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 7.6rem;
    font-weight: 950;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 560px) {
    padding: 16px 14px 14px;
    border-radius: 19px;
  }
`;

const H1 = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(1.55rem, 4vw, 2.15rem);
  line-height: 1.14;
  letter-spacing: -.04em;

  &::before {
    content: "NOTIFICATIONS";
    display: block;
    margin-bottom: 7px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: .61rem;
    font-weight: 950;
    letter-spacing: .14em;
  }
`;
const Toolbar = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 7px;
  align-items: center;
  margin-top: 13px;
  flex-wrap: wrap;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
  font-size: .78rem;

  strong {
    color: ${({ theme }) => theme.colors.goldLight};
  }

  small {
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 54%, transparent);
  }

  button {
    border-color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 16%, transparent);
    background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 8%, transparent);
    color: ${({ theme }) => theme.on.primary};
  }
`;
const Button = styled.button`
  min-height: 38px;
  padding: 7px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  font-size: .78rem;
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;
const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const Item = styled.li`
  position: relative;
  overflow: hidden;
  border: 1px solid
    ${({ $unread, theme }) =>
      $unread
        ? `color-mix(in srgb, ${theme.colors.gold} 28%, ${theme.colors.border})`
        : theme.colors.border};
  background: ${({ $unread, theme }) =>
    $unread
      ? `linear-gradient(135deg, color-mix(in srgb, ${theme.semantic.badgeGoldBg} 54%, white), ${theme.colors.surface})`
      : theme.colors.surface};
  border-radius: 16px;
  padding: 13px 14px 13px 17px;
  cursor: pointer;
  box-shadow: 0 7px 20px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
  transition: transform .18s ease, border-color .18s ease;

  &::before {
    content: "";
    position: absolute;
    inset: 11px auto 11px 0;
    width: 3px;
    border-radius: 0 999px 999px 0;
    background: ${({ $unread, theme }) =>
      $unread ? theme.colors.secondary : "transparent"};
  }

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;
const Title = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  font-size: .9rem;
  font-weight: 900;
  line-height: 1.35;
`;
const Body = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px;
  font-size: .8rem;
  line-height: 1.5;
`;
const Time = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.textLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .68rem;
`;
const LoadMore = styled(Button)`
  display: block;
  min-width: 140px;
  margin: 16px auto 0;
  border-color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
`;


const ErrorText = styled.p`
  margin: 0 0 10px;
  padding: 11px 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
  font-size: .8rem;
`;

const EmptyState = styled.div`
  padding: 34px 18px;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .84rem;
  text-align: center;
`;

function formatTimestamp(value) {
  try {
    if (!value) return "-";
    const date =
      typeof value.toDate === "function" ? value.toDate() : new Date(value);
    return date.toLocaleString("ko-KR");
  } catch {
    return "-";
  }
}

function safeInternalLink(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const { user } = useAuthContext();
  const { unreadNotifications, refresh } = useNotificationContext();
  const uid = user?.uid || "";
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const loadFirstPage = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError("");

    try {
      const result = await fetchNotificationsPage(uid, null, PAGE_SIZE);
      setItems(result.items);
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (loadError) {
      console.error("[NotificationsPage] load failed:", loadError);
      setError("알림을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const unreadOnPage = useMemo(
    () => items.reduce((sum, item) => sum + (item.read ? 0 : 1), 0),
    [items]
  );

  const loadMore = async () => {
    if (!uid || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      const result = await fetchNotificationsPage(uid, cursor, PAGE_SIZE);
      setItems((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        result.items.forEach((item) => merged.set(item.id, item));
        return Array.from(merged.values());
      });
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (loadError) {
      console.error("[NotificationsPage] load more failed:", loadError);
      setError("추가 알림을 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  };

  const openItem = async (item) => {
    if (!uid) return;

    if (!item.read) {
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, read: true } : value
        )
      );
      await markNotificationAsRead(item.id, uid).catch(() => refresh());
    }

    const link = safeInternalLink(item.link || item.data?.link);
    if (link) navigate(link);
  };

  const markAll = async () => {
    if (!uid || markingAll) return;
    setMarkingAll(true);
    setError("");
    setItems((current) => current.map((item) => ({ ...item, read: true })));

    try {
      await markAllNotificationsAsRead(uid);
      refresh();
    } catch (markError) {
      console.error("[NotificationsPage] mark all failed:", markError);
      setError("전체 읽음 처리에 실패했습니다.");
      await loadFirstPage();
    } finally {
      setMarkingAll(false);
    }
  };

  if (!uid) return <Wrap>로그인이 필요합니다.</Wrap>;
  if (loading) return <Wrap>로딩 중…</Wrap>;

  return (
    <Wrap>
      <HeaderCard>
        <H1>알림</H1>

        <Toolbar>
          <div>
            안 읽은 알림: <strong>{unreadNotifications}</strong>건
            {unreadOnPage !== unreadNotifications && (
              <small> · 현재 목록 {unreadOnPage}건</small>
            )}
          </div>
          {unreadNotifications > 0 && (
            <Button type="button" disabled={markingAll} onClick={markAll}>
              {markingAll ? "처리 중…" : "모두 읽음"}
            </Button>
          )}
          <Button type="button" onClick={() => navigate(-1)}>
            ← 돌아가기
          </Button>
        </Toolbar>
      </HeaderCard>

      {error && <ErrorText role="alert">{error}</ErrorText>}

      {items.length === 0 ? (
        <EmptyState>새로운 알림이 없습니다.</EmptyState>
      ) : (
        <>
          <List>
            {items.map((item) => (
              <Item
                key={item.id}
                $unread={!item.read}
                onClick={() => openItem(item)}
              >
                <Title>{item.title || "알림"}</Title>
                {item.body && <Body>{item.body}</Body>}
                <Time>{formatTimestamp(item.createdAt)}</Time>
              </Item>
            ))}
          </List>

          {hasMore && (
            <LoadMore
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "불러오는 중…" : "알림 더 보기"}
            </LoadMore>
          )}
        </>
      )}
    </Wrap>
  );
}
