import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Score = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 1.5rem;
`;

const Stars = styled.span`
  color: ${({ theme }) => theme.colors.secondaryDark};
  letter-spacing: .08em;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const ReviewCard = styled.article`
  display: flex;
  flex-direction: column;
  min-height: 225px;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const CardHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Verified = styled.span`
  padding: 5px 8px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .68rem;
  font-weight: 850;
`;

const Comment = styled.blockquote`
  flex: 1;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  line-height: 1.75;
  word-break: keep-all;
`;

const ReviewMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .78rem;
`;

const Empty = styled.div`
  padding: clamp(30px, 5vw, 52px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  text-align: center;

  strong {
    display: block;
    margin-bottom: 8px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.08rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function GoldExchangeReviewList({ limitCount = 6 }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const reviewsQuery = query(
      collection(db, "verifiedGoldExchangeReviews"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        setReviews(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setError("");
        setLoading(false);
      },
      (nextError) => {
        console.error("검증 교환 후기 조회 실패:", nextError);
        setError("교환 후기를 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [limitCount]);

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    return (
      reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      reviews.length
    );
  }, [reviews]);

  if (loading) {
    return (
      <Empty role="status">
        <strong>교환 후기를 불러오는 중입니다</strong>
      </Empty>
    );
  }

  if (error) {
    return (
      <Empty role="alert">
        <strong>{error}</strong>
        <p>잠시 후 다시 확인해 주세요.</p>
      </Empty>
    );
  }

  if (!reviews.length) {
    return (
      <Empty>
        <strong>아직 등록된 교환 후기가 없습니다</strong>
        <p>실제 교환이 완료된 고객의 후기만 이곳에 공개됩니다.</p>
      </Empty>
    );
  }

  return (
    <>
      <Summary aria-label={`교환 후기 ${reviews.length}건, 평균 ${average.toFixed(1)}점`}>
        <Score>{average.toFixed(1)}</Score>
        <Stars aria-hidden="true">
          {"★".repeat(Math.round(average))}
          {"☆".repeat(5 - Math.round(average))}
        </Stars>
        <span>공개된 교환 완료 후기 {reviews.length}건</span>
      </Summary>
      <Grid>
        {reviews.map((review) => {
          const rating = Math.min(5, Math.max(1, Number(review.rating || 1)));
          return (
            <ReviewCard key={review.id}>
              <CardHead>
                <Stars aria-label={`평점 ${rating}점`}>
                  {"★".repeat(rating)}
                  {"☆".repeat(5 - rating)}
                </Stars>
                <Verified>교환 완료 확인</Verified>
              </CardHead>
              <Comment>“{review.comment}”</Comment>
              <ReviewMeta>
                <span>{review.reviewerLabel || "교환 완료 고객"}</span>
                <time>{formatDate(review.createdAt)}</time>
              </ReviewMeta>
            </ReviewCard>
          );
        })}
      </Grid>
    </>
  );
}
