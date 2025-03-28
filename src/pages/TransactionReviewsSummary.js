// src/pages/TransactionReviewsSummary.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function TransactionReviewsSummary({ sellerId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(null);
  const [filterRating, setFilterRating] = useState(""); // 평점 필터
  const [sortOption, setSortOption] = useState("desc"); // 정렬 옵션: desc (최신순) 또는 asc (오래된 순)

  useEffect(() => {
    if (!sellerId) return;
    // onSnapshot을 이용해 실시간 업데이트
    const q = query(
      collection(db, "transactionReviews"),
      where("sellerId", "==", sellerId),
      orderBy("createdAt", sortOption)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let reviewsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // 평점 필터 적용 (필터 값이 있으면 해당 평점과 일치하는 리뷰만)
        if (filterRating) {
          reviewsList = reviewsList.filter(review => review.rating === Number(filterRating));
        }
        setReviews(reviewsList);

        if (reviewsList.length > 0) {
          const total = reviewsList.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating((total / reviewsList.length).toFixed(1));
        } else {
          setAverageRating("없음");
        }
        setLoading(false);
      },
      (error) => {
        console.error("평가 내역 실시간 업데이트 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sellerId, sortOption, filterRating]);

  // 관리자 제어: 평가 삭제 기능 (예시)
  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteDoc(doc(db, "transactionReviews", reviewId));
      alert("리뷰가 삭제되었습니다.");
    } catch (error) {
      console.error("리뷰 삭제 실패:", error);
    }
  };

  if (loading) return <p>평가 내역 로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>거래 평가 내역</h2>
      <div>
        <label>
          평균 평점: {averageRating} (총 {reviews.length}건)
        </label>
      </div>
      {/* 필터 및 정렬 옵션 */}
      <div style={{ margin: "10px 0" }}>
        <label>평점 필터: </label>
        <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
          <option value="">전체</option>
          {[1, 2, 3, 4, 5].map(val => (
            <option key={val} value={val}>{val}점</option>
          ))}
        </select>
        <label style={{ marginLeft: "20px" }}>정렬: </label>
        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
          <option value="desc">최신순</option>
          <option value="asc">오래된 순</option>
        </select>
      </div>
      {reviews.length === 0 ? (
        <p>등록된 평가 내역이 없습니다.</p>
      ) : (
        <ul>
          {reviews.map((review) => (
            <li key={review.id} style={{ marginBottom: "10px", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
              <p>평점: {review.rating}점</p>
              <p>리뷰: {review.comment}</p>
              {review.createdAt && review.createdAt.seconds && (
                <p style={{ fontSize: "0.8em", color: "#999" }}>
                  {formatDistanceToNow(new Date(review.createdAt.seconds * 1000), { addSuffix: true, locale: ko })}
                </p>
              )}
              {/* 관리자 제어 버튼: 평가 삭제 */}
              <button onClick={() => handleDeleteReview(review.id)}>삭제</button>
            </li>
          ))}
        </ul>
      )}

      {/* 시각화: 추후 차트 라이브러리를 활용한 그래프 추가 가능 */}
    </div>
  );
}
