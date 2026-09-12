import React from "react";
import styled from "styled-components";
import {
  livingGoldFloat,
  livingGoldGlint,
  livingGoldPulse,
  livingGoldReveal,
} from "@/styles/livingGoldMotion";

const Mark = styled.span`
  --living-gold-size: ${({ $size }) => `${Number($size) || 58}px`};

  position: relative;
  display: inline-grid;
  place-items: center;
  width: var(--living-gold-size);
  height: var(--living-gold-size);
  isolation: isolate;
  pointer-events: none;
  animation: ${livingGoldReveal} 720ms cubic-bezier(.2,.8,.2,1) ${({ $delay }) => Number($delay) || 0}ms both;

  &::before {
    content: "";
    position: absolute;
    inset: 7%;
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, transparent);
    border-radius: 50%;
    box-shadow:
      0 0 0 7px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 5%, transparent),
      0 0 28px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 14%, transparent);
    animation: ${livingGoldPulse} 5.8s ease-in-out 1.2s infinite;
  }

  &::after {
    content: "";
    position: absolute;
    top: 8%;
    right: 6%;
    width: 12%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 82%, white);
    box-shadow:
      calc(var(--living-gold-size) * -0.11) calc(var(--living-gold-size) * 0.05) 0 -1px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 72%, white),
      0 0 10px color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 64%, transparent);
  }
`;

const Orb = styled.span`
  position: relative;
  z-index: 1;
  display: block;
  width: 64%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 84%, white);
  border-radius: 50%;
  background:
    radial-gradient(circle at 31% 24%, rgba(255,255,255,.98) 0 5%, rgba(255,246,190,.92) 7% 13%, transparent 22%),
    radial-gradient(circle at 35% 28%, #f9dfa0 0 8%, #e7bd59 24%, #c78d27 52%, #875618 78%, #5d3810 100%);
  box-shadow:
    inset -8px -10px 16px rgba(91, 52, 8, 0.26),
    inset 6px 7px 12px rgba(255, 243, 177, 0.32),
    0 8px 18px rgba(103, 65, 18, 0.2),
    0 0 24px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 13%, transparent);
  animation: ${livingGoldFloat} 5.6s ease-in-out 1.2s infinite;

  &::after {
    content: "";
    position: absolute;
    inset: -30% auto -30% -45%;
    width: 32%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.68), transparent);
    filter: blur(1px);
    animation: ${livingGoldGlint} 5.8s ease-in-out 1.6s infinite;
  }
`;

export default function LivingGoldMark({ size = 58, delay = 0, className, title }) {
  return (
    <Mark
      className={className}
      $size={size}
      $delay={delay}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
    >
      <Orb />
    </Mark>
  );
}
