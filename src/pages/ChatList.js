// src/pages/ChatList.js
import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { formatDistanceToNow } from "date-fns";

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

  // 채팅방 클릭 시 해당 채팅의 unreadCount를 0으로 업데이트하는 함수
  const markChatAsRead = async (chatId) => {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        [`unreadCount.${user.uid}`]: 0,
      });
    } catch (error) {
      console.error("채팅 읽음 처리 중 오류:", error);
    }
  };

  const handleClick = (chatId) => {
    markChatAsRead(chatId);
    navigate(`/chat/${chatId}`);
  };

  if (!user) return <p>로그인이 필요합니다.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>채팅 목록</h2>
      {chatRooms.length === 0 ? (
        <p>채팅방이 없습니다.</p>
      ) : (
        chatRooms.map((chat) => {
          // 최근 업데이트 시간을 상대적 시간으로 표시 (예: "3분 전")
          const lastUpdatedTime = chat.lastUpdated?.seconds
            ? formatDistanceToNow(new Date(chat.lastUpdated.seconds * 1000), { addSuffix: true })
            : "N/A";
          
          // 해당 사용자의 새 메시지 개수
          const unread = chat.unreadCount?.[user.uid] || 0;

          return (
            <div
              key={chat.id}
              style={{
                borderBottom: "1px solid #ddd",
                padding: "10px",
                cursor: "pointer",
                backgroundColor: unread > 0 ? "#f0f8ff" : "transparent", // 새 메시지가 있으면 하이라이트
              }}
              onClick={() => handleClick(chat.id)}
            >
              <p>
                상대방:{" "}
                {chat.participants.filter((uid) => uid !== user.uid).join(", ")}
              </p>
              <p>최근 메시지: {chat.lastMessage || "없음"}</p>
              <p>새 메시지: {unread}개</p>
              <p>최근 업데이트: {lastUpdatedTime}</p>
            </div>
          );
        })
      )}
    </div>
  );
}
