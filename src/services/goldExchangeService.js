// src/services/goldExchangeService.js
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * 사용자의 금 교환 요청을 처리합니다.
 * @param {Object} params
 * @param {string} params.userId - 사용자의 UID
 * @param {string} params.goldType - 제품의 종류 ("14k(585)", "18k(750)", "순금제품 995", "순금제품 999", "순금기타(문의)")
 * @param {number} params.quantity - 입력된 수량, 단위는 그램(g)으로 변환되어 전달됨
 * @param {string} params.exchangeType - 교환 방식 ("999.9골드바", "999.9 순금덩어리")
 * @returns {Promise<Object>} - 생성된 교환 거래 문서 정보 (계산된 최종 순수 금 중량 포함)
 */
export async function requestGoldExchange({ userId, goldType, quantity, exchangeType }) {
  // 1. 제품의 종류에 따른 보정 계수 설정
  let conversionFactor;
  if (goldType === "14k(585)") {
    conversionFactor = 0.54;
  } else if (goldType === "18k(750)") {
    conversionFactor = 0.72;
  } else if (goldType === "순금제품 995") {
    conversionFactor = 0.97;
  } else if (goldType === "순금제품 999") {
    conversionFactor = 0.98;
  } else if (goldType === "순금기타(문의)") {
    conversionFactor = null;
  }
  if (conversionFactor === null) {
    throw new Error("해당 제품의 교환율은 문의해야 합니다.");
  }
  
  // 2. 입력 수량(그램)에 보정 계수를 적용하여 순수 금 중량 계산 (그램 단위)
  const baseWeight = quantity * conversionFactor;
  let exchangeFactor;
  if (exchangeType === "999.9골드바") {
    exchangeFactor = 0.95;
  } else if (exchangeType === "999.9 순금덩어리") {
    exchangeFactor = 0.98;
  } else {
    throw new Error("유효하지 않은 교환 유형입니다.");
  }
  
  const finalWeight = baseWeight * exchangeFactor;
  
  // 3. Firestore에 교환 거래 내역 저장 (초기 요청)
  const exchangeData = {
    userId,
    goldType,
    quantity,            // 입력한 금 수량 (그램 단위로 변환되어 저장)
    exchangeType,
    conversionFactor,    // 보정율
    finalWeight,         // 계산된 최종 순수 금 중량 (그램)
    status: "requested", // 초기 상태
    createdAt: serverTimestamp(),
  };
  
  try {
    const docRef = await addDoc(collection(db, "goldExchanges"), exchangeData);
    return { id: docRef.id, ...exchangeData };
  } catch (error) {
    throw new Error("금 교환 거래 생성 실패: " + error.message);
  }
}
