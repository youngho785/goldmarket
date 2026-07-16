// src/pages/Lspa.js
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const LBS_VERSION = "v1.0";
const LBS_EFFECTIVE_DATE = "2025-08-16";

const Container = styled.div`
  max-width: 900px;
  margin: auto;
  padding: 40px 20px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text || "#333"};
`;
const Title = styled.h1`
  text-align: center;
  margin: 24px 0 8px;
  color: ${({ theme }) => theme.colors.primary || "#0f172a"};
`;
const Meta = styled.p`
  text-align: center;
  color: #6b7280;
  margin: 0 0 28px;
  font-size: 0.9rem;
`;
const Section = styled.section`
  margin-bottom: 24px;
  h2 {
    margin-bottom: 8px;
    font-size: 1.15rem;
    color: ${({ theme }) => theme.colors.primary || "#0f172a"};
  }
  p { margin-bottom: 10px; }
  ul { margin: 8px 0 12px 18px; }
`;
const TopBar = styled.div`
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme.colors.surface || "rgba(255,255,255,0.92)"};
  border-bottom: 1px solid #eee;
  backdrop-filter: saturate(180%) blur(8px);
  -webkit-backdrop-filter: saturate(180%) blur(8px);
`;
const TopInner = styled.div`
  max-width: 900px; margin: 0 auto; padding: 10px 20px;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.9rem; color: #555;
`;
const BackBtn = styled.button`
  padding: 8px 14px; border-radius: 9999px; border: 1px solid #ddd;
  background: #fff; cursor: pointer;
  &:hover { background: #fafafa; }
`;

export default function Lspa() {
  const nav = useNavigate();
  return (
    <>
      <TopBar>
        <TopInner>
          <span>위치기반서비스 이용약관 • 버전 {LBS_VERSION} • 시행 {LBS_EFFECTIVE_DATE}</span>
          <BackBtn onClick={() => nav(-1)} aria-label="이전으로">← 뒤로</BackBtn>
        </TopInner>
      </TopBar>

      <Container>
        <Title>위치기반서비스 이용약관</Title>
        <Meta>버전 {LBS_VERSION} · 시행일 {LBS_EFFECTIVE_DATE}</Meta>

        <Section>
          <h2>제1조 (목적)</h2>
          <p>한국골드마켓(이하 “회사”)가 제공하는 위치기반서비스의 이용과 관련한 권리·의무를 정합니다.</p>
        </Section>

        <Section>
          <h2>제2조 (정의)</h2>
          <ul>
            <li>① “개인위치정보”란 개인의 위치를 식별할 수 있는 정보를 말합니다.</li>
            <li>② “위치기반서비스”란 위치정보를 이용하여 제공하는 주변 탐색/거래장소 추천 등을 말합니다.</li>
          </ul>
        </Section>

        <Section>
          <h2>제3조 (동의 및 철회)</h2>
          <p>개인위치정보 수집·이용은 사전 동의를 전제로 하며, 이용자는 언제든지 동의를 철회할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제4조 (이용·보유·파기)</h2>
          <p>서비스 제공에 필요한 최소 기간 동안만 이용·보유하며, 목적 달성 즉시 파기합니다.</p>
        </Section>

        <Section>
          <h2>제5조 (권리)</h2>
          <p>이용자는 위치정보 이용·제공 사실 확인자료의 열람·정정을 요구할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제6조 (손해배상 및 분쟁)</h2>
          <p>회사는 고의 또는 중과실이 없는 한 손해에 대해 책임을 지지 않으며, 분쟁은 관계 법령 및 절차에 따릅니다.</p>
        </Section>

        <Section>
          <h2>부칙</h2>
          <p><strong>시행일</strong>: {LBS_EFFECTIVE_DATE}</p>
          <p><strong>버전</strong>: {LBS_VERSION}</p>
        </Section>
      </Container>
    </>
  );
}
