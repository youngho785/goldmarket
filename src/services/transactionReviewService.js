// src/services/transactionReviewService.js
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function addTransactionReview(reviewData) {
  const reviewRef = await addDoc(collection(db, "transactionReviews"), reviewData);
  return reviewRef.id;
}
