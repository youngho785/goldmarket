// src/components/chat/ChatList.js
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { useAuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const ChatItem = styled.div`
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  &:hover {
    background-color: #f8f8f8;
  }
`;

export default function ChatList() {
  const { user } = useAuthContext();
  const [chatRooms, setChatRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, "chats");
    // 참여자 목록에 user.uid가 포함된 채팅방
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
    // 상세 채팅 페이지로 이동
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
          <ChatItem key={chat.id} onClick={() => handleClick(chat.id)}>
            <p>
              참여자:{" "}
              {chat.participants
                .filter((uid) => uid !== user.uid)
                .join(", ")}
            </p>
            <p>최근 메시지: {chat.lastMessage}</p>
          </ChatItem>
        ))
      )}
    </div>
  );
}
