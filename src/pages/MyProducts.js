// src/pages/MyProducts.js
import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuthContext } from "../context/AuthContext";
import styled from "styled-components";

// Container, ProductItem, Button, Input 등 다른 styled-components들
const Container = styled.div`
  padding: 20px;
`;

const ProductItem = styled.div`
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 5px;
`;

const Button = styled.button`
  padding: 8px 12px;
  margin-right: 10px;
  border: none;
  border-radius: 4px;
  background: ${({ variant }) => (variant === "delete" ? "#dc3545" : "#007bff")};
  color: #fff;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;

const Input = styled.input`
  padding: 6px 8px;
  margin: 5px 0;
  width: 100%;
  box-sizing: border-box;
`;

// 추가: Select 컴포넌트 정의
const Select = styled.select`
  padding: 6px 8px;
  margin: 5px 0;
  width: 100%;
  box-sizing: border-box;
`;

export default function MyProducts() {
  const { user } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(prods);
    });
    return unsubscribe;
  }, [user]);

  const handleDelete = async (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        alert("삭제되었습니다.");
      } catch (err) {
        console.error(err);
        alert("삭제 실패");
      }
    }
  };

  const handleEditClick = (product) => {
    setEditingId(product.id);
    setEditValues(product);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSaveEdit = async () => {
    try {
      const productRef = doc(db, "products", editingId);
      const { id, ...updates } = editValues;
      await updateDoc(productRef, updates);
      setEditingId(null);
      setEditValues({});
      alert("수정되었습니다.");
    } catch (err) {
      console.error(err);
      alert("수정 실패");
    }
  };

  const handleChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Container>
      <h1>내 상품 관리</h1>
      {products.length === 0 ? (
        <p>등록된 상품이 없습니다.</p>
      ) : (
        products.map((prod) => (
          <ProductItem key={prod.id}>
            {editingId === prod.id ? (
              <>
                <div>
                  <label>상품명: </label>
                  <Input
                    type="text"
                    value={editValues.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                  />
                </div>
                <div>
                  <label>상품 설명: </label>
                  <Input
                    type="text"
                    value={editValues.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                  />
                </div>
                <div>
                  <label>가격: </label>
                  <Input
                    type="number"
                    value={editValues.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                  />
                </div>
                <div>
                  <label>카테고리: </label>
                  <Input
                    type="text"
                    value={editValues.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                  />
                </div>
                <div>
                  <label>무게: </label>
                  <Input
                    type="number"
                    value={editValues.weight}
                    onChange={(e) => handleChange("weight", e.target.value)}
                  />
                  <Select
                    value={editValues.weightUnit}
                    onChange={(e) => handleChange("weightUnit", e.target.value)}
                  >
                    <option value="g">g</option>
                    <option value="돈">돈</option>
                  </Select>
                </div>
                <div>
                  <label>등록일: </label>
                  <span>{prod.createdAt}</span>
                </div>
                <Button onClick={handleSaveEdit}>저장</Button>
                <Button variant="delete" onClick={handleCancelEdit}>
                  취소
                </Button>
              </>
            ) : (
              <>
                <p>
                  <strong>상품명:</strong> {prod.title}
                </p>
                <p>
                  <strong>설명:</strong> {prod.description}
                </p>
                <p>
                  <strong>가격:</strong> {prod.price} 원
                </p>
                <p>
                  <strong>카테고리:</strong> {prod.category}
                </p>
                <p>
                  <strong>무게:</strong> {prod.weight} {prod.weightUnit}
                </p>
                {prod.imageUrls && prod.imageUrls.length > 0 && (
                  <div>
                    {prod.imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`상품 이미지 ${idx + 1}`}
                        style={{ width: "100px", height: "100px", objectFit: "cover", marginRight: "10px" }}
                      />
                    ))}
                  </div>
                )}
                <Button onClick={() => handleEditClick(prod)}>수정</Button>
                <Button variant="delete" onClick={() => handleDelete(prod.id)}>
                  삭제
                </Button>
              </>
            )}
          </ProductItem>
        ))
      )}
    </Container>
  );
}
