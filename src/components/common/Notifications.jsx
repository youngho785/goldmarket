//src/compoenets/common/Notifications.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  listenToMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/notificationService";
import { useNotificationContext } from "@/context/NotificationContext";
import { callmarkChatAsRead } from "@/firebase/firebase";
import styled from "styled-components";

// — styled components —
const Wrapper = styled.div`position: relative;`;
const Toggle = styled.button`
  cursor: pointer; position: relative; border: 0; background: transparent; font-size: 18px;
`;
const Badge = styled.span`
  position: absolute; top: -5px; right: -5px; background: red; color: #fff;
  border-radius: 50%; padding: 2px 6px; font-size: 0.8em;
`;
const Dropdown = styled.div`
  position: absolute; top: 120%; right: 0; width: 320px; background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 100; max-height: 400px;
  overflow-y: auto; border-radius: 8px;
`;
const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;
`;
const Item = styled.div`
  padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;
  background: ${({ unread }) => (unread ? "#f9f9f9" : "#fff")};
  &:last-child { border-bottom: none; }
`;
const ChatItem = styled(Item)`background: #f0f8ff;`;
const Title = styled.p`margin: 0 0 4px; font-weight: 700; font-size: .95em;`;
const Body  = styled.p`margin: 0 0 4px; font-size: .9em; color: #333;`;
const TimeText = styled.p`margin: 0; font-size: .8em; color: #999;`;
const Button = styled.button`
  background: none; border: none; color: #007bff; cursor: pointer; font-size: .85em;
  &:hover { text-decoration: underline; }
`;

// 안전한 Timestamp → Date 변환
function toDateSafe(ts) {
  try {
    if (!ts) return null;
    if (typeof ts.toDate === "function") return ts.toDate();
    if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

export default function Notifications({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { unreadChats } = useNotificationContext() || {};
  const wrapperRef = useRef(null);

  // 1) 실시간 구독
  useEffect(() => {
    if (!userId) return;
    const unsub = listenToMyNotifications(userId, setNotifications, 20);
    return () => unsub && unsub();
  }, [userId]);

  // 2) 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (n) => {
    const link   = n?.link ?? n?.data?.link ?? "";
    const type   = n?.type ?? n?.data?.type ?? "";
    const chatId = n?.chatId ?? n?.meta?.chatId ?? n?.data?.chatId ?? null;

    setDropdownOpen(false);
    if (link) navigate(link);

    // 읽음 동기화 (알림 자체)
    queueMicrotask(async () => {
      try { await markNotificationAsRead(n.id, userId); } catch {}
      // 채팅 알림인 경우: 해당 채팅의 롤업까지 읽음 처리
      if (type === "chat" && chatId) {
        try { await callmarkChatAsRead(chatId); } catch {}
      }
    });
  };

  const handleChatClick = () => {
    setDropdownOpen(false);
    // 전역 채팅 배지는 채팅방을 실제로 열 때 Functions가 줄여줌
    navigate("/chat");
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(userId).catch(() => {});
  };

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const totalBadge = (unreadNotifications || 0) + (unreadChats || 0);

  return (
    <Wrapper ref={wrapperRef}>
      {/* 벨 아이콘 + 배지 */}
      <Toggle
        type="button"
        aria-label="알림 열기"
        data-cy="notification-toggle"
        onClick={() => setDropdownOpen((o) => !o)}
      >
        🔔
        {totalBadge > 0 && <Badge data-cy="nav-notification-badge">{totalBadge}</Badge>}
      </Toggle>

      {/* 드롭다운 */}
      {dropdownOpen && (
        <Dropdown data-cy="notification-dropdown">
          <Header>
            <span>알림</span>
            {(unreadNotifications > 0 || unreadChats > 0) && (
              <Button onClick={handleMarkAllRead}>전체 읽음</Button>
            )}
          </Header>

          {/* 채팅 미읽음 요약 */}
          {unreadChats > 0 && (
            <ChatItem data-cy="notification-chat-item" unread onClick={handleChatClick}>
              <Title>새 채팅 메시지 {unreadChats}건</Title>
            </ChatItem>
          )}

          {/* 일반 알림 리스트 */}
          {notifications.length === 0 ? (
            <Item unread={false}><Body>알림이 없습니다.</Body></Item>
          ) : (
            notifications.map((n) => {
              const created = toDateSafe(n.createdAt);
              return (
                <Item
                  key={n.id}
                  unread={!n.read}
                  data-cy="notification-item"
                  onClick={() => handleNotificationClick(n)}
                >
                  <Title>{n.title}</Title>
                  <Body>{n.body}</Body>
                  {created && (
                    <TimeText>
                      {formatDistanceToNow(created, { addSuffix: true, locale: ko })}
                    </TimeText>
                  )}
                </Item>
              );
            })
          )}
        </Dropdown>
      )}
    </Wrapper>
  );
}
