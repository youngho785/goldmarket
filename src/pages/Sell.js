// src/pages/Sell.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addProduct } from "../services/productService";
import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthContext } from "../context/AuthContext";

export default function Sell() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // 로그인하지 않은 경우
  if (!user) {
    return <p>상품 등록을 위해 로그인이 필요합니다.</p>;
  }

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState(""); // 무게 입력 상태
  const [weightUnit, setWeightUnit] = useState("g"); // 무게 단위, 기본값 "g"
  const [images, setImages] = useState([]); // 최대 4장의 이미지 파일
  const [error, setError] = useState(null);

  // 카테고리 옵션: "14k(585)", "18k(750)", "24k", "골드바"
  const categoryOptions = ["14k(585)", "18k(750)", "24k", "골드바"];

  // 이미지 파일 선택 처리 (최대 4장까지 허용)
  const handleImageChange = (e) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const combined = [...images, ...newFiles].slice(0, 4);
      setImages(combined);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrls = [];
      if (images.length > 0) {
        imageUrls = await Promise.all(
          images.map(async (image) => {
            const storageRef = ref(
              storage,
              `products/${Date.now()}_${image.name}`
            );
            const snapshot = await uploadBytes(storageRef, image);
            return await getDownloadURL(snapshot.ref);
          })
        );
      }
      const product = {
        title,
        description,
        price: parseFloat(price),
        category,
        imageUrls,
        createdAt: new Date().toISOString(),
        likes: [],
        sellerId: user.uid, // 판매자 UID 저장
        approved: true, // 기본적으로 승인된 상태
        weight: weight ? parseFloat(weight) : null, // 무게 (숫자)
        weightUnit, // 무게 단위 ("g" 또는 "돈")
      };
      await addProduct(product);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>상품 등록</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {/* 카테고리 입력란 */}
        <div style={{ marginBottom: "10px" }}>
          <label>카테고리: </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">선택하세요</option>
            {categoryOptions.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        {/* 상품명 */}
        <div style={{ marginBottom: "10px" }}>
          <label>상품명: </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        {/* 상품 설명 */}
        <div style={{ marginBottom: "10px" }}>
          <label>상품 설명: </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        {/* 가격 */}
        <div style={{ marginBottom: "10px" }}>
          <label>가격: </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        {/* 무게 (중량) 입력 */}
        <div style={{ marginBottom: "10px" }}>
          <label>무게(중량): </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="숫자만 입력"
            style={{ marginRight: "10px" }}
          />
          <select
            value={weightUnit}
            onChange={(e) => setWeightUnit(e.target.value)}
          >
            <option value="g">g</option>
            <option value="돈">돈</option>
          </select>
        </div>
        {/* 이미지 업로드 */}
        <div style={{ marginBottom: "10px" }}>
          <label>상품 이미지 (최대 4장): </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            disabled={images.length >= 4}
          />
        </div>
        {/* 선택한 이미지 미리보기 */}
        {images.length > 0 && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            {images.map((image, index) => (
              <img
                key={index}
                src={URL.createObjectURL(image)}
                alt={`preview-${index}`}
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  border: "1px solid #ccc",
                }}
              />
            ))}
          </div>
        )}
        <button type="submit">상품 등록</button>
      </form>
    </div>
  );
}
