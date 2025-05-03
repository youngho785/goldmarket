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
  deleteDoc,
  doc,
  serverTimestamp,
  limit,
  startAfter,
  getDocs
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import ContentLoader from "react-content-loader";

// Styled-components
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 600px;
  height: 80vh;
  margin: 20px auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;
const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border-bottom: 1px solid #eee;
`;
const MessageBubble = styled.div`
  max-width: 70%;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: ${props => props.isOwn ? "#d1e7dd" : "#e2e3e5"};
  align-self: ${props => props.isOwn ? "flex-end" : "flex-start"};
  position: relative;
`;
const SenderText = styled.strong`
  display: block;
  margin-bottom: 4px;
  color: #333;
`;
const TimeText = styled.span`
  font-size: 0.75em;
  color: #666;
  margin-left: 8px;
`;
const DeleteButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.8em;
  &:hover { color: #e74c3c; }
`;
const InputContainer = styled.div`
  display: flex;
  padding: 12px;
`;
const MessageInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 8px;
`;
const SendButton = styled.button`
  padding: 10px 16px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled { background: #aaa; cursor: not-allowed; }
`;
const LoaderWrapper = styled.div`
  padding: 20px;
  text-align: center;
`;

export default function ChatWindow({ chatId, userName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const messagesEndRef = useRef(null);
  const PAGE_SIZE = 30;

  // 초기 메시지 및 페이지네이션 처리
  const loadMessages = useCallback(async () => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    let q = query(messagesRef, orderBy("createdAt","desc"), limit(PAGE_SIZE));
    if (lastDoc) q = query(messagesRef, orderBy("createdAt","desc"), startAfter(lastDoc), limit(PAGE_SIZE));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (docs.length < PAGE_SIZE) setHasMore(false);
    if (docs.length) setLastDoc(snapshot.docs[snapshot.docs.length-1]);
    setMessages(prev => [...prev, ...docs.reverse()]);
    setLoading(false);
  }, [chatId, lastDoc]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // 실시간 구독 (new messages)
  useEffect(() => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const qLive = query(messagesRef, orderBy("createdAt","asc"));
    const unsubscribe = onSnapshot(qLive, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(docs);
      setLoading(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return unsubscribe;
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: input,
        sender: userName,
        createdAt: serverTimestamp()
      });
      setInput("");
    } catch (e) {
      console.error("메시지 전송 오류:", e);
    }
  };

  const handleDelete = async (msgId) => {
    await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
  };

  return (
    <ChatContainer>
      {loading ? (
        <LoaderWrapper>
          <ContentLoader height={80} width={400} backgroundColor="#f3f3f3" foregroundColor="#ecebeb">
            <rect x="0" y="10" rx="4" ry="4" width="400" height="20" />
            <rect x="0" y="40" rx="4" ry="4" width="300" height="20" />
          </ContentLoader>
        </LoaderWrapper>
      ) : (
        <MessagesContainer>
          {hasMore && <p style={{ cursor:'pointer', textAlign:'center' }} onClick={loadMessages}>더 불러오기</p>}
          {messages.map(msg => (
            <MessageBubble key={msg.id} isOwn={msg.sender===userName}>
              <SenderText>{msg.sender}</SenderText>
              {msg.text}
              <TimeText>{msg.createdAt?.toDate?.() && formatDistanceToNow(msg.createdAt.toDate(),{ addSuffix:true, locale:ko })}</TimeText>
              <DeleteButton onClick={()=>handleDelete(msg.id)}>삭제</DeleteButton>
            </MessageBubble>
          ))}
          <div ref={messagesEndRef} />
        </MessagesContainer>
      )}
      <InputContainer>
        <MessageInput
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="메시지 입력..."
          onKeyDown={e => e.key==='Enter' && (e.preventDefault(), handleSend())}
        />
        <SendButton onClick={handleSend} disabled={!input.trim()}>전송</SendButton>
      </InputContainer>
    </ChatContainer>
  );
}
