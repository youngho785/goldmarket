// src/pages/Favorites.js
import React, { useEffect, useState } from "react";
import { fetchFavorites } from "../services/favoritesService";
import ProductList from "../components/products/ProductList";
import { useFavorites } from "../context/FavoritesContext";

export default function Favorites() {
  const { favorites, setFavorites } = useFavorites();
  const [loading, setLoading] = useState(true);
  const userId = "defaultUser"; // 실제 사용자 ID는 AuthContext 등에서 받아오면 됩니다.

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
  }, [userId, setFavorites]);

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>찜 목록</h1>
      <ProductList products={favorites} />
    </div>
  );
}
