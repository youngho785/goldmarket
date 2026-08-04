// src/services/transactionReviewService.js
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/firebase";

export async function addTransactionReview(reviewData) {
  const fn = httpsCallable(functions, "submitTransactionReview");
  const { data } = await fn({
    orderId: reviewData.orderId,
    rating: reviewData.rating,
    comment: reviewData.comment,
  });
  return data?.reviewId || reviewData.orderId;
}
