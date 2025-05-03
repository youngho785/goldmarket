// src/components/FCMNotifications.js
import React, { useReducer, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import useFCM from "../../hooks/useFCM";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Wrapper = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Toast = styled.div`
  background: #333;
  color: #fff;
  padding: 12px 20px;
  border-radius: 6px;
  min-width: 260px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  cursor: ${({ clickable }) => (clickable ? "pointer" : "default")};
  animation: ${fadeIn} 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;

  h4 {
    margin: 0;
    font-size: 1rem;
  }
  button {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.2rem;
    cursor: pointer;
  }
`;

const Body = styled.p`
  margin: 0;
  font-size: 0.9rem;
`;


// reducer & action types
const ADD = "ADD";
const REMOVE = "REMOVE";
function reducer(state, action) {
  switch (action.type) {
    case ADD:
      // 중복 체크 및 최대 3개 유지
      if (state.some((n) => n.id === action.toast.id)) return state;
      return [action.toast, ...state].slice(0, 3);
    case REMOVE:
      return state.filter((n) => n.id !== action.id);
    default:
      return state;
  }
}

export default function FCMNotifications() {
  const { message } = useFCM();
  const [toasts, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    const notif = message?.notification;
    if (!notif) return;

    const {
      notificationId: id = Date.now(),
      title = "알림",
      body = "",
      clickAction,
    } = notif;

    const toast = { id, title, body, clickAction };
    dispatch({ type: ADD, toast });

    // 5초 뒤 자동 제거
    const timer = setTimeout(() => {
      dispatch({ type: REMOVE, id });
    }, 5000);

    return () => clearTimeout(timer);
  }, [message]);

  const handleClick = (toast) => {
    if (toast.clickAction) {
      window.location.href = toast.clickAction;
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
        <Toast
          key={n.id}
          onClick={() => handleClick(n)}
          clickable={!!n.clickAction}
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
        </Toast>
      ))}
    </Wrapper>
  );
}
