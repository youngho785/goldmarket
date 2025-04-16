  // src/components/chat/ChatList.js
  import React, { useEffect, useState } from "react";
  import { db } from "../../firebase/firebase";
  import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
  import { useAuthContext } from "../../context/AuthContext";
  import { useNavigate } from "react-router-dom";
  import styled from "styled-components";
  import { formatDistanceToNow } from "date-fns";
  import { ko } from "date-fns/locale";

  // 전체 컨테이너 스타일
  const Container = styled.div`
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  `;

  // 채팅 목록 타이틀 스타일
  const Heading = styled.h2`
    font-size: 1.8em;
    text-align: center;
    margin-bottom: 20px;
    color: ${({ theme }) => theme.colors.primary || "#007bff"};
  `;

  // 개별 채팅 항목 스타일
  const ChatItem = styled.div`
    padding: 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: space-between;
    &:hover {
      background-color: #f8f8f8;
    }
  `;

  // 프로필 사진 스타일 (작은 원형 이미지)
  const ProfileImage = styled.img`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 8px;
  `;

  // 읽지 않은 메시지 배지 스타일 ("1"로 표시)
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

  // 로딩 메시지 스타일
  const LoadingText = styled.p`
    text-align: center;
    font-size: 1.2em;
    color: #555;
  `;

  // 에러 메시지 스타일
  const ErrorText = styled.p`
    text-align: center;
    font-size: 1.2em;
    color: red;
  `;

  export default function ChatList() {
    const { user } = useAuthContext();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
      if (!user) return;
      try {
        const colRef = collection(db, "chats");
        // 참가자 배열에 user.uid 포함, lastUpdated 기준 내림차순 정렬
        const qChats = query(
          colRef,
          where("participants", "array-contains", user.uid),
          orderBy("lastUpdated", "desc")
        );
        const unsubscribe = onSnapshot(
          qChats,
          (snapshot) => {
            const rooms = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            setChatRooms(rooms);
            setLoading(false);
          },
          (err) => {
            console.error("채팅방 불러오기 오류:", err);
            setError("채팅 목록을 불러오는 중 오류가 발생했습니다.");
            setLoading(false);
          }
        );
        return () => unsubscribe();
      } catch (err) {
        console.error("초기 채팅 불러오기 실패:", err);
        setError("채팅 목록 초기화 중 오류가 발생했습니다.");
        setLoading(false);
      }
    }, [user]);

    // 채팅방 클릭 시 unreadCount를 0으로 업데이트
    const markChatAsRead = async (chatId) => {
      try {
        await updateDoc(doc(db, "chats", chatId), {
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

    if (!user) return <Container><LoadingText>로그인이 필요합니다.</LoadingText></Container>;
    if (loading) return <Container><LoadingText>로딩 중...</LoadingText></Container>;
    if (error) return <Container><ErrorText>{error}</ErrorText></Container>;

    return (
      <Container>
        <Heading>채팅 목록</Heading>
        {chatRooms.length === 0 ? (
          <p style={{ textAlign: "center" }}>채팅방이 없습니다.</p>
        ) : (
          chatRooms.map((chat) => {
            // 현재 사용자의 읽지 않은 메시지 여부: 있으면 "1"로 표기
            const unread = chat.unreadCount && chat.unreadCount[user.uid] ? chat.unreadCount[user.uid] : 0;
            // 최근 업데이트 시간 표시
            const lastUpdatedTime =
              chat.lastUpdated?.seconds
                ? formatDistanceToNow(new Date(chat.lastUpdated.seconds * 1000), { addSuffix: true, locale: ko })
                : "N/A";
            return (
              <ChatItem key={chat.id} onClick={() => handleClick(chat.id)}>
                <div>
                  <p>
                    참여자:{" "}
                    {chat.participants.filter((uid) => uid !== user.uid).join(", ")}
                  </p>
                  <p>최근 메시지: {chat.lastMessage || "없음"}</p>
                  <p>최근 업데이트: {lastUpdatedTime}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {/* 상대 참여자의 프로필 사진 표시 */}
                  {chat.participantProfiles &&
                    chat.participantProfiles.map((profile) => {
                      if (profile.uid !== user.uid) {
                        return (
                          <ProfileImage
                            key={profile.uid}
                            src={profile.photoURL}
                            alt={profile.displayName}
                          />
                        );
                      }
                      return null;
                    })}
                  {/* 읽지 않은 메시지 배지, unread > 0이면 "1" 표시 */}
                  {unread > 0 && <UnreadBadge>1</UnreadBadge>}
                </div>
              </ChatItem>
            );
          })
        )}
      </Container>
    );
  }
