import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const Wrapper = styled.main`
  max-width: 640px;
  margin: 36px auto;
  padding: clamp(54px, 10vw, 96px) 24px;
  text-align: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xlarge};
  box-shadow: ${({ theme }) => theme.shadows.card};
  min-height: 420px;

  h2 {
    color: ${({ theme }) => theme.colors.secondary};
    font-size: clamp(3.5rem, 12vw, 7rem);
    margin: 0 0 6px;
  }

  h1 { margin: 0; color: ${({ theme }) => theme.colors.primary}; }
  p { color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.7; }
`;

const Actions = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 22px;
`;

const HomeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 9px 14px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  text-decoration: none;
  font-weight: 800;
`;

const BackButton = styled.button`
  min-height: 42px;
  padding: 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;
`;

export default function NotFound() {
  return (
    <Wrapper>
      <h2>404</h2>
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p>
        주소가 변경되었거나 존재하지 않는 페이지입니다.<br />
        홈으로 이동하거나 이전 화면으로 돌아가 주세요.
      </p>
      <Actions>
        <HomeLink to="/">홈으로 가기</HomeLink>
        <BackButton type="button" onClick={() => window.history.back()}>
          이전 화면
        </BackButton>
      </Actions>
    </Wrapper>
  );
}
