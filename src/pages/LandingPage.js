// src/pages/LandingPage.js
import React from "react";
import styled, { keyframes } from "styled-components";
import { Link } from "react-router-dom";

// 왼쪽 섹션 슬라이드 인 애니메이션 (왼쪽에서 등장)
const slideInLeft = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// 오른쪽 섹션 슬라이드 인 애니메이션 (오른쪽에서 등장)
const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// 페이드 인 애니메이션 (내용 전환 효과)
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: #ffffff;
`;

const Section = styled(Link)`
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-decoration: none;
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease, filter 0.3s ease, border 0.3s ease;
  animation: ${(props) =>
      props.slide === "left" ? slideInLeft : slideInRight}
    1s ease forwards;
  
  &:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
    border: 4px solid rgba(0, 123, 255, 0.8);
    z-index: 1;
  }
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 123, 255, 0.2);
  transition: background 0.3s ease;
  
  ${Section}:hover & {
    background: rgba(0, 123, 255, 0.4);
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 20px;
  animation: ${fadeIn} 0.8s ease forwards;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 20px;
  letter-spacing: 1px;
  color: #fff;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
`;

const SubTitle = styled.p`
  font-size: 1.5rem;
  line-height: 1.4;
  color: #fff;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.8);
`;

export default function LandingPage() {
  return (
    <Container>
      {/* 왼쪽 섹션: 귀금속 리사이클 중고거래 → /trade로 이동 */}
      <Section
        to="/trade"
        slide="left"
        style={{ backgroundImage: "url('https://example.com/trade.jpg')" }}
      >
        <Overlay />
        <Content>
          <Title>귀금속 리사이클 중고거래</Title>
          <SubTitle>스마트하게 가치 있게 거래하세요!</SubTitle>
        </Content>
      </Section>

      {/* 오른쪽 섹션: 순금 교환 요청 → /gold-exchange로 이동 */}
      <Section
        to="/gold-exchange"
        slide="right"
        style={{ backgroundImage: "url('https://example.com/gold-exchange.jpg')" }}
      >
        <Overlay />
        <Content>
          <Title>순금 교환 요청</Title>
          <SubTitle>프리미엄 순금을 신뢰할 수 있게 교환하세요!</SubTitle>
        </Content>
      </Section>
    </Container>
  );
}
