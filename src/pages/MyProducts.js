import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuthContext } from "../context/AuthContext";
import styled from "styled-components";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

// Styled-components
const Container = styled.div`
  padding: 20px;
  background: #f7f9fa;
`;

const ProductItem = styled.div`
  border: 1px solid #e0e0e0;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  transition: transform 0.1s;
  &:hover {
    transform: translateY(-2px);
  }
`;

const ButtonGroup = styled.div`
  margin-top: 15px;
  display: flex;
  gap: 10px;
`;

const Button = styled.button`
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
  background: ${props => {
    if (props.$variant === "delete") return "#e74c3c";
    if (props.$variant === "save") return "#2ecc71";
    if (props.$variant === "cancel") return "#95a5a6";
    return "#3498db";
  }};
  &:hover {
    transform: translateY(-2px);
    background: ${props => {
      if (props.$variant === "delete") return "#c0392b";
      if (props.$variant === "save") return "#27ae60";
      if (props.$variant === "cancel") return "#7f8c8d";
      return "#2980b9";
    }};
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }
`;

const Input = styled.input`
  padding: 8px;
  margin: 8px 0;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Select = styled.select`
  padding: 8px;
  margin: 8px 0;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const ImageContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
`;

const ProductImage = styled.img`
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #eee;
`;

export default function MyProducts() {
  const { user } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, snapshot => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    });
    return unsubscribe;
  }, [user]);

  const handleDelete = async id => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        alert("삭제되었습니다.");
      } catch {
        alert("삭제 실패");
      }
    }
  };

  const handleEditClick = product => {
    setEditingId(product.id);
    setEditValues(product);
    setImagePreviews(product.imageUrls || []);
    setImageFiles([]);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleImageChange = e => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleSaveEdit = async () => {
    try {
      const productRef = doc(db, "products", editingId);
      // eslint-disable-next-line no-unused-vars
      const updates = (({ id, createdAt, ...rest }) => rest)(editValues);
      if (imageFiles.length > 0) {
        // TODO: Firebase Storage 업로드 후 imageUrls 업데이트
        updates.imageUrls = imagePreviews;
      }
      await updateDoc(productRef, updates);
      alert("수정되었습니다.");
      handleCancelEdit();
    } catch {
      alert("수정 실패");
    }
  };

  const handleChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Container>
      <h1>내 상품 관리</h1>
      {products.length === 0 ? (
        <p>등록된 상품이 없습니다.</p>
      ) : (
        products.map(prod => {
          const createdLabel = prod.createdAt?.seconds
            ? formatDistanceToNow(new Date(prod.createdAt.seconds * 1000), { addSuffix: true, locale: ko })
            : prod.createdAt;

          return (
            <ProductItem key={prod.id}>
              {editingId === prod.id ? (
                <>
                  <label>상품명:</label>
                  <Input
                    type="text"
                    value={editValues.title || ""}
                    onChange={e => handleChange("title", e.target.value)}
                  />

                  <label>상품 설명:</label>
                  <Input
                    type="text"
                    value={editValues.description || ""}
                    onChange={e => handleChange("description", e.target.value)}
                  />

                  <label>가격:</label>
                  <Input
                    type="number"
                    value={editValues.price || 0}
                    onChange={e => handleChange("price", e.target.value)}
                  />

                  <label>카테고리:</label>
                  <Input
                    type="text"
                    value={editValues.category || ""}
                    onChange={e => handleChange("category", e.target.value)}
                  />

                  <label>무게:</label>
                  <Input
                    type="number"
                    value={editValues.weight || 0}
                    onChange={e => handleChange("weight", e.target.value)}
                  />
                  <Select
                    value={editValues.weightUnit || "g"}
                    onChange={e => handleChange("weightUnit", e.target.value)}
                  >
                    <option value="g">g</option>
                    <option value="돈">돈</option>
                  </Select>

                  <label>이미지 변경:</label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <ImageContainer>
                    {imagePreviews.map((src, idx) => (
                      <ProductImage key={idx} src={src} alt={`미리보기 ${idx + 1}`} />
                    ))}
                  </ImageContainer>

                  <label>등록일:</label>
                  <p>{createdLabel}</p>

                  <ButtonGroup>
                    <Button $variant="save" onClick={handleSaveEdit}>저장</Button>
                    <Button $variant="cancel" onClick={handleCancelEdit}>취소</Button>
                  </ButtonGroup>
                </>
              ) : (
                <>
                  <p><strong>상품명:</strong> {prod.title}</p>
                  <p><strong>설명:</strong> {prod.description}</p>
                  <p><strong>가격:</strong> {prod.price.toLocaleString()} 원</p>
                  <p><strong>카테고리:</strong> {prod.category}</p>
                  <p><strong>무게:</strong> {prod.weight} {prod.weightUnit}</p>
                  {prod.imageUrls && prod.imageUrls.length > 0 && (
                    <ImageContainer>
                      {prod.imageUrls.map((url, idx) => (
                        <ProductImage key={idx} src={url} alt={`상품 이미지 ${idx + 1}`} />
                      ))}
                    </ImageContainer>
                  )}
                  <p><strong>등록일:</strong> {createdLabel}</p>

                  <ButtonGroup>
                    <Button $variant="edit" onClick={() => handleEditClick(prod)}>수정</Button>
                    <Button $variant="delete" onClick={() => handleDelete(prod.id)}>삭제</Button>
                  </ButtonGroup>
                </>
              )}
            </ProductItem>
          );
        })
      )}
    </Container>
  );
}
