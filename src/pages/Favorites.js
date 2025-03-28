// src/pages/Favorites.js
import React, { useEffect, useState } from "react";
import { fetchFavorites } from "../services/favoritesService";
import ProductList from "../components/products/ProductList";

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = "defaultUser"; // 실제 사용자 ID를 AuthContext 등을 통해 받아올 수 있습니다.

  useEffect(() => {
    async function getFavorites() {
      try {
        const data = await fetchFavorites(userId);
        setFavorites(data);
      } catch (error) {
        console.error("찜 목록 가져오기 실패:", error);
      } finally {
        setLoading(false);
      }
    }
    getFavorites();
  }, [userId]);

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>찜 목록</h1>
      {/* 각 ProductCard에 isFavorited prop을 true로 전달하여 버튼 텍스트가 '찜하기 취소하기'가 되도록 함 */}
      <ProductList products={favorites.map(product => ({ ...product, isFavorited: true }))} />
    </div>
  );
}
