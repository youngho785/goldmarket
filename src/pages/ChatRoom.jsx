// src/pages/ChatRoom.jsx
import React from "react";
import styled from "styled-components";
import ChatRoom from "../components/chat/ChatRoom";

/* 바깥 페이지 스크롤 필요 시 이 래퍼가 담당 */
const PageContainer = styled.main`
  min-height: 100dvh;
  background: #ffffff;
  display: block;
`;

export default function ChatRoomPage() {
  return (
    <PageContainer>
      <ChatRoom />
    </PageContainer>
  );
}
