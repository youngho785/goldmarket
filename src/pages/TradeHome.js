// 예시: 디바운싱을 위한 훅 사용 예시 (lodash.debounce 사용)
import debounce from "lodash.debounce";
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { fetchProducts } from "../services/productService";
import ProductList from "../components/products/ProductList";
import GoldPriceDisplay from "../components/common/GoldPriceDisplay";

// ... (Styled Components 및 기타 코드 동일)

export default function Home() {
  const [products, setProducts] = useState([]);
  const [displayProducts, setDisplayProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const categoryOptions = ["14k(585)", "18k(750)", "24k", "골드바"];

  useEffect(() => {
    async function getProducts() {
      try {
        const data = await fetchProducts();
        setProducts(data);
        setDisplayProducts(data);
      } catch (error) {
        console.error("상품을 가져오는 중 오류 발생:", error);
      } finally {
        setLoading(false);
      }
    }
    getProducts();
  }, []);

  const filterProducts = useCallback(() => {
    let filtered = products;
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((product) =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (maxPrice.trim() !== "") {
      const priceLimit = parseFloat(maxPrice);
      filtered = filtered.filter(
        (product) => product.price && product.price <= priceLimit
      );
    }
    if (selectedCategory.trim() !== "") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }
    if (userLocation && maxDistance.trim() !== "") {
      const distanceLimit = parseFloat(maxDistance);
      filtered = filtered.filter((product) => {
        if (
          product.location &&
          product.location.latitude &&
          product.location.longitude
        ) {
          const distance = getDistanceFromLatLonInKm(
            userLocation.latitude,
            userLocation.longitude,
            product.location.latitude,
            product.location.longitude
          );
          return distance <= distanceLimit;
        }
        return false;
      });
    }
    setDisplayProducts(filtered);
  }, [searchTerm, maxPrice, selectedCategory, maxDistance, products, userLocation]);

  // 디바운스 적용
  const debouncedFilter = useCallback(debounce(filterProducts, 500), [filterProducts]);

  useEffect(() => {
    debouncedFilter();
    // 정리: 필터 변경 시 타이머 정리
    return debouncedFilter.cancel;
  }, [searchTerm, maxPrice, selectedCategory, maxDistance, products, userLocation, debouncedFilter]);

  // 위치 가져오기 및 에러 처리
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
        },
        (error) => {
          console.error("위치 정보를 가져오는데 실패했습니다:", error);
          setLocationError("위치 정보를 가져오지 못했습니다.");
        }
      );
    } else {
      setLocationError("Geolocation API를 사용할 수 없습니다.");
    }
  }, []);

  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <HeaderContainer>
        <TitleLink to="/">귀금속 리사이클 중고거래</TitleLink>
        <TitleLink to="/gold-exchange">귀금속 999.9랩 금교환</TitleLink>
      </HeaderContainer>
      <h1>홈페이지</h1>
      <GoldPriceDisplay />
      {locationError && <p style={{color:"red"}}>{locationError}</p>}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="상품 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="number"
          placeholder="최대 가격"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ marginRight: "10px" }}
        >
          <option value="">전체 카테고리</option>
          {categoryOptions.map((option, idx) => (
            <option key={idx} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="최대 거리 (km)"
          value={maxDistance}
          onChange={(e) => setMaxDistance(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <button
          onClick={filterProducts}
          style={{
            backgroundColor: "#007bff",
            color: "#fff",
            padding: "8px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          검색/필터 적용
        </button>
      </div>
      <ProductList products={displayProducts} />
    </div>
  );
}

// Header 컴포넌트 및 관련 스타일 (예시)
const HeaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  border-bottom: 2px solid #eaeaea;
  padding-bottom: 10px;
  margin-bottom: 20px;
`;

const TitleLink = styled(Link)`
  font-size: 2em;
  font-weight: bold;
  text-decoration: none;
  color: #007bff;
  &:hover {
    text-decoration: underline;
  }
`;
