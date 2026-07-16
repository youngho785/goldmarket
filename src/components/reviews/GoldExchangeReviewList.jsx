// src/components/reviews/GoldExchangeReviewList.js
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import styled from "styled-components";

const ReviewContainer = styled.div`
  margin-top: 16px;
`;

const ReviewItem = styled.div`
  border-bottom: 1px solid #eee;
  padding: 10px 0;
`;

const Reviewer = styled.span`
  font-weight: bold;
  margin-right: 10px;
`;

const CommentText = styled.div`
  font-size: 1rem;
`;

const DateText = styled.div`
  font-size: 0.9rem;
  color: #888;
  margin-top: 3px;
`;

export default function GoldExchangeReviewList({ exchangeId }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!exchangeId) {
      setReviews([]);
      return;
    }
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, "goldExchangeReviews"),
          where("exchangeId", "==", exchangeId),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userName: data.userName || "익명",
            comment: data.comment || "",
            createdAt: data.createdAt,
          };
        });
        setReviews(list);
      } catch (err) {
        console.error("리뷰 로드 중 오류:", err);
      }
    };
    fetchReviews();
  }, [exchangeId]);

  if (!exchangeId) return null;

  return (
    <ReviewContainer>
      {reviews.length === 0 ? (
        <div>아직 리뷰가 없습니다.</div>
      ) : (
        reviews.map(review => (
          <ReviewItem key={review.id}>
            <Reviewer>{review.userName}</Reviewer>
            <CommentText>{review.comment}</CommentText>
            <DateText>
              {review.createdAt?.toDate
                ? review.createdAt.toDate().toLocaleDateString()
                : ""}
            </DateText>
          </ReviewItem>
        ))
      )}
    </ReviewContainer>
  );
}
