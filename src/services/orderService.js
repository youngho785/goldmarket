import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function checkPurchasePermission(userId, productId) {
  const ordersQuery = query(
    collection(db, "orders"),
    where("buyerId", "==", userId),
    where("productId", "==", productId),
    where("status", "==", "completed")
  );
  const querySnapshot = await getDocs(ordersQuery);
  return !querySnapshot.empty;
}