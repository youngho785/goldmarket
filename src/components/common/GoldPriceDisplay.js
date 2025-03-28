// src/components/common/GoldPriceDisplay.js
import React, { useEffect, useState } from "react";
import { fetchGoldPrice } from "../../services/goldPriceService";

export default function GoldPriceDisplay() {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getPrice() {
      try {
        const currentPrice = await fetchGoldPrice();
        setPrice(currentPrice);
      } catch (error) {
        console.error("금 시세 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    }
    getPrice();
  }, []);

  if (loading) return <p>금 시세를 불러오는 중...</p>;
  if (!price) return <p>금 시세 정보를 가져올 수 없습니다.</p>;

  return (
    <div>
      <h3>현재 금 시세</h3>
      <p>{price} USD</p>
    </div>
  );
}
