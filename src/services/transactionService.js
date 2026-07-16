// src/services/transactionService.js
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";

// 거래 데이터를 추가하는 함수
export const addTransaction = async (transactionData) => {
  try {
    // 거래 문서를 생성할 때 createdAt 필드를 서버 타임스탬프로 설정합니다.
    const docRef = await addDoc(collection(db, "transactions"), {
      ...transactionData,
      createdAt: serverTimestamp(),
    });
    console.log("거래 데이터 추가 성공, 문서 ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("거래 데이터 추가 실패:", error);
    throw error;
  }
};

// 거래 데이터를 조회하는 함수 (최신순 정렬)
export const getTransactions = async () => {
  try {
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return transactions;
  } catch (error) {
    console.error("거래 데이터 조회 실패:", error);
    throw error;
  }
};
