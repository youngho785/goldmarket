// src/components/common/Container.js
import styled, { css } from "styled-components";

export const Container = styled.div.withConfig({
  // noBottomPadding 프로퍼티는 DOM에 전달하지 않음
  shouldForwardProp: (prop) => prop !== "noBottomPadding"
})`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px clamp(16px, 4vw, 64px);

  @media (min-width: 767px) {
    padding-top: 32px;
    padding-bottom: 40px;
  }

  /* noBottomPadding=true 이면 아래 padding 생략 */
  ${({ noBottomPadding }) =>
    noBottomPadding
      ? css`
          padding-bottom: 0;
        `
      : css`
          @media (max-width: 767px) {
            padding-bottom: calc(72px + env(safe-area-inset-bottom));
          }
        `}
`;
