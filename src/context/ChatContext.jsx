// src/context/ChatContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "./AuthContext";
import { createOrGetChatRoom } from "../services/chatService";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";

// ✅ 기본값: Provider 미마운트/게스트에서도 안전
const defaultValue = {
  rooms: [],
  loadingRooms: false,
  roomsError: null,
  // 기본 startChat: 게스트에서 호출되면 에러를 던지되, 훅 자체는 안전
  startChat: async () => {
    throw new Error("로그인이 필요합니다.");
  },
};

const ChatContext = createContext(defaultValue);

export function ChatProvider({ children }) {
  const { user } = useAuthContext();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState(null);

  // 로그인 유저가 바뀔 때마다 "실시간" 구독
  useEffect(() => {
    if (!user?.uid) {
      setRooms([]);
      setRoomsError(null);
      setLoadingRooms(false);
      return;
    }
    setLoadingRooms(true);

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastUpdated", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setRoomsError(null);
        setLoadingRooms(false);
      },
      (err) => {
        console.error("채팅방 목록 구독 오류:", err);
        setRoomsError(err);
        setLoadingRooms(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  /**
   * productId와 (나, 상대)로 채팅방 생성/조회
   */
  const startChat = async (otherId, productId) => {
    if (!user?.uid) throw new Error("로그인이 필요합니다.");
    const chatId = await createOrGetChatRoom(productId, user.uid, otherId);
    // 실시간 구독이 있으니 별도 재조회 불필요
    return chatId;
  };

  const value = useMemo(
    () => ({
      rooms,
      loadingRooms,
      roomsError,
      startChat,
    }),
    [rooms, loadingRooms, roomsError]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * ChatContext를 사용하기 위한 Hook
 */
export function useChatContext() {
  // Provider가 없더라도 기본값으로 안전하게 동작
  return useContext(ChatContext) || defaultValue;
}
