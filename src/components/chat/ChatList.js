// src/components/chat/ChatList.js
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import ContentLoader from "react-content-loader";

// — styled components —

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Heading = styled.h2`
  font-size: 1.8em;
  text-align: center;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
`;

// $highlight: 트랜지언트 prop 으로 전달
const ChatItem = styled.div`
  padding: 12px;
  background-color: ${({ $highlight }) => ($highlight ? "#f0f8ff" : "white")};
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background-color: #f8f8f8;
  }
`;

const ProfileImage = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 8px;
`;

const UnreadBadge = styled.div`
  background-color: #e53935;
  color: #fff;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
  min-width: 24px;
  text-align: center;
`;

const LoadingText = styled.p`
  text-align: center;
  font-size: 1.2em;
  color: #555;
`;

const ErrorText = styled.p`
  text-align: center;
  font-size: 1.2em;
  color: red;
`;

// — ChatList 컴포넌트 —

export default function ChatList() {
  const { user } = useAuthContext();
  const [roomsRaw, setRoomsRaw] = useState([]);       // onSnapshot로 받은 원본
  const [rooms, setRooms] = useState([]);             // 프로필 병합 후 최종
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 1) Firestore 실시간 구독 (인덱스 필요: participants + lastUpdated)
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, "chats");
    const q = query(
      colRef,
      where("participants", "array-contains", user.uid),
      orderBy("lastUpdated", "desc")
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRoomsRaw(data);
        setLoading(false);
      },
      err => {
        console.error("채팅방 불러오기 오류:", err);
        setError("채팅 목록을 불러오는 중 문제가 발생했습니다.");
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  // 2) 원본 roomsRaw에 participantProfiles 병합
  useEffect(() => {
    if (!roomsRaw.length) {
      setRooms([]);
      return;
    }
    async function enrich() {
      const enriched = await Promise.all(
        roomsRaw.map(async room => {
          // 상대방 UID
          const otherId = room.participants.find(id => id !== user.uid);
          // users/{otherId} 에서 프로필 가져오기
          const userSnap = await getDoc(doc(db, "users", otherId));
          const profile = userSnap.exists()
            ? { uid: otherId, ...userSnap.data() }
            : null;
          return {
            ...room,
            participantProfiles: profile ? [profile] : [],
          };
        })
      );
      setRooms(enriched);
    }
    enrich();
  }, [roomsRaw, user.uid]);

  // 3) 클릭 시 읽음 처리
  const markAsRead = async chatId => {
    const chatDocRef = doc(db, "chats", chatId);
    await runTransaction(db, async tx => {
      const snap = await tx.get(chatDocRef);
      if (!snap.exists()) throw new Error("채팅방이 없습니다.");
      tx.update(chatDocRef, {
        [`unreadCount.${user.uid}`]: 0,
        lastUpdated: serverTimestamp(),
      });
    });
  };

  const onClick = chatId => {
    markAsRead(chatId).catch(console.error);
    navigate(`/chat/${chatId}`);
  };

  // — 렌더링 로직 —
  if (!user) {
    return <Container><LoadingText>로그인이 필요합니다.</LoadingText></Container>;
  }
  if (loading) {
    return <Container><ContentLoader height={60} width={400} /></Container>;
  }
  if (error) {
    return <Container><ErrorText>{error}</ErrorText></Container>;
  }

  return (
    <Container>
      <Heading>채팅 목록</Heading>
      {rooms.length === 0
        ? <LoadingText>채팅방이 없습니다.</LoadingText>
        : rooms.map(room => {
            const unread = room.unreadCount?.[user.uid] || 0;
            const time = room.lastUpdated?.seconds
              ? formatDistanceToNow(
                  new Date(room.lastUpdated.seconds * 1000),
                  { addSuffix: true, locale: ko }
                )
              : "N/A";
            return (
              <ChatItem
                key={room.id}
                onClick={() => onClick(room.id)}
                $highlight={unread > 0}
              >
                <div>
                  <p>
                    참여자:{" "}
                    {room.participantProfiles
                      .map(p => p.displayName || p.uid)
                      .join(", ")}
                  </p>
                  <p>최근: {room.lastMessage || "없음"}</p>
                  <p>{time}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {room.participantProfiles.map(p => (
                    <ProfileImage
                      key={p.uid}
                      src={p.photoURL}
                      alt={p.displayName}
                    />
                  ))}
                  {unread > 0 && <UnreadBadge>{unread}</UnreadBadge>}
                </div>
              </ChatItem>
            );
          })}
    </Container>
  );
}
