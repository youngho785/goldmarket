// src/components/reviews/ProductRating.js
import React from "react";

export default function ProductRating({ rating }) {
  const totalStars = 5;
  // rating 값을 숫자로 변환 (문자열로 저장되어 있으면 숫자로 변환)
  const validRating = Number(rating) || 0;
  return (
    <div style={{ fontFamily: "Arial", fontSize: "1.2em", color: "#ffbf00", display: "inline-block", marginLeft: "10px" }}>
      {[...Array(totalStars)].map((_, i) => (
        <span key={i}>{i < validRating ? "★" : "☆"}</span>
      ))}
    </div>
  );
}
