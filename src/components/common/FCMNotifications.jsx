// src/components/common/FCMNotifications.jsx
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
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 12px 16px;
  border-radius: 12px;
  min-width: 260px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
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
    color: ${({ theme }) => theme.colors.text};
  }

  button {
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
  }
`;

const Body = styled.p`
  margin: 0;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.textSecondary};
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

  const hasNavigator = typeof navigator !== "undefined";

  /*
   * SW -> 페이지 PUSH_MESSAGE 수신
   *
   * 여기서는 App Badge만 처리합니다.
   * APP_PUSH_MESSAGE 전역 이벤트 변환은 SwBridge.jsx 한 곳에서만 담당합니다.
   * 같은 서비스워커 메시지를 두 컴포넌트가 각각 APP_PUSH_MESSAGE로 바꾸면
   * 알림 카운트/목록 갱신이 두 번 실행될 수 있기 때문입니다.
   */
  useEffect(() => {
    function onSwMessage(e) {
      const msg = e?.data || {};
      if (msg.type !== "PUSH_MESSAGE") return;

      const d = msg.data || {};
      const count = Number.isFinite(Number(d.unreadCount))
        ? Number(d.unreadCount)
        : undefined;

      try {
        if (hasNavigator && "setAppBadge" in navigator) {
          if (Number.isFinite(count) && count > 0) {
            navigator.setAppBadge(count);
          } else if ("clearAppBadge" in navigator) {
            navigator.clearAppBadge();
          }
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

    return undefined;
  }, [hasNavigator]);

  // 포그라운드 메시지 -> 토스트
  // 시스템 알림 표시 성공 시 useFCM이 preferBadge=true를 넣어 토스트를 억제합니다.
  useEffect(() => {
    if (!message) return;

    const data = message.data || {};
    const type = String(data.type || "");

    const preferBadge =
      String(data.preferBadge || "").toLowerCase() === "true";

    if (preferBadge) {
      clearMessage();
      return;
    }

    let title = (
      message.notification?.title ||
      data.title ||
      "알림"
    ).toString();

    let body = (
      message.notification?.body ||
      data.body ||
      ""
    ).toString();

    const clickAction = data.link || null;

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

    /*
     * Functions의 onNotificationCreate가 notificationId를 전달합니다.
     * notificationId를 우선 사용해야 같은 알림의 토스트 중복을 안정적으로 막을 수 있습니다.
     * messageId는 이전/다른 발송 경로 호환용으로 남깁니다.
     */
    const id = String(
      data.notificationId ||
      data.messageId ||
      `${type}:${body || ""}:${Date.now()}`
    );

    dispatch({
      type: ADD,
      toast: {
        id,
        title,
        body,
        clickAction,
      },
    });

    clearMessage();

    const timer = setTimeout(
      () => dispatch({ type: REMOVE, id }),
      5000
    );

    return () => clearTimeout(timer);
  }, [message, clearMessage]);

  const handleClick = (toast) => {
    try {
      if (hasNavigator && "clearAppBadge" in navigator) {
        navigator.clearAppBadge();
      }
    } catch {}

    if (toast.clickAction) {
      // 외부 링크는 전체 이동, 내부 경로는 SPA 네비게이션
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
            <button
              aria-label="알림 닫기"
              onClick={(e) => handleDismiss(e, n.id)}
            >
              &times;
            </button>
          </Header>
          <Body>{n.body}</Body>
        </ToastBox>
      ))}
    </Wrapper>
  );
}
