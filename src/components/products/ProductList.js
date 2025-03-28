// src/components/products/ProductList.js
import React from "react";
import ProductCard from "./ProductCard";

export default function ProductList({ products }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
      {products.map((product, index) => (
        <ProductCard key={`${product.id}-${index}`} product={product} />
      ))}
    </div>
  );
}
