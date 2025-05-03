// src/pages/ChatRoom.js
import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  sendMessage,
  sendImageMessage,
  subscribeToMessages,
} from "../services/chatService";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import ContentLoader from "react-content-loader";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const Container = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
`;
const Header = styled.h2`
  text-align: center;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
`;
const ProductBanner = styled.div`
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  background: #f1f1f1;
  border-radius: 8px;
  cursor: pointer;
  &:hover { background: #e0e0e0; }
`;
const ProductImage = styled.img`
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 12px;
`;
const ProductInfo = styled.div`
  display: flex;
  flex-direction: column;
`;
const ProductTitle = styled.span`
  font-weight: bold;
  font-size: 1em;
`;
const ProductPrice = styled.span`
  color: #666;
  font-size: 0.9em;
  margin-top: 4px;
`;
const LoaderContainer = styled.div`
  padding: 40px;
  text-align: center;
`;
const MessagesWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
`;
// transient prop to avoid warning
const MessageBubble = styled.div`
  max-width: 70%;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: ${({ $isOwn }) => ($isOwn ? "#dcf8c6" : "#fff")};
  align-self: ${({ $isOwn }) => ($isOwn ? "flex-end" : "flex-start")};
  position: relative;
`;
const Sender = styled.span`
  display: block;
  font-size: 0.85em;
  color: #555;
  margin-bottom: 4px;
`;
const Time = styled.span`
  font-size: 0.75em;
  color: #999;
  margin-left: 8px;
`;
const InputArea = styled.div`
  display: flex;
  margin-top: 16px;
  align-items: flex-end;
`;
const TextInput = styled.textarea`
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  resize: none;
  height: 60px;
`;
const SendButton = styled.button`
  margin-left: 8px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:disabled {
    background: #aaa;
    cursor: not-allowed;
  }
`;
const ImageInput = styled.input`
  margin-top: 8px;
`;
const ImagePreview = styled.img`
  max-width: 80px;
  max-height: 80px;
  object-fit: cover;
  border-radius: 8px;
  margin-top: 8px;
`;
const ErrorText = styled.p`
  color: red;
  text-align: center;
  margin-top: 8px;
`;

export default function ChatRoom() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // Clean up blob URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 1) 인증 정보 로딩 중
  if (authLoading) {
    return <Container>인증 정보를 불러오는 중...</Container>;
  }
  // 2) 로그인하지 않은 경우
  if (!user) {
    navigate("/login");
    return null;
  }

  // 상품 정보 로드
  useEffect(() => {
    async function fetchProduct() {
      const chatSnap = await getDoc(doc(db, "chats", chatId));
      if (chatSnap.exists() && chatSnap.data().productId) {
        const prodSnap = await getDoc(
          doc(db, "products", chatSnap.data().productId)
        );
        if (prodSnap.exists()) {
          setProduct({ id: prodSnap.id, ...prodSnap.data() });
        }
      }
    }
    fetchProduct();
  }, [chatId]);

  // 메시지 구독 & 읽음 처리
  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // 읽음 처리
      msgs.forEach(async (msg) => {
        if (!msg.readBy?.includes(user.uid)) {
          await updateDoc(
            doc(db, "chats", chatId, "messages", msg.id),
            { readBy: [...(msg.readBy || []), user.uid] }
          );
        }
      });
    });
    return () => unsubscribe();
  }, [chatId, user.uid]);

  // 메시지가 바뀌거나 로딩 끝나면 스크롤
  useEffect(() => {
    if (!loading && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // 텍스트 메시지 전송
  const handleSendText = async () => {
    if (!newText.trim()) return;
    try {
      await sendMessage(chatId, user.uid, newText.trim());
      setNewText("");
    } catch {
      setError("메시지 전송에 실패했습니다.");
    }
  };

  // 이미지 파일 선택 & preview URL 생성
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // 이미지 메시지 전송
  const handleSendImage = async () => {
    if (!imageFile) return;
    try {
      await sendImageMessage(chatId, user.uid, imageFile);
      // cleanup preview
      URL.revokeObjectURL(previewUrl);
      setImageFile(null);
      setPreviewUrl(null);
    } catch {
      setError("이미지 전송에 실패했습니다.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <Container>
      <Header>채팅방</Header>

      {product && (
        <ProductBanner onClick={() => navigate(`/product/${product.id}`)}>
          {product.imageUrls?.[0] && (
            <ProductImage src={product.imageUrls[0]} alt="" />
          )}
          <ProductInfo>
            <ProductTitle>{product.title}</ProductTitle>
            <ProductPrice>{product.price?.toLocaleString()}원</ProductPrice>
          </ProductInfo>
        </ProductBanner>
      )}

      {loading ? (
        <LoaderContainer>
          <ContentLoader
            height={80}
            width={400}
            backgroundColor="#f3f3f3"
            foregroundColor="#ecebeb"
          >
            <rect x="0" y="20" rx="4" ry="4" width="400" height="20" />
            <rect x="0" y="50" rx="4" ry="4" width="350" height="20" />
          </ContentLoader>
        </LoaderContainer>
      ) : (
        <MessagesWrapper ref={containerRef}>
          {messages.length === 0 ? (
            <Sender>메시지가 없습니다.</Sender>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender === user.uid;
              return (
                <MessageBubble key={msg.id} $isOwn={isOwn}>
                  <Sender>
                    {isOwn ? "나" : msg.sender}
                    <Time>
                      {msg.timestamp?.toDate &&
                        formatDistanceToNow(msg.timestamp.toDate(), {
                          addSuffix: true,
                          locale: ko,
                        })}
                    </Time>
                  </Sender>
                  {msg.text && <div>{msg.text}</div>}
                  {msg.imageUrl && (
                    <ImagePreview src={msg.imageUrl} alt="이미지" />
                  )}
                </MessageBubble>
              );
            })
          )}
        </MessagesWrapper>
      )}

      <InputArea>
        <TextInput
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력..."
        />
        <SendButton onClick={handleSendText} disabled={!newText.trim()}>
          전송
        </SendButton>
      </InputArea>

      <ImageInput type="file" accept="image/*" onChange={handleImageChange} />
      {previewUrl && (
        <>
          <ImagePreview src={previewUrl} alt="미리보기" />
          <SendButton onClick={handleSendImage}>
            이미지 전송
          </SendButton>
        </>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
}
