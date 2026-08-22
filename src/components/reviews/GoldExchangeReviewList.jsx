//src/components/reviews/GoldExchangeReviewList.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px 13px;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Score = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 1.45rem;
  line-height: 1;
`;

const Stars = styled.span`
  color: ${({ theme }) => theme.colors.secondaryDark};
  letter-spacing: 0.07em;
`;

const SummaryText = styled.span`
  font-size: 0.82rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const ReviewCard = styled.article`
  display: flex;
  flex-direction: column;
  min-height: 220px;
  padding: 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const CardHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const CardStars = styled(Stars)`
  font-size: 0.92rem;
`;

const Verified = styled.span`
  flex: 0 0 auto;
  padding: 5px 8px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.67rem;
  font-weight: 850;
  white-space: nowrap;
`;

const Comment = styled.blockquote`
  flex: 1;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.96rem;
  line-height: 1.72;
  word-break: keep-all;
`;

const ReviewMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding-top: 13px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.76rem;

  time {
    white-space: nowrap;
  }
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
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
    line-height: 1.6;
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

function normalizeRating(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.min(5, Math.max(1, Math.round(number)));
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
        const nextReviews = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setReviews(nextReviews);
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

    const total = reviews.reduce(
      (sum, review) => sum + normalizeRating(review.rating),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  if (loading) {
    return (
      <Empty>
        <strong>교환 후기를 불러오는 중입니다.</strong>
        <p>잠시만 기다려 주세요.</p>
      </Empty>
    );
  }

  if (error) {
    return (
      <Empty>
        <strong>{error}</strong>
        <p>잠시 후 다시 확인해 주세요.</p>
      </Empty>
    );
  }

  if (!reviews.length) {
    return (
      <Empty>
        <strong>아직 등록된 교환 후기가 없습니다.</strong>
        <p>실제 교환이 완료된 고객의 후기만 이곳에 공개됩니다.</p>
      </Empty>
    );
  }

  const roundedAverage = Math.round(average);

  return (
    <>
      <Summary
        aria-label={`공개 교환 후기 ${reviews.length}건, 평균 ${average.toFixed(
          1
        )}점`}
      >
        <Score>{average.toFixed(1)}</Score>

        <Stars aria-hidden="true">
          {"★".repeat(roundedAverage)}
          {"☆".repeat(5 - roundedAverage)}
        </Stars>

        <SummaryText>
          최근 공개된 교환 완료 후기 {reviews.length}건
        </SummaryText>
      </Summary>

      <Grid>
        {reviews.map((review) => {
          const rating = normalizeRating(review.rating);
          const formattedDate = formatDate(review.createdAt);

          return (
            <ReviewCard key={review.id}>
              <CardHead>
                <CardStars aria-label={`평점 ${rating}점`}>
                  {"★".repeat(rating)}
                  {"☆".repeat(5 - rating)}
                </CardStars>

                {review.verified === true && (
                  <Verified>교환 완료 확인</Verified>
                )}
              </CardHead>

              <Comment>
                “{String(review.comment || "").trim()}”
              </Comment>

              <ReviewMeta>
                <span>
                  {review.reviewerLabel || "교환 완료 고객"}
                </span>

                {formattedDate && (
                  <time>{formattedDate}</time>
                )}
              </ReviewMeta>
            </ReviewCard>
          );
        })}
      </Grid>
    </>
  );
}