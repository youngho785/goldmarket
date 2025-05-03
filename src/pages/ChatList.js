// src/pages/ChatList.js
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc as docRef,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import ContentLoader from "react-content-loader";

// Styled-components
const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.background || "#f7f9fa"};
  border-radius: 8px;
`;
const Heading = styled.h2`
  font-size: 2em;
  text-align: center;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
`;
const RoomList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
const RoomItem = styled.div`
  padding: 16px;
  background: ${({ highlight }) => (highlight ? "#e3f2fd" : "#fff")};
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  &:hover {
    transform: translateY(-1px);
  }
`;
const Info = styled.div`
  flex: 1;
  margin-right: 12px;
`;
const RoomText = styled.p`
  margin: 4px 0;
  color: #333;
`;
const Metadata = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const ProductInfo = styled.div`
  display: flex;
  align-items: center;
  margin-top: 8px;
`;
const ProductImage = styled.img`
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 8px;
`;
const LoaderWrapper = styled.div`
  padding: 40px;
  text-align: center;
`;
const ErrorText = styled.p`
  color: red;
  text-align: center;
  padding: 20px;
`;

export default function ChatList() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastUpdated", "desc")
    );
    const unsub = onSnapshot(
      q,
      async (snap) => {
        try {
          // 각 채팅방 문서에서 productId 읽어서 상품 조회
          const data = await Promise.all(
            snap.docs.map(async (d) => {
              const chat = { id: d.id, ...d.data() };
              if (chat.productId) {
                const prodSnap = await getDoc(docRef(db, "products", chat.productId));
                if (prodSnap.exists()) {
                  chat.product = prodSnap.data();
                }
              }
              return chat;
            })
          );
          setRooms(data);
        } catch (e) {
          console.error("상품 정보 로드 오류:", e);
          setError("상품 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("채팅 목록 구독 오류:", err);
        setError("채팅 목록을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const markRead = async (id) => {
    try {
      await updateDoc(docRef(db, "chats", id), {
        [`unreadCount.${user.uid}`]: 0,
      });
    } catch (e) {
      console.error("읽음 처리 실패:", e);
    }
  };

  const handleClick = (id) => {
    markRead(id);
    navigate(`/chat/${id}`);
  };

  if (!user) return <ErrorText>로그인이 필요합니다.</ErrorText>;
  if (loading) {
    return (
      <Container>
        <LoaderWrapper>
          <ContentLoader
            height={100}
            width={400}
            speed={2}
            backgroundColor="#f3f3f3"
            foregroundColor="#ecebeb"
          >
            <rect x="0" y="20" rx="4" ry="4" width="400" height="20" />
            <rect x="0" y="50" rx="4" ry="4" width="350" height="20" />
            <rect x="0" y="80" rx="4" ry="4" width="380" height="20" />
          </ContentLoader>
        </LoaderWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Heading>채팅 목록</Heading>
      {error && <ErrorText>{error}</ErrorText>}
      {!error && rooms.length === 0 && <RoomText>참여 중인 채팅방이 없습니다.</RoomText>}
      <RoomList>
        {rooms.map((room) => {
          const unread = room.unreadCount?.[user.uid] || 0;
          const time = room.lastUpdated?.seconds
            ? formatDistanceToNow(new Date(room.lastUpdated.seconds * 1000), {
                addSuffix: true,
                locale: ko,
              })
            : "";
          return (
            <RoomItem
              key={room.id}
              highlight={unread > 0}
              onClick={() => handleClick(room.id)}
            >
              <Info>
                <RoomText>
                  <strong>상대방:</strong>{" "}
                  {room.participants.filter((u) => u !== user.uid).join(", ")}
                </RoomText>
                <RoomText>
                  <strong>최근 메시지:</strong> {room.lastMessage || "없음"}
                </RoomText>
                <Metadata>
                  <RoomText>
                    <strong>새 메시지:</strong> {unread}
                  </RoomText>
                  <RoomText>
                    <strong>시간:</strong> {time}
                  </RoomText>
                </Metadata>
                {room.product && (
                  <ProductInfo>
                    {room.product.imageUrls?.[0] && (
                      <ProductImage src={room.product.imageUrls[0]} alt="" />
                    )}
                    <span>{room.product.title}</span>
                  </ProductInfo>
                )}
              </Info>
            </RoomItem>
          );
        })}
      </RoomList>
    </Container>
  );
}
