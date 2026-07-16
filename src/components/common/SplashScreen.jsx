import React from "react";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const rotate = keyframes`
  to { transform: rotate(360deg); }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.2; transform: scale(0.9) translateY(0); }
  50% { opacity: 1; transform: scale(1.05) translateY(-2px); }
`;

const Wrap = styled.div`
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(1200px 900px at 70% 10%, #151515, #0b0b0d);
  color: #fff; z-index: 9999;
`;

const Card = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  padding: 36px 28px; border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  box-shadow: 0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(6px);
  animation: ${fadeIn} 420ms ease-out both;
`;

const Brand = styled.h1`
  font-weight: 800; letter-spacing: 0.6px; margin: 0; text-align: center;
  font-size: clamp(24px, 4.5vw, 34px);
  background: linear-gradient(
    90deg,
    #A8751A 0%,
    #E9C46A 25%,
    #FFF2BF 50%,
    #E9C46A 75%,
    #A8751A 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  background-size: 200% 100%;
  animation: ${shimmer} 3.2s linear infinite;
`;

const Subtitle = styled.p`
  margin: 0; opacity: 0.9; font-size: 15px;
  color: ${({ theme }) => theme.colors?.mutedText || "#d8d8d8"};
`;

const Spinner = styled.div`
  width: 64px; height: 64px; border-radius: 50%;
  border: 6px solid rgba(255,255,255,0.1);
  border-top-color: ${({ theme }) => theme.colors?.primary || "#E9C46A"};
  animation: ${rotate} 1s linear infinite;
`;

const Twinkles = styled.div`
  position: relative; width: 160px; height: 16px; margin-top: 6px;
  &::before, &::after {
    content: "✦";
    position: absolute; top: 0;
    color: #ffe9a8;
    text-shadow: 0 0 8px rgba(255, 233, 168, 0.6);
    animation: ${twinkle} 1.8s ease-in-out infinite;
  }
  &::before { left: 22px; animation-delay: .1s; }
  &::after { right: 22px; animation-delay: .7s; }
`;

// 접근성: 동작 줄이기 선호 시 애니메이션 최소화
const ReduceMotion = styled.div`
  @media (prefers-reduced-motion: reduce) {
    ${Spinner} { animation: none; border-top-color: #E9C46A; }
    ${Brand} { animation: none; }
    ${Twinkles}::before, ${Twinkles}::after { animation: none; opacity: .5; }
  }
`;

export default function SplashScreen({
  title = "한국골드마켓에 오신 것을 환영합니다.",
  message = "곧 시작됩니다.",
}) {
  return (
    <Wrap role="status" aria-live="polite">
      <ReduceMotion>
        <Card>
          <Brand>{title}</Brand>
          <Subtitle>{message}</Subtitle>
          <Spinner />
          <Twinkles />
        </Card>
      </ReduceMotion>
    </Wrap>
  );
}
