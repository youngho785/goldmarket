// src/components/CompleteTransactionButton.js
import React from "react";
import { addTransaction } from "../services/transactionService";
import { useAuthContext } from "../context/AuthContext";

export default function CompleteTransactionButton({ productId, price, sellerId }) {
  const { user } = useAuthContext(); // 구매자 정보

  const handleCompleteTransaction = async () => {
    try {
      const transactionData = {
        buyerId: user.uid,
        sellerId,    // 상품 등록 시 저장된 판매자 UID
        productId,   // 거래된 상품 ID
        price,       // 거래 가격
        paymentMethod: "credit_card", // 예시로 결제 방식 지정 (필요 시 동적으로 설정)
        status: "completed", // 거래 완료 상태
      };
      await addTransaction(transactionData);
      alert("거래가 성공적으로 완료되었습니다.");
    } catch (error) {
      alert("거래 처리 중 오류가 발생했습니다.");
      console.error(error);
    }
  };

  return <button onClick={handleCompleteTransaction}>거래 완료</button>;
}
