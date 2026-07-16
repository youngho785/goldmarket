// src/services/goldExchangeService.js
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";

// 🔗 공용 goldrates 모듈
import {
  getGoldRatesOnce,
  normalizeGoldType,
  roundTo3Custom,
  DEFAULT_EXCHANGE,
} from "@/lib/goldRates";

/**
 * 금 교환 요청 생성
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string=} params.goldType  아래 중 하나 또는 "미확인"
 *   - "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)"
 *   - "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)"
 *   - "순금 995제품(목걸이,팔찌,반지,귀걸이)"
 *   - "순금 999제품(목걸이,팔찌,반지,귀걸이)"
 *   - "순금 열쇠"
 *   - "순금 동물모양(거북이,두꺼비 등)"
 *   - "순금 마고자 단추 / 색상이 들어있는 제품"
 *   - "999 순금덩어리"
 *   - "기타(문의)"
 * @param {number|string=} params.quantity  수량(그램)
 * @param {string} params.exchangeType  "999.9골드바"만 허용
 * @param {boolean=} params.unknown  미확인 플래그
 * @returns {Promise<{id:string}&Record<string, any>>}
 */
export async function requestGoldExchange({
  userId,
  goldType,
  quantity,
  exchangeType,
  unknown = false,
}) {
  if (!userId) throw new Error("userId가 필요합니다.");
  if (exchangeType !== "999.9골드바") {
    throw new Error("유효하지 않은 교환 유형입니다. (허용: 999.9골드바)");
  }

  // 문자열도 안전하게 숫자 변환
  const qtyNum =
    typeof quantity === "number" && isFinite(quantity)
      ? quantity
      : isFinite(Number(quantity))
      ? Number(quantity)
      : undefined;

  // Firestore 설정 1회 조회(모듈에서 레거시키 정규화/병합 처리)
  const { purity: purityMap, exchange: exchangeMap } = await getGoldRatesOnce(db);

  const normalizedType = normalizeGoldType(goldType);
  const purityFactor =
    normalizedType && typeof purityMap[normalizedType] === "number"
      ? purityMap[normalizedType]
      : undefined;
  const exchangeFactor =
    typeof exchangeMap[exchangeType] === "number"
      ? exchangeMap[exchangeType]
      : DEFAULT_EXCHANGE["999.9골드바"];

  // ‘기타(문의)’/미확인/수량없음 → unknown 처리
  const isUnknown =
    unknown === true ||
    normalizedType === "기타(문의)" ||
    !purityFactor ||
    !qtyNum ||
    qtyNum <= 0;

  let exchangeData;

  if (isUnknown) {
    exchangeData = {
      userId,
      goldType: goldType || "미확인",
      quantity: qtyNum || 0,
      exchangeType,
      conversionFactor: null,
      finalWeight: 0,
      unknown: true,
      status: "requested",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  } else {
    const finalWeight = roundTo3Custom(qtyNum * purityFactor * exchangeFactor);
    exchangeData = {
      userId,
      goldType: normalizedType, // 저장은 정규화된 라벨로
      quantity: qtyNum,
      exchangeType,
      conversionFactor: purityFactor,
      finalWeight,
      unknown: false,
      status: "requested",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  try {
    const docRef = await addDoc(collection(db, "goldExchanges"), exchangeData);
    // 필요 시 즉시 읽어 반환(기존 동작 유지)
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("문서 조회 실패");
    return { id: docRef.id, ...docSnap.data() };
  } catch (error) {
    throw new Error("금 교환 거래 생성 실패: " + error.message);
  }
}

export default requestGoldExchange;
