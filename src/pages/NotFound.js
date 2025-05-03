// src/pages/NotFound.js
import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  padding: 100px 20px;
  text-align: center;
  background: #eceff1;
  min-height: 100vh;
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
