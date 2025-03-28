// src/pages/ProductDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { fetchReviews, addReview } from "../services/reviewService";
import ProductReviewList from "../components/reviews/ProductReviewList";
import { useAuthContext } from "../context/AuthContext";
import { createOrGetChatRoom } from "../services/chatService";

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

  useEffect(() => {
    async function fetchProduct() {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (!Array.isArray(data.likes)) {
            data.likes = [];
          }
          setProduct({ id: docSnap.id, ...data });
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  useEffect(() => {
    async function getReviews() {
      try {
        const data = await fetchReviews(id);
        setReviews(data);
      } catch (error) {
        console.error("리뷰를 가져오는 중 오류 발생:", error);
      }
    }
    getReviews();
  }, [id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setReviewLoading(true);
    try {
      const reviewData = {
        userId: user?.uid || "defaultUser",
        userName: user?.displayName || "사용자",
        rating: newRating,
        comment: newComment,
        createdAt: new Date().toISOString(),
      };
      await addReview(id, reviewData);
      const updatedReviews = await fetchReviews(id);
      setReviews(updatedReviews);
      setNewComment("");
      setNewRating(5);
    } catch (error) {
      console.error("리뷰 등록 실패:", error);
    } finally {
      setReviewLoading(false);
    }
  };

  // 판매자와 채팅 시작 (채팅방 생성 또는 검색 후 이동)
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
      console.error("채팅방 생성 오류:", error);
    }
  };

  if (loading) return <p>로딩 중...</p>;
  if (!product) return <p>상품을 찾을 수 없습니다.</p>;

  const createdDate =
    product.createdAt && product.createdAt.seconds
      ? new Date(product.createdAt.seconds * 1000)
      : new Date(product.createdAt);

  return (
    <div style={{ padding: "20px" }}>
      <h1>상품 상세 정보</h1>
      <h2>{product.title}</h2>
      {product.imageUrls?.length > 0 && (
        <img
          src={product.imageUrls[0]}
          alt={product.title}
          style={{ width: "400px", height: "auto", margin: "10px 0" }}
        />
      )}
      <p>{product.description}</p>
      <p>
        가격: {product.price?.toLocaleString("ko-KR") ?? "N/A"}
      </p>
      {product.category && <p>카테고리: {product.category}</p>}
      {product.createdAt && (
        <p style={{ fontSize: "0.9em", color: "#555" }}>
          등록된 시간:{" "}
          {formatDistanceToNow(createdDate, { addSuffix: true, locale: ko })}
        </p>
      )}

      {/* 판매자와 채팅 시작 버튼 */}
      <button onClick={handleStartChat} style={{ marginBottom: "20px" }}>
        판매자에게 채팅하기
      </button>

      <div>
        <h3>상품 리뷰</h3>
        <ProductReviewList reviews={reviews} />
        <h4>리뷰 남기기</h4>
        <form onSubmit={handleSubmitReview}>
          <div>
            <label>평점: </label>
            <select
              value={newRating}
              onChange={(e) => setNewRating(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r}점
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: "10px" }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="리뷰 내용을 작성하세요."
              required
              rows={4}
              style={{ width: "100%" }}
            />
          </div>
          <button type="submit" disabled={reviewLoading}>
            {reviewLoading ? "등록 중..." : "리뷰 등록"}
          </button>
        </form>
      </div>
    </div>
  );
}
