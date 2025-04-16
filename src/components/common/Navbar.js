// src/components/common/Navbar.js
import React from "react";
import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useAuthContext } from "../../context/AuthContext";
import Notifications from "./Notifications";

// 언더라인 애니메이션 효과 (슬라이드 업)
const slideIn = keyframes`
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 100%;
    opacity: 1;
  }
`;

const Nav = styled.nav`
  background: linear-gradient(135deg, #ffffff, #f9f9f9);
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const NavLeft = styled.div`
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.main};
    font-size: 2.2em;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: 1px;
  }
`;

const NavRight = styled.div`
  display: flex;
  gap: ${({ theme }) =>
    typeof theme.spacing === "function" ? theme.spacing(3) : "24px"};
  align-items: center;

  @media (max-width: 768px) {
    gap: ${({ theme }) =>
      typeof theme.spacing === "function" ? theme.spacing(2) : "16px"};
  }
`;

const StyledLink = styled(Link)`
  position: relative;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  padding-bottom: 3px;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }

  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 0;
    background-color: ${({ theme }) => theme.colors.primary};
    opacity: 0;
    transition: width 0.3s ease, opacity 0.3s ease;
  }

  &:hover::after {
    width: 100%;
    opacity: 1;
    animation: ${slideIn} 0.3s forwards;
  }
`;

export default function Navbar() {
  const { user } = useAuthContext();

  return (
    <Nav>
      <NavLeft>
        <h2>Goldmarket</h2>
      </NavLeft>
      <NavRight>
        <StyledLink to="/">홈</StyledLink>
        <StyledLink to="/sell">상품 등록</StyledLink>
        <StyledLink to="/chat">채팅</StyledLink>
        <StyledLink to="/favorites">찜 목록</StyledLink>
        <StyledLink to="/gold-exchange">금 교환</StyledLink>
        {/* 로그인한 경우 내 상품 관리 링크 추가 */}
        {user && <StyledLink to="/my-products">내 상품 관리</StyledLink>}
        {user ? (
          <>
            <StyledLink to="/profile">프로필</StyledLink>
            <Notifications userId={user.uid} />
          </>
        ) : (
          <>
            <StyledLink to="/login">로그인</StyledLink>
            <StyledLink to="/register">회원가입</StyledLink>
          </>
        )}
      </NavRight>
    </Nav>
  );
}
