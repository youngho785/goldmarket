// src/components/common/FCMNotifications.js
import React, { useReducer, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import useFCM from "../../hooks/useFCM";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Wrapper = styled.div`
  position: fixed;
  /* 노치/상단 안전영역 고려 */
  top: calc(16px + env(safe-area-inset-top));
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ToastBox = styled.div`
  background: ${({ theme }) => theme?.colors?.surface || "#99bdf0ff"};
  color: ${({ theme }) => theme?.colors?.text || "#111827"};
  padding: 12px 16px;
  border-radius: 12px;
  min-width: 260px;
  border: 1px solid ${({ theme }) => theme?.colors?.border || "#e5e7eb"};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  animation: ${fadeIn} 0.25s ease-out;
  outline: none;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;

  h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: ${({ theme }) => theme?.colors?.text || "#111827"};
  }
  button {
    background: none;
    border: none;
    color: ${({ theme }) => theme?.colors?.textSecondary || "#6b7280"};
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
  }
`;

const Body = styled.p`
  margin: 0;
  font-size: 0.92rem;
  color: ${({ theme }) => theme?.colors?.textSecondary || "#6b7280"};
`;

const ADD = "ADD";
const REMOVE = "REMOVE";

function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      if (state.some((n) => n.id === action.toast.id)) return state;
      return [action.toast, ...state].slice(0, 3);
    }
    case REMOVE:
      return state.filter((n) => n.id !== action.id);
    default:
      return state;
  }
}

export default function FCMNotifications() {
  const navigate = useNavigate();
  const { message, clearMessage } = useFCM();
  const [toasts, dispatch] = useReducer(reducer, []);

  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";

  // SW → 페이지 브로드캐스트 수신: App Badge도 함께 세팅(설치형 PWA에서만 표시)
  useEffect(() => {
    function onSwMessage(e) {
      const msg = e?.data || {};
      if (msg.type !== "PUSH_MESSAGE") return;
      const d = msg.data || {};
      const count = Number.isFinite(Number(d.unreadCount)) ? Number(d.unreadCount) : undefined;

      try {
        if (hasNavigator && "setAppBadge" in navigator) {
          if (Number.isFinite(count) && count > 0) {
            navigator.setAppBadge(count);
          } else if ("clearAppBadge" in navigator) {
            navigator.clearAppBadge();
          }
        }
      } catch {}

      // 전역 컨텍스트(알림/배지) 재평가 트리거
      try {
        if (hasWindow) {
          window.dispatchEvent(new CustomEvent("APP_PUSH_MESSAGE", { detail: d }));
        }
      } catch {}
    }

    try {
      if (
        hasNavigator &&
        navigator.serviceWorker &&
        typeof navigator.serviceWorker.addEventListener === "function"
      ) {
        navigator.serviceWorker.addEventListener("message", onSwMessage);
        return () => {
          try {
            navigator.serviceWorker.removeEventListener("message", onSwMessage);
          } catch {}
        };
      }
    } catch {}
  }, [hasNavigator, hasWindow]);

  // 포그라운드 메시지 → 토스트 (단, 현재 보고있는 채팅방이면 억제)
  useEffect(() => {
    if (!message) return;

    const data = message.data || {};
    const type = String(data.type || "");
    const incomingChatId = data.chatId ? String(data.chatId) : null;

    // 현재 페이지에서 보고 있는 채팅방과 동일하면 토스트 억제
    const activeChatId =
      hasWindow && window.__activeChatId ? String(window.__activeChatId) : null;
    const sameRoom =
      type === "chat_message" &&
      activeChatId &&
      incomingChatId &&
      activeChatId === incomingChatId;

    if (sameRoom) {
      clearMessage();
      return;
    }

    // (선택) 서버에서 배지 우선 표시 요청이 온 경우도 억제
    const preferBadge = String(data.preferBadge || "").toLowerCase() === "true";
    if (preferBadge) {
      clearMessage();
      return;
    }

    // 기본 토스트 내용 구성
    let title = (message.notification?.title || data.title || "알림").toString();
    let body = (message.notification?.body || data.body || "").toString();
    const clickAction = data.link || (incomingChatId ? `/chat/${incomingChatId}` : null);

    switch (type) {
      case "exchange_scheduled":
        title = "예약이 확정되었습니다!";
        break;
      case "exchange_in_progress":
        title = "교환 진행 중입니다";
        break;
      case "exchange_completed":
        title = "교환이 완료되었습니다!";
        break;
      default:
        break;
    }

    // 중복 방지용 id 강화 (서버가 messageId 내려주면 우선 사용)
    const id = String(
      data.messageId || `${type}:${incomingChatId || ""}:${body || ""}:${Date.now()}`
    );

    dispatch({ type: ADD, toast: { id, title, body, clickAction } });
    clearMessage();

    const timer = setTimeout(() => dispatch({ type: REMOVE, id }), 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, clearMessage, hasWindow]);

  const handleClick = (toast) => {
    try {
      if (hasNavigator && "clearAppBadge" in navigator) navigator.clearAppBadge();
    } catch {}
    if (toast.clickAction) {
      // 외부 링크는 전체 이동, 내부 경로는 SPA 네비
      if (String(toast.clickAction).startsWith("http")) {
        window.location.href = toast.clickAction;
      } else {
        navigate(toast.clickAction);
      }
    }
    dispatch({ type: REMOVE, id: toast.id });
  };

  const handleDismiss = (e, id) => {
    e.stopPropagation();
    dispatch({ type: REMOVE, id });
  };

  if (!toasts.length) return null;

  return (
    <Wrapper role="alert" aria-live="assertive">
      {toasts.map((n) => (
        <ToastBox
          key={n.id}
          onClick={() => handleClick(n)}
          $clickable={!!n.clickAction}
          tabIndex={0}
        >
          <Header>
            <h4>{n.title}</h4>
            <button aria-label="알림 닫기" onClick={(e) => handleDismiss(e, n.id)}>
              &times;
            </button>
          </Header>
          <Body>{n.body}</Body>
        </ToastBox>
      ))}
    </Wrapper>
  );
}
