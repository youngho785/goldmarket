// src/pages/ChatRoom.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  sendMessage,
  sendImageMessage,
  subscribeToMessages,
} from "../services/chatService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function ChatRoom() {
  const { chatId } = useParams();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messageContainerRef = useRef(null);

  // 자동 스크롤: 새로운 메시지 추가 시 스크롤을 맨 아래로 이동
  const scrollToBottom = useCallback(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, []);

  // 실시간 메시지 구독 및 읽음 처리
  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = subscribeToMessages(chatId, async (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // 자동 스크롤 호출
      scrollToBottom();

      // 읽지 않은 메시지에 내 UID 추가 (읽음 처리)
      msgs.forEach(async (msg) => {
        if (!msg.readBy || !msg.readBy.includes(user.uid)) {
          try {
            const msgDocRef = doc(db, "chats", chatId, "messages", msg.id);
            await updateDoc(msgDocRef, {
              readBy: msg.readBy ? [...msg.readBy, user.uid] : [user.uid],
            });
          } catch (err) {
            console.error("읽음 처리 중 오류:", err);
          }
        }
      });
    });
    return () => unsubscribe();
  }, [chatId, user, scrollToBottom]);

  // Enter 키로 메시지 전송 처리
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 텍스트 메시지 전송
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(chatId, user.uid, newMessage.trim());
      setNewMessage("");
      // 전송 후 스크롤 업데이트
      scrollToBottom();
    } catch (err) {
      console.error("메시지 전송 실패:", err);
      setError("메시지 전송에 실패했습니다.");
    }
  };

  // 이미지 선택 처리
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // 이미지 메시지 전송
  const handleSendImage = async () => {
    if (!imageFile) return;
    try {
      await sendImageMessage(chatId, user.uid, imageFile);
      setImageFile(null);
      // 전송 후 스크롤 업데이트
      scrollToBottom();
    } catch (err) {
      console.error("이미지 메시지 전송 실패:", err);
      setError("이미지 메시지 전송에 실패했습니다.");
    }
  };

  // 메시지 렌더링: 말풍선 스타일 적용
  const renderMessage = (msg) => {
    const isMyMessage = msg.sender === user.uid;
    const bubbleStyle = {
      maxWidth: "60%",
      margin: isMyMessage ? "5px auto 5px 5px" : "5px 5px 5px auto",
      backgroundColor: isMyMessage ? "#dcf8c6" : "#fff",
      padding: "8px",
      borderRadius: "10px",
      textAlign: isMyMessage ? "right" : "left",
    };
    return (
      <div key={msg.id} style={bubbleStyle}>
        <div style={{ fontSize: "0.8em", marginBottom: "4px", color: "#555" }}>
          {isMyMessage ? "나" : msg.sender}
        </div>
        {msg.text && <div>{msg.text}</div>}
        {msg.imageUrl && (
          <img
            src={msg.imageUrl}
            alt="전송된 이미지"
            style={{ maxWidth: "200px", marginTop: "5px" }}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>채팅방</h2>
      {loading ? (
        <p>메시지를 불러오는 중...</p>
      ) : (
        <div
          ref={messageContainerRef}
          style={{
            border: "1px solid #ccc",
            height: "300px",
            overflowY: "auto",
            marginBottom: "10px",
            padding: "10px",
          }}
        >
          {messages.length === 0 ? (
            <p>메시지가 없습니다.</p>
          ) : (
            messages.map(renderMessage)
          )}
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ marginBottom: "10px" }}>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지 입력..."
          style={{ width: "70%", marginRight: "10px", padding: "8px", resize: "vertical" }}
        />
        <button onClick={handleSend} style={{ padding: "8px 16px" }}>
          전송
        </button>
      </div>
      <div>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        {imageFile && (
          <button
            onClick={handleSendImage}
            style={{ padding: "8px 16px", marginLeft: "10px" }}
          >
            이미지 전송
          </button>
        )}
      </div>
    </div>
  );
}
