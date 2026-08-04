// src/pages/Favorites.js
import React, { useEffect, useState } from "react";
import { useFavorites } from "../context/FavoritesContext";
import ProductList from "../components/products/ProductList";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import styled from "styled-components";

const Page = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 8px 0 30px;
`;

const PageTitle = styled.h1`
  position: relative;
  margin-bottom: 26px;
  padding-bottom: 14px;
  &::after { content: ""; position: absolute; left: 0; bottom: 0; width: 50px; height: 3px; border-radius: 999px; background: ${({ theme }) => theme.gradients.gold}; }
`;

const EmptyState = styled.p`
  padding: 28px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

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
        const results = await Promise.allSettled(proms);
        // 관리자가 공개 취소했거나 삭제된 상품은 나머지 찜 목록에 영향을 주지 않고 제외합니다.
        setProducts(
          results.flatMap((result) =>
            result.status === "fulfilled" && result.value ? [result.value] : []
          )
        );
      } catch (err) {
        console.error("찜한 상품 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [favorites]);

  if (loading) return <EmptyState>찜한 상품을 불러오는 중입니다…</EmptyState>;

  return (
    <Page>
      <PageTitle>찜 목록</PageTitle>
      {products.length > 0
        ? <ProductList products={products} />
        : <EmptyState>찜한 상품이 없습니다.</EmptyState>
      }
    </Page>
  );
}
