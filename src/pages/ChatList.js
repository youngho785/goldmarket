// src/pages/ChatList.js
import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function ChatList() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState([]);

  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, "chats");
    const qChats = query(
      colRef,
      where("participants", "array-contains", user.uid),
      orderBy("lastUpdated", "desc")
    );
    const unsubscribe = onSnapshot(qChats, (snapshot) => {
      const rooms = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setChatRooms(rooms);
    });
    return () => unsubscribe();
  }, [user]);

  const handleClick = (chatId) => {
    navigate(`/chat/${chatId}`);
  };

  if (!user) return <p>로그인이 필요합니다.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>채팅 목록</h2>
      {chatRooms.length === 0 ? (
        <p>채팅방이 없습니다.</p>
      ) : (
        chatRooms.map((chat) => (
          <div
            key={chat.id}
            style={{
              borderBottom: "1px solid #ddd",
              padding: "10px",
              cursor: "pointer",
            }}
            onClick={() => handleClick(chat.id)}
          >
            <p>
              상대방:{" "}
              {chat.participants.filter((uid) => uid !== user.uid).join(", ")}
            </p>
            <p>최근 메시지: {chat.lastMessage}</p>
            <p>새 메시지: {chat.unreadCount?.[user.uid] || 0}개</p>
          </div>
        ))
      )}
    </div>
  );
}
