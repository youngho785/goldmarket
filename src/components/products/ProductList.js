// src/components/products/ProductList.js
import React from "react";
import ProductCard from "./ProductCard";
import styled from "styled-components";

const ListContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 20px;

  /* 반응형 예시: 작은 화면에 대해 padding 조절 */
  @media (max-width: 480px) {
    padding: 10px;
    gap: 8px;
  }
`;

export default function ProductList({ products }) {
  if (!products || products.length === 0) {
    return <p style={{ textAlign: "center" }}>등록된 상품이 없습니다.</p>;
  }
  return (
    <ListContainer>
      {products.map((product, index) => (
        <ProductCard key={product.id ? product.id : index} product={product} />
      ))}
    </ListContainer>
  );
}
