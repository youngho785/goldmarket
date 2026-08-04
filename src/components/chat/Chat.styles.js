// src/components/chat/Chat.styles.js
import styled from "styled-components";

export const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const RoomsList = styled.div`
  width: 300px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow-y: auto;
`;

export const RoomItem = styled.div`
  padding: 12px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
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
  border: 1px solid ${({ $isMine, theme }) => ($isMine ? "transparent" : theme.colors.border)};
  border-radius: ${({ $isMine }) => ($isMine ? "16px 16px 5px 16px" : "16px 16px 16px 5px")};
  background: ${({ $isMine, theme }) => ($isMine ? theme.gradients.primary : theme.colors.surface)};
  color: ${({ $isMine, theme }) => ($isMine ? theme.on.primary : theme.colors.text)};
  align-self: ${({ $isMine }) => ($isMine ? "flex-end" : "flex-start")};
`;

export const InputBar = styled.div`
  display: flex;
  padding: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  background: ${({ theme }) => theme.colors.surface};
`;

export const TextInput = styled.input`
  flex: 1;
  padding: 8px;
  margin-right: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
`;

export const FileInput = styled.input`
  margin-right: 8px;
`;

export const SendButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => (theme?.gradients?.primary || theme?.colors?.primary || "#1f3a5f")};
  color: ${({ theme }) => theme.on?.primary || "#fff"};
`;
