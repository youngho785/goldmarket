import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "@/firebase/firebase";

const functions = getFunctions(app, "asia-northeast3");

export async function getMyGoldExchangeReview(exchangeId) {
  if (!exchangeId) return null;

  const claimSnap = await getDoc(doc(db, "goldExchangeReviewClaims", exchangeId));
  if (!claimSnap.exists()) return null;

  const reviewId = String(claimSnap.data()?.reviewId || "");
  if (!reviewId) return null;

  const reviewSnap = await getDoc(doc(db, "verifiedGoldExchangeReviews", reviewId));
  return reviewSnap.exists()
    ? { id: reviewSnap.id, ...reviewSnap.data() }
    : null;
}

export async function submitGoldExchangeReview({ exchangeId, rating, comment }) {
  const call = httpsCallable(functions, "submitGoldExchangeReview");

  try {
    const response = await call({ exchangeId, rating, comment });
    return response?.data ?? { ok: false };
  } catch (error) {
    const rawCode = String(error?.code || "");
    const normalized = rawCode.startsWith("functions/")
      ? rawCode.slice("functions/".length)
      : rawCode;
    const nextError = new Error(error?.message || "후기 등록에 실패했습니다.");
    nextError.code = normalized;
    throw nextError;
  }
}
