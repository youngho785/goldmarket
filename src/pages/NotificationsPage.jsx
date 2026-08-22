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
  max-width: 860px;
  margin: 0 auto;
  padding: 8px 0 30px;
`;
const H1 = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 18px;
`;
const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;
const Button = styled.button`
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
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
  gap: 10px;
`;
const Item = styled.li`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $unread, theme }) =>
    $unread ? theme.semantic.alertInfoBg : theme.colors.surface};
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.hover};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;
const Title = styled.div`
  font-weight: 700;
`;
const Body = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px;
`;
const Time = styled.div`
  font-size: .85rem;
  color: ${({ theme }) => theme.colors.textLight};
  margin-top: 6px;
`;
const LoadMore = styled(Button)`
  display: block;
  margin: 18px auto 0;
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

      {error && <p role="alert">{error}</p>}

      {items.length === 0 ? (
        <p>알림이 없습니다.</p>
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
