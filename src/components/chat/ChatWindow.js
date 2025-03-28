// src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function ChatWindow({ chatId, userName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messageContainerRef = useRef(null);

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

  // 메시지가 업데이트 될 때마다 스크롤을 자동으로 최하단으로 이동
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
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
  };

  return (
    <div>
      <div
        ref={messageContainerRef}
        style={{
          height: "300px",
          overflowY: "scroll",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {loading ? (
          <p>메시지를 불러오는 중...</p>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id}>
              <strong>{msg.sender}</strong>: {msg.text}
            </div>
          ))
        ) : (
          <p>메시지가 없습니다.</p>
        )}
      </div>
      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력"
          style={{ width: "70%", marginRight: "10px" }}
        />
        <button onClick={handleSend}>전송</button>
      </div>
    </div>
  );
}
