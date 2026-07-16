// src/components/common/responsive.js
import styled from "styled-components";

// — 언제나 1열
export const OneCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing(2)};
`;

// — 태블릿 이하(≤768px): 1열 고정, 그 이상부터 min 너비만큼 칼럼 자동 생성
export const AutoCols = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing(2)};

  /* 태블릿 이하: 한 줄에 하나씩 */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  /* 데스크탑 이상: 전달된 minpx 너비만큼 칼럼을 자동 생성 */
  @media (min-width: 769px) {
    grid-template-columns: repeat(
      auto-fill,
      minmax(${({ min }) => min || "240px"}, 1fr)
    );
  }
`;
