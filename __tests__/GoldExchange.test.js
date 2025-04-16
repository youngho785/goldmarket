// __tests__/GoldExchange.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GoldExchange from '../src/pages/GoldExchange';
import { AuthProvider } from '../src/context/AuthContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';

// 간단한 렌더링 테스트 예시
test('GoldExchange 페이지가 렌더링 되는지', () => {
  render(
    <AuthProvider>
      <FavoritesProvider>
        <GoldExchange />
      </FavoritesProvider>
    </AuthProvider>
  );
  const titleElement = screen.getByText(/금 교환 요청/i);
  expect(titleElement).toBeInTheDocument();
});
