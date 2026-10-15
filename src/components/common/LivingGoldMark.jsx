import React from "react";
import styled, { keyframes } from "styled-components";
import { Gem } from "lucide-react";

const appear = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const Mark = styled.span`
  display: inline-grid;
  place-items: center;
  width: ${({ $size }) => `${Number($size) || 58}px`};
  height: ${({ $size }) => `${Number($size) || 58}px`};
  color: ${({ theme }) => theme.colors.gold};
  pointer-events: none;
  animation: ${appear} 300ms ease ${({ $delay }) => Number($delay) || 0}ms both;
  svg { width: 70%; height: 70%; stroke-width: 1.25; }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export default function LivingGoldMark({ size = 58, delay = 0, className, title }) {
  return <Mark className={className} $size={size} $delay={delay}
    aria-hidden={title ? undefined : true} role={title ? "img" : undefined} aria-label={title || undefined}>
    <Gem aria-hidden="true" />
  </Mark>;
}
