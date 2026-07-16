// src/components/common/ChatBadge.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useNotificationContext } from "@/context/NotificationContext";

const Wrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Dot = styled.span`
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  font-weight: 700;
`;

const Anchor = styled(Link)`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: inherit;
  text-decoration: none;
`;

export default function ChatBadge({ to = "/chat", showLabel = true, className }) {
  const { unreadChats } = useNotificationContext() || { unreadChats: 0 };
  const display = unreadChats > 99 ? "99+" : unreadChats;

  return (
    <Wrap className={className}>
      <Anchor
        to={to}
        aria-label={`채팅${unreadChats > 0 ? `, 미읽음 ${unreadChats}개` : ""}`}
      >
        <span role="img" aria-hidden="true">💬</span>
        {showLabel && <span>채팅</span>}
      </Anchor>
      {unreadChats > 0 && <Dot>{display}</Dot>}
    </Wrap>
  );
}
