// src/components/common/SellerBadge.jsx
import React from "react";
import styled from "styled-components";

const Wrap = styled.div`
  display: flex; align-items: center; gap: 10px;
`;

const Avatar = styled.img`
  width: 36px; height: 36px; border-radius: 50%;
  object-fit: cover; background: #f2f4f6; flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.06);
`;

const Info = styled.div`
  display: flex; flex-direction: column; line-height: 1.2;
`;

const NameRow = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-weight: 700; font-size: 0.95rem; color: #2a2f36;
`;

const RatingRow = styled.div`
  font-size: 0.82rem; color: #6b7280; font-weight: 600;
`;

function Stars({ value = 0 }) {
  const full = Math.round(value * 2) / 2; // 0.5단위 반올림
  // 간단한 별 렌더링(★/☆), 원하면 SVG로 바꿔줄 수 있어요.
  return (
    <span aria-label={`평점 ${value.toFixed(1)}점`}>
      {"★".repeat(Math.floor(full))}
      {full % 1 ? "☆" : ""}
      {"☆".repeat(5 - Math.ceil(full))}
    </span>
  );
}

export default function SellerBadge({
  displayName,
  photoURL,
  ratingAvg,
  ratingCount,
  size = 36,
}) {
  const src = photoURL || "/avatar-default.png"; // public에 기본 이미지 하나 두세요.
  return (
    <Wrap>
      <Avatar src={src} alt={`${displayName || "판매자"} 아바타`} style={{ width: size, height: size }} />
      <Info>
        <NameRow>{displayName || "판매자"}</NameRow>
        <RatingRow>
          <Stars value={Number(ratingAvg || 0)} />{" "}
          {(ratingAvg ? Number(ratingAvg).toFixed(1) : "0.0")}점
          {" · "}
          {ratingCount || 0}명
        </RatingRow>
      </Info>
    </Wrap>
  );
}
