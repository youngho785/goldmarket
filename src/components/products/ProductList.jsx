// src/components/products/ProductList.js
import React from "react";
import styled from "styled-components";
import ProductCard from "./ProductCard";
import MobileCardGrid from "../common/MobileCardGrid";
import LoadingSpinner from "../common/LoadingSpinner";

const EmptyText = styled.p`
  text-align: center;
  color: #888;
  padding: 40px 0 60px;
  font-size: 1.1rem;
`;

export default React.memo(function ProductList({
  products = [],
  loading = false,
  searchTerm = "",
}) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!Array.isArray(products) || products.length === 0) {
    const msg = searchTerm
      ? "조건에 맞는 상품이 없습니다."
      : "등록된 상품이 없습니다.";
    return <EmptyText role="status">{msg}</EmptyText>;
  }

  return (
    <MobileCardGrid>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </MobileCardGrid>
  );
});
