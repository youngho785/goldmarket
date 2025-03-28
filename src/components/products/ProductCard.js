// src/components/products/ProductCard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { addFavorite, removeFavorite } from "../../services/favoritesService";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useFavorites } from "../../context/FavoritesContext";

// Card 컨테이너 스타일
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
`;

// 이미지 스타일
const ProductImage = styled.img`
  width: 300px;
  height: 200px;
  object-fit: contain;
  margin-bottom: 12px;
  border-radius: 4px;
`;

// 이미지가 없을 때의 placeholder 스타일
const Placeholder = styled.div`
  width: 300px;
  height: 200px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.background || "#f8f9fa"};
  border: 1px solid #ccc;
  border-radius: 4px;
`;

// 제목 스타일
const Title = styled.h3`
  font-size: 1.3em;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.text || "#333"};
`;

// 설명 스타일
const Description = styled.p`
  font-size: 1em;
  margin-bottom: 8px;
  text-align: center;
`;

// 가격 스타일
const Price = styled.p`
  font-size: 1em;
  font-weight: bold;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
`;

// 카테고리 스타일
const CategoryText = styled.p`
  font-size: 0.9em;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.secondary || "#666"};
`;

// 타임스탬프 스타일
const Timestamp = styled.p`
  font-size: 0.8em;
  color: #555;
  margin-bottom: 12px;
`;

// 찜하기 버튼 스타일
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
  const [favorited, setFavorited] = useState(isFavorited);

  // createdAt 필드 처리 (Firestore Timestamp 또는 ISO 문자열)
  const createdDate =
    product.createdAt && product.createdAt.seconds
      ? new Date(product.createdAt.seconds * 1000)
      : new Date(product.createdAt);

  // 전역 favorites 상태에 해당 상품이 있는지 확인
  useEffect(() => {
    const isFav = favorites.some(
      (fav) => fav.favoriteProductId === product.id || fav.id === product.id
    );
    setFavorited(isFav);
  }, [favorites, product.id]);

  const handleToggleFavorite = async (e) => {
    // 카드 클릭 이벤트 전파 방지 (상세페이지 이동 방지)
    e.stopPropagation();
    try {
      if (favorited) {
        await removeFavorite("defaultUser", product.id);
        setFavorited(false);
        setFavorites((prev) =>
          prev.filter(
            (fav) =>
              fav.favoriteProductId !== product.id && fav.id !== product.id
          )
        );
        alert("찜 목록에서 제거되었습니다.");
      } else {
        const newFavoriteId = await addFavorite("defaultUser", product);
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
  };

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
      {/* FavoriteButton의 클릭 시 이벤트 전파를 방지 */}
      <FavoriteButton onClick={handleToggleFavorite}>
        {favorited ? "찜하기 취소하기" : "찜하기"}
      </FavoriteButton>
    </Card>
  );
}
