  // src/pages/ProductDetail.js

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { fetchReviews } from "../services/reviewService"; // 기존 상품 리뷰 서비스
import { addTransactionReview } from "../services/transactionReviewService"; // 거래 평가 저장 서비스
import ProductReviewList from "../components/reviews/ProductReviewList";
import { useAuthContext } from "../context/AuthContext";
import { createOrGetChatRoom } from "../services/chatService";
import { checkPurchasePermission } from "../services/orderService";
import styled from "styled-components";

// Form 관련 Styled-components
const Label = styled.label`
  font-size: 1rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
  display: block;
`;

const Select = styled.select`
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
`;

const TextArea = styled.textarea`
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  resize: vertical;
`;

// 페이지 레이아웃 Styled-components
const Container = styled.div`
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2em;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
  text-align: center;
`;

const SubTitle = styled.h2`
  font-size: 1.5em;
  color: #333;
  margin-bottom: 10px;
  text-align: center;
`;

const ImageSlider = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  margin: 10px 0;
  padding-bottom: 10px;
`;

const ProductImage = styled.img`
  width: 400px;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
`;

const InfoText = styled.p`
  font-size: 1.1em;
  color: #555;
`;

const Timestamp = styled.p`
  font-size: 0.9em;
  color: #777;
  text-align: center;
  margin-bottom: 20px;
`;

const Button = styled.button`
  margin: 10px 5px;
  padding: 10px 16px;
  background-color: ${({ theme }) => theme.colors.primary || "#007bff"};
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondary || "#0056b3"};
  }
`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [error, setError] = useState("");

  // 상품 정보 불러오기
  useEffect(() => {
    async function fetchProduct() {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // 누락된 필드에 대해 기본값 설정
          if (typeof data.completed === "undefined") data.completed = false;
          if (!Array.isArray(data.likes)) data.likes = [];
          setProduct({ id: docSnap.id, ...data });
        } else {
          setError("해당 상품을 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setError("상품 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // 상품 리뷰 불러오기
  useEffect(() => {
    async function getReviews() {
      try {
        const data = await fetchReviews(id);
        setReviews(data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    }
    getReviews();
  }, [id]);

  // 구매자 권한 확인
  useEffect(() => {
    async function verifyReviewPermission() {
      if (user && product) {
        try {
          const permission = await checkPurchasePermission(user.uid, product.id);
          setCanReview(permission);
        } catch (error) {
          console.error("Error checking purchase permission:", error);
        }
      }
    }
    verifyReviewPermission();
  }, [user, product]);

  // 거래 평가 제출 (구매자 전용)
  const handleSubmitTransactionReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setReviewLoading(true);
    try {
      const transactionReview = {
        sellerId: product.sellerId,
        buyerId: user.uid,
        rating: newRating,
        comment: newComment,
        createdAt: new Date().toISOString(),
      };
      await addTransactionReview(transactionReview);
      alert("거래 평가가 제출되었습니다.");
      setNewComment("");
      setNewRating(5);
      // 리뷰 새로고침
      const updatedReviews = await fetchReviews(id);
      setReviews(updatedReviews);
    } catch (error) {
      console.error("Error submitting transaction review:", error);
      alert("거래 평가 등록에 실패했습니다.");
    } finally {
      setReviewLoading(false);
    }
  };

  // 판매자와 채팅 시작
  const handleStartChat = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (!product?.sellerId) {
      alert("판매자 정보가 없습니다.");
      return;
    }
    try {
      const chatRoomId = await createOrGetChatRoom(user.uid, product.sellerId, product.id);
      navigate(`/chat/${chatRoomId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("채팅을 시작하는 중 오류가 발생했습니다.");
    }
  };

  // 판매자 거래 완료 처리
  const markAsCompleted = async () => {
    try {
      await updateDoc(doc(db, "products", id), { completed: true });
      setProduct((prev) => ({ ...prev, completed: true }));
      alert("거래 완료 처리되었습니다. 이제 구매자는 거래 평가를 남길 수 있습니다.");
    } catch (error) {
      console.error("Error marking as completed:", error);
      alert("거래 완료 처리에 실패했습니다.");
    }
  };

  if (loading) return <Container>로딩 중...</Container>;
  if (error) return <Container>{error}</Container>;
  if (!product) return <Container>상품을 찾을 수 없습니다.</Container>;

  const createdDate =
    product.createdAt && product.createdAt.seconds
      ? new Date(product.createdAt.seconds * 1000)
      : new Date(product.createdAt);

  return (
    <Container>
      <Title>상품 상세 정보</Title>
      <SubTitle>{product.title}</SubTitle>
      {product.imageUrls?.length > 0 ? (
        <ImageSlider>
          {product.imageUrls.map((url, index) => (
            <ProductImage
              key={index}
              src={url}
              alt={`${product.title} 이미지 ${index + 1}`}
            />
          ))}
        </ImageSlider>
      ) : (
        <p>이미지가 없습니다.</p>
      )}
      <InfoText>{product.description}</InfoText>
      <InfoText>
        가격: {product.price?.toLocaleString("ko-KR") ?? "N/A"}
      </InfoText>
      {product.category && <InfoText>카테고리: {product.category}</InfoText>}
      {product.createdAt && (
        <Timestamp>
          등록된 시간:{" "}
          {formatDistanceToNow(createdDate, { addSuffix: true, locale: ko })}
        </Timestamp>
      )}
      <Button onClick={handleStartChat}>판매자에게 채팅하기</Button>
      {product.completed ? (
        <div>
          <Title>상품 리뷰</Title>
          <ProductReviewList reviews={reviews} />
          {user && product.sellerId !== user.uid ? (
            canReview ? (
              <>
                <SubTitle>거래 평가 남기기</SubTitle>
                <form onSubmit={handleSubmitTransactionReview}>
                  <div>
                    <Label>평점:</Label>
                    <Select
                      value={newRating}
                      onChange={(e) => setNewRating(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <option key={val} value={val}>
                          {val}점
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div style={{ marginTop: "10px" }}>
                    <TextArea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="거래 평가 내용을 작성하세요."
                      required
                      rows={4}
                    ></TextArea>
                  </div>
                  <Button type="submit" disabled={reviewLoading}>
                    {reviewLoading ? "등록 중..." : "평가 제출"}
                  </Button>
                </form>
              </>
            ) : (
              <InfoText>
                구매하신 내역이 없으므로 거래 평가를 남길 수 없습니다.
              </InfoText>
            )
          ) : (
            <InfoText>판매자는 거래 평가를 남길 수 없습니다.</InfoText>
          )}
        </div>
      ) : (
        user && product.sellerId === user.uid ? (
          <Button onClick={markAsCompleted} style={{ marginBottom: "20px" }}>
            거래 완료 처리
          </Button>
        ) : (
          <InfoText>
            거래가 완료되어야 리뷰 및 거래 평가를 남길 수 있습니다.
          </InfoText>
        )
      )}
    </Container>
  );
}
