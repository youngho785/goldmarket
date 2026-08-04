// src/pages/NotFound.js
import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  max-width: 640px;
  margin: 36px auto;
  padding: clamp(54px, 10vw, 96px) 24px;
  text-align: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xlarge};
  box-shadow: ${({ theme }) => theme.shadows.card};
  min-height: 420px;

  h2 { color: ${({ theme }) => theme.colors.secondary}; font-size: clamp(3.5rem, 12vw, 7rem); margin-bottom: 6px; }
  p { color: ${({ theme }) => theme.colors.textSecondary}; }
`;

export default function NotFound() {
  return (
    <Wrapper>
      <h2>404</h2>
      <h1>Page Not Found</h1>
      <p>
        요청하신 페이지를 찾을 수 없습니다.<br/>
        URL을 확인 후 다시 시도해 주세요.
      </p>
    </Wrapper>
  );
}
