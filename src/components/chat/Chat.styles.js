// src/components/chat/Chat.styles.js
import styled from "styled-components";

export const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const RoomsList = styled.div`
  width: 300px;
  border-right: 1px solid #ddd;
  overflow-y: auto;
`;

export const RoomItem = styled.div`
  padding: 12px;
  cursor: pointer;
  &:hover {
    background: #f5f5f5;
  }
`;

export const MessagesContainer = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
`;

export const MessageBubble = styled.div`
  max-width: 70%;
  margin-bottom: 8px;
  padding: 10px;
  border-radius: 8px;
  background: ${({ $isMine }) => ($isMine ? "#daf8cb" : "#fff")};
  align-self: ${({ $isMine }) => ($isMine ? "flex-end" : "flex-start")};
`;

export const InputBar = styled.div`
  display: flex;
  padding: 8px;
  border-top: 1px solid #ddd;
`;

export const TextInput = styled.input`
  flex: 1;
  padding: 8px;
  margin-right: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

export const FileInput = styled.input`
  margin-right: 8px;
`;

export const SendButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: ${({ theme }) => (theme?.colors?.primary || "#007bff")};
  color: #fff;
`;
