// src/components/reviews/ProductReview.js
import React from "react";
import ProductRating from "./ProductRating";

export default function ProductReview({ review }) {
  return (
    <div style={{ borderBottom: "1px solid #ccc", padding: "10px 0" }}>
      <p>
        <strong>{review.userName}</strong>
        <ProductRating rating={Number(review.rating)} />
      </p>
      <p>{review.comment}</p>
    </div>
  );
}
