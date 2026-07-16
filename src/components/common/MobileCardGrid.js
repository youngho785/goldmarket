// src/components/common/MobileCardGrid.js
import styled from 'styled-components';

/**
 * 모바일(≤768px)에서는 무조건 1열,
 * 데스크탑(≥769px) 이상에서는 min 240px 너비마다 칼럼 자동 생성
 */
const MobileCardGrid = styled.div`
  display: grid;
  gap: 8px;

  /* 모바일(테블릿까지 포함) 한 줄에 하나씩 */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  /* 데스크탑 이상: 너비 240px 이상 칼럼 자동 채우기 */
  @media (min-width: 769px) {
    grid-template-columns: repeat(
      auto-fill,
      minmax(240px, 1fr)
    );
  }
`;

export default MobileCardGrid;
