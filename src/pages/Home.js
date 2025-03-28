// src/pages/Home.js
import React, { useEffect, useState } from "react";
import { fetchProducts } from "../services/productService"; // 상품 데이터를 불러오는 함수
import ProductList from "../components/products/ProductList";
import GoldPriceDisplay from "../components/common/GoldPriceDisplay";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [displayProducts, setDisplayProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [userLocation, setUserLocation] = useState(null);

  // 카테고리 옵션 설정
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

  // 검색, 가격, 카테고리, 위치 기반 필터링 함수
  const handleFilter = () => {
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
    // 위치 기반 필터 (옵션)
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
  };

  useEffect(() => {
    handleFilter();
  }, [searchTerm, maxPrice, selectedCategory, maxDistance, products, userLocation]);

  // Haversine 공식으로 두 좌표 간 거리 계산
  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // 사용자 위치 가져오기
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("사용자 위치:", latitude, longitude);
          setUserLocation({ latitude, longitude });
        },
        (error) => {
          console.error("위치 정보를 가져오는데 실패했습니다:", error);
        }
      );
    } else {
      console.error("Geolocation API를 사용할 수 없습니다.");
    }
  }, []);

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>홈페이지</h1>
      <GoldPriceDisplay />  {/* 금 시세 표시 */}
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
          onClick={handleFilter}
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
