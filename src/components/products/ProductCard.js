// src/components/products/ProductCard.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { addFavorite, removeFavorite } from "../../services/favoritesService";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useFavorites } from "../../context/FavoritesContext";
import { useAuthContext } from "../../context/AuthContext";

const Card = styled.div`
  border: 1px solid #ccc;
  padding: 16px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.white || "#fff"};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
  }

  /* 반응형: 작은 화면에서 카드 여백 및 패딩 축소 */
  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const ProductImage = styled.img`
  width: 100%;
  max-width: 300px;   /* 이미지가 차지할 최대 너비 */
  height: 200px;      /* 고정 높이 */
  object-fit: contain;
  margin-bottom: 12px;
  border-radius: 4px;

  @media (max-width: 480px) {
    max-width: 100%;
  }
`;

const Placeholder = styled.div`
  width: 100%;
  max-width: 300px;   /* 이미지가 없는 경우에도 동일 너비 */
  height: 200px;      /* 고정 높이 */
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.background || "#f8f9fa"};
  border: 1px solid #ccc;
  border-radius: 4px;

  @media (max-width: 480px) {
    max-width: 100%;
  }
`;

// 이하 텍스트 스타일들
const Title = styled.h3`
  font-size: 1.3em;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.text || "#333"};
  text-align: center;
`;

const Description = styled.p`
  font-size: 1em;
  margin-bottom: 8px;
  text-align: center;
  color: #555;
`;

const Price = styled.p`
  font-size: 1em;
  font-weight: bold;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
  text-align: center;
`;

const CategoryText = styled.p`
  font-size: 0.9em;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.secondary || "#666"};
  text-align: center;
`;

const Timestamp = styled.p`
  font-size: 0.8em;
  color: #555;
  margin-bottom: 12px;
  text-align: center;
`;

const FavoriteButton = styled.button`
  background-color: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.accent || "#0056b3"};
  }
`;

export default function ProductCard({ product, isFavorited = false }) {
  const navigate = useNavigate();
  const { favorites, setFavorites } = useFavorites();
  const { user } = useAuthContext();
  const [favorited, setFavorited] = useState(isFavorited);

  // createdAt 필드 처리 (Firestore Timestamp 또는 ISO 문자열)
  const createdDate =
    product.createdAt && product.createdAt.seconds
      ? new Date(product.createdAt.seconds * 1000)
      : new Date(product.createdAt);

  // 전역 favorites 상태에서 해당 상품이 찜 상태인지 확인
  useEffect(() => {
    const isFav = favorites.some(
      (fav) =>
        (fav.favoriteProductId && fav.favoriteProductId === product.id) ||
        (fav.id && fav.id === product.id)
    );
    setFavorited(isFav);
  }, [favorites, product.id]);

  // 찜 토글
  const handleToggleFavorite = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        const uid = user ? user.uid : "defaultUser";
        if (favorited) {
          await removeFavorite(uid, product.id);
          setFavorited(false);
          setFavorites((prev) =>
            prev.filter(
              (fav) =>
                (fav.favoriteProductId && fav.favoriteProductId !== product.id) &&
                (fav.id && fav.id !== product.id)
            )
          );
          alert("찜 목록에서 제거되었습니다.");
        } else {
          const newFavoriteId = await addFavorite(uid, product);
          setFavorited(true);
          setFavorites((prev) => [
            ...prev,
            { ...product, id: newFavoriteId, favoriteProductId: product.id },
          ]);
          alert("찜 목록에 추가되었습니다.");
        }
      } catch (error) {
        console.error("찜하기 작업 실패:", error);
      }
    },
    [favorited, product, setFavorites, user]
  );

  return (
    <Card onClick={() => navigate(`/product/${product.id}`)}>
      {product.imageUrls && product.imageUrls.length > 0 ? (
        <ProductImage src={product.imageUrls[0]} alt={product.title} />
      ) : (
        <Placeholder>이미지 없음</Placeholder>
      )}
      <Title>{product.title}</Title>
      <Description>{product.description}</Description>
      <Price>
        가격: {product.price ? product.price.toLocaleString("ko-KR") : "N/A"}
      </Price>
      {product.category && (
        <CategoryText>카테고리: {product.category}</CategoryText>
      )}
      {product.createdAt && (
        <Timestamp>
          등록된 시간:{" "}
          {formatDistanceToNow(createdDate, { addSuffix: true, locale: ko })}
        </Timestamp>
      )}
      <FavoriteButton onClick={handleToggleFavorite}>
        {favorited ? "찜하기 취소하기" : "찜하기"}
      </FavoriteButton>
    </Card>
  );
}
