// __tests__/GoldExchangeIntegration.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoldExchange from '../src/pages/GoldExchange';
import { AuthProvider } from '../src/context/AuthContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';

test('전체 교환 요청 플로우 테스트', async () => {
  render(
    <AuthProvider>
      <FavoritesProvider>
        <GoldExchange />
      </FavoritesProvider>
    </AuthProvider>
  );

  // 제품 정보 입력
  fireEvent.change(screen.getByLabelText(/제품의 종류/i), { target: { value: '14k(585)' } });
  fireEvent.change(screen.getByLabelText(/수량/i), { target: { value: '100' } });
  // 단위와 교환 유형도 유사하게 선택해야 함 (getAllByLabelText 등으로 접근)
  
  // "교환 결과 보기" 버튼 클릭
  fireEvent.click(screen.getByText(/교환 결과 보기/i));

  // 결과가 표시되는지 확인
  await waitFor(() => {
    expect(screen.getByText(/총 합계/i)).toBeInTheDocument();
  });
});
