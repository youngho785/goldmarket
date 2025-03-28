// src/components/common/Navbar.js
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuthContext } from "../../context/AuthContext";
import Notifications from "./Notifications";

const Nav = styled.nav`
  background-color: ${({ theme }) => theme.colors.white};
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
`;

const NavLeft = styled.div`
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.main};
    font-size: 2em;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const NavRight = styled.div`
  display: flex;
  gap: ${({ theme }) =>
    typeof theme.spacing === "function" ? theme.spacing(3) : "24px"};
  align-items: center;
`;

const StyledLink = styled(Link)`
  font-size: 1em;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  transition: color 0.2s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
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
