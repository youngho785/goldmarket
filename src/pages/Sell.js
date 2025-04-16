// src/pages/Sell.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addProduct } from "../services/productService";
import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthContext } from "../context/AuthContext";
import styled from "styled-components";

const PageContainer = styled.div`
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.white || "#ffffff"};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
`;

const Title = styled.h1`
  text-align: center;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
  color: #333;
`;

const Select = styled.select`
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
`;

const Input = styled.input`
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
`;

const TextArea = styled.textarea`
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  resize: vertical;
`;

const Button = styled.button`
  padding: 12px;
  font-size: 1rem;
  background-color: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondary || "#0056b3"};
  }
  &:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const PreviewImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const ErrorMessage = styled.p`
  color: red;
  font-weight: bold;
  text-align: center;
`;

export default function Sell() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // 로그인하지 않은 경우 안내
  if (!user) {
    return <p>상품 등록을 위해 로그인이 필요합니다.</p>;
  }

  // 수정된 카테고리 옵션 배열
  const categoryOptions = [
    "14k(585)",
    "18k(750)",
    "24k 제품(995)",
    "24k 제품(999)",
    "999.9 골드바",
    "999.9 순금 덩어리"
  ];

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("g");
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);

  // 이미지 파일 선택 처리 (최대 4장)
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
            const storageRef = ref(storage, `products/${Date.now()}_${image.name}`);
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
        sellerId: user.uid,
        approved: true,
        completed: false,
        weight: weight ? parseFloat(weight) : null,
        weightUnit,
      };
      await addProduct(product);
      // 상품 등록 후 TradeHome.js 페이지로 이동
      navigate("/trade");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <PageContainer>
      <Title>상품 등록</Title>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>카테고리:</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">선택하세요</option>
            {categoryOptions.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <Label>상품명:</Label>
          <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </FormGroup>
        <FormGroup>
          <Label>상품 설명:</Label>
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </FormGroup>
        <FormGroup>
          <Label>가격 (원):</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </FormGroup>
        <FormGroup>
          <Label>무게(중량):</Label>
          <div style={{ display: "flex", gap: "10px" }}>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="숫자만 입력"
              required
            />
            <Select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)}>
              <option value="g">g</option>
              <option value="돈">돈</option>
            </Select>
          </div>
        </FormGroup>
        <FormGroup>
          <Label>상품 이미지 (최대 4장):</Label>
          <Input type="file" multiple accept="image/*" onChange={handleImageChange} disabled={images.length >= 4} />
        </FormGroup>
        {images.length > 0 && (
          <ImagePreviewContainer>
            {images.map((image, index) => (
              <PreviewImage key={index} src={URL.createObjectURL(image)} alt={`preview-${index}`} />
            ))}
          </ImagePreviewContainer>
        )}
        <Button type="submit">상품 등록</Button>
      </Form>
    </PageContainer>
  );
}
