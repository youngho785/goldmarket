// src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { db } from "../../firebase/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// Styled-components
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 600px;
  margin: 20px auto;
  padding: 10px;
`;

const MessagesContainer = styled.div`
  height: 300px;
  overflow-y: auto;
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
`;

const MessageBubble = styled.div`
  margin-bottom: 8px;
  & > strong {
    color: ${({ theme }) => theme.colors.primary || "#007bff"};
  }
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 8px;
  font-size: 1em;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 10px;
`;

const SendButton = styled.button`
  padding: 8px 16px;
  background-color: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondary || "#0056b3"};
  }
  &:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
`;

const LoadingText = styled.p`
  text-align: center;
  font-size: 1em;
  color: #555;
`;

export default function ChatWindow({ chatId, userName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messageContainerRef = useRef(null);

  // 채팅 메시지 실시간 구독
  useEffect(() => {
    if (!chatId) {
      console.error("chatId가 제공되지 않았습니다.");
      return;
    }
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!querySnapshot || !querySnapshot.docs) {
          console.error("querySnapshot 또는 docs가 undefined입니다.");
          setMessages([]);
          setLoading(false);
          return;
        }
        const msgs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);
        setLoading(false);
      },
      (error) => {
        console.error("onSnapshot 에러:", error);
        setMessages([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [chatId]);

  // 메시지 업데이트 시 스크롤 최하단으로 자동 이동
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 메시지 전송 함수 (Enter 키도 지원)
  const handleSend = useCallback(async () => {
    if (input.trim() === "") return;
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: input,
        sender: userName,
        createdAt: serverTimestamp(),
      });
      setInput("");
    } catch (error) {
      console.error("메시지 전송 실패:", error);
    }
  }, [input, chatId, userName]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // 폼 제출 방지
      handleSend();
    }
  };

  return (
    <ChatContainer>
      <MessagesContainer ref={messageContainerRef}>
        {loading ? (
          <LoadingText>메시지를 불러오는 중...</LoadingText>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble key={msg.id}>
              <strong>{msg.sender}</strong>: {msg.text}
            </MessageBubble>
          ))
        ) : (
          <LoadingText>메시지가 없습니다.</LoadingText>
        )}
      </MessagesContainer>
      <InputContainer>
        <MessageInput
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력"
          onKeyDown={handleKeyDown}
        />
        <SendButton onClick={handleSend} disabled={input.trim() === ""}>
          전송
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
}
