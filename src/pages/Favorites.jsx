// src/pages/Favorites.js
import React, { useEffect, useState } from "react";
import { useFavorites } from "../context/FavoritesContext";
import ProductList from "../components/products/ProductList";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Favorites() {
  const { favorites, refreshFavorites } = useFavorites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1) 마운트 시에 favorites(=favoriteProductId 목록) 갱신
  useEffect(() => {
    refreshFavorites().finally(() => setLoading(false));
  }, [refreshFavorites]);

  // 2) favorites 배열이 바뀔 때마다 실제 product 문서들을 불러옴
  useEffect(() => {
    async function loadProducts() {
      if (favorites.length === 0) {
        setProducts([]);
        return;
      }
      setLoading(true);
      try {
        const proms = favorites.map(async (fav) => {
          const snap = await getDoc(doc(db, "products", fav.favoriteProductId));
          if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
          } else {
            return null;
          }
        });
        const results = await Promise.all(proms);
        // 존재하지 않는 건 필터링
        setProducts(results.filter(Boolean));
      } catch (err) {
        console.error("찜한 상품 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [favorites]);

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>찜 목록</h1>
      {products.length > 0
        ? <ProductList products={products} />
        : <p>찜한 상품이 없습니다.</p>
      }
    </div>
  );
}
