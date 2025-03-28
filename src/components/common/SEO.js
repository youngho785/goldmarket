// src/components/common/SEO.js
import React from "react";
import { Helmet } from "react-helmet";

export default function SEO({ title, description, keywords }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {/* Open Graph 및 Twitter 메타 태그 추가 */}
    </Helmet>
  );
}
