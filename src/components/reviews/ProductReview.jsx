import React, { memo, useMemo } from "react";
import styled from "styled-components";
import { format } from "date-fns";
import ProductRating from "./ProductRating";

/* ---------- styled ---------- */
const Wrap = styled.article`
  border-bottom: 1px solid #e9e9e9;
  padding: 14px 0;
  color: ${({ theme }) => theme.colors?.text || "#222"};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;

  .name {
    font-weight: 700;
    font-size: 0.95rem;
  }
`;

const Meta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors?.textSecondary || "#666"};
`;

const Comment = styled.p`
  margin: 8px 0 0;
  line-height: 1.5;
  white-space: pre-wrap;
`;

/* ---------- utils ---------- */
function toDateSafe(v) {
  if (!v) return null;
  // Firestore Timestamp (v.seconds / v.nanoseconds) OR v.toDate()
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v?.seconds === "number") {
    const ms = v.seconds * 1000 + (v.nanoseconds ? v.nanoseconds / 1e6 : 0);
    return new Date(ms);
  }
  // JS Date
  if (v instanceof Date) return v;
  // epoch ms
  if (typeof v === "number") return new Date(v);
  return null;
}

function clampRating(n) {
  const x = Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(5, x));
}

/* ---------- component ---------- */
function ProductReviewBase({ review }) {
  const name = review?.userName?.trim() || "익명 사용자";
  const rating = clampRating(Number(review?.rating));
  const hasComment = typeof review?.comment === "string" && review.comment.trim().length > 0;

  const createdAtText = useMemo(() => {
    const d = toDateSafe(review?.createdAt);
    return d ? format(d, "yyyy.MM.dd HH:mm") : null;
  }, [review?.createdAt]);

  return (
    <Wrap>
      <Header>
        <span className="name">{name}</span>
        <ProductRating rating={rating} />
      </Header>

      {createdAtText && <Meta><time dateTime={createdAtText}>{createdAtText}</time></Meta>}

      <Comment>{hasComment ? review.comment : "내용 없음"}</Comment>
    </Wrap>
  );
}

export default memo(ProductReviewBase);
