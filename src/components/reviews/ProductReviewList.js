import React from "react";
import ProductReview from "./ProductReview";

export default function ProductReviewList({ reviews }) {
  return (
    <div>
      {reviews.length > 0 ? (
        reviews.map((review) => (
          <ProductReview key={review.id} review={review} />
        ))
      ) : (
        <p>아직 리뷰가 없습니다.</p>
      )}
    </div>
  );
}
