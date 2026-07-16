// src/components/common/Container.js
import styled, { css } from "styled-components";

export const Container = styled.div.withConfig({
  // noBottomPadding 프로퍼티는 DOM에 전달하지 않음
  shouldForwardProp: (prop) => prop !== "noBottomPadding"
})`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;

  @media (min-width: 767px) {
    padding: 2rem;
  }

  /* noBottomPadding=true 이면 아래 padding 생략 */
  ${({ noBottomPadding }) =>
    noBottomPadding
      ? css`
          padding-bottom: 0;
        `
      : css`
          @media (max-width: 767px) {
            padding-bottom: calc(56px + env(safe-area-inset-bottom));
          }
        `}
`;
