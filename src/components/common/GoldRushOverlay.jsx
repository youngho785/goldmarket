import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import styled, { css } from "styled-components";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  pointer-events: none;
  contain: layout paint style;
`;

const Glow = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0;
  background:
    radial-gradient(
      circle at ${({ $x }) => `${Number($x) || 50}px`} ${({ $y }) => `${Number($y) || 50}px`},
      rgba(255, 247, 196, .56) 0 3%,
      rgba(237, 194, 83, .25) 8%,
      rgba(198, 139, 34, .10) 21%,
      transparent 36%
    );
`;

const Ring = styled.span`
  position: absolute;
  left: ${({ $x }) => `${Number($x) || 50}px`};
  top: ${({ $y }) => `${Number($y) || 50}px`};
  width: 58px;
  height: 58px;
  border: 2px solid rgba(246, 210, 110, .96);
  border-radius: 50%;
  box-shadow:
    0 0 18px rgba(255, 236, 162, .76),
    0 0 54px rgba(201, 146, 40, .38);
  opacity: 0;
  transform: translate(-50%, -50%) scale(.28);
`;

const Particle = styled.span`
  position: absolute;
  left: ${({ $x }) => `${Number($x) || 50}vw`};
  top: ${({ $y }) => `${Number($y) || 0}vh`};
  width: ${({ $size }) => `${Number($size) || 6}px`};
  height: ${({ $size }) => `${Number($size) || 6}px`};
  color: #f4ce68;
  opacity: 0;
  will-change: transform, opacity, filter;

  ${({ $star, $size }) => $star ? css`
    display: grid;
    place-items: center;
    width: auto;
    height: auto;
    font-size: ${Math.max(9, Number($size) || 9)}px;
    font-weight: 900;
    line-height: 1;
    text-shadow:
      0 0 5px rgba(255,255,255,.92),
      0 0 13px rgba(245,205,99,.90),
      0 0 28px rgba(195,132,27,.48);
  ` : css`
    border-radius: 50%;
    background: radial-gradient(circle at 34% 28%, #fffbe1 0 16%, #f1d06f 30%, #c98d29 70%, #805014 100%);
    box-shadow:
      0 0 5px rgba(255,245,194,.94),
      0 0 14px rgba(214,157,47,.58);
  `}
`;

function makeRandom(seed) {
  let value = (Number(seed) || 1) >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function buildParticles(seed) {
  const random = makeRandom(seed);
  return Array.from({ length: 56 }, (_, index) => {
    const star = index % 4 === 0 || index % 9 === 0;
    return {
      id: `${seed}-${index}`,
      star,
      x: 2 + random() * 96,
      y: -10 + random() * 56,
      drift: -14 + random() * 28,
      fall: 48 + random() * 76,
      spin: (random() > .5 ? 1 : -1) * (140 + random() * 460),
      endScale: .62 + random() * .94,
      size: star ? 10 + random() * 11 : 4 + random() * 6,
      delay: random() * 170,
      duration: 980 + random() * 520,
    };
  });
}

function safeAnimate(node, keyframes, options) {
  if (!node || typeof node.animate !== "function") return null;
  try {
    return node.animate(keyframes, options);
  } catch {
    return null;
  }
}

export default function GoldRushOverlay({ rush }) {
  const overlayRef = useRef(null);
  const glowRef = useRef(null);
  const ringRef = useRef(null);
  const particles = useMemo(() => buildParticles(rush?.id || 1), [rush?.id]);

  useEffect(() => {
    if (!rush) return undefined;

    const animations = [];
    const glowAnimation = safeAnimate(
      glowRef.current,
      [
        { opacity: 0, offset: 0 },
        { opacity: .38, offset: .12 },
        { opacity: .20, offset: .46 },
        { opacity: 0, offset: 1 },
      ],
      { duration: 980, easing: "ease-out", fill: "both" }
    );
    if (glowAnimation) animations.push(glowAnimation);

    const ringAnimation = safeAnimate(
      ringRef.current,
      [
        { opacity: .96, transform: "translate(-50%, -50%) scale(.28)", offset: 0 },
        { opacity: .56, offset: .48 },
        { opacity: 0, transform: "translate(-50%, -50%) scale(6.4)", offset: 1 },
      ],
      { duration: 900, easing: "cubic-bezier(.12,.78,.14,1)", fill: "both" }
    );
    if (ringAnimation) animations.push(ringAnimation);

    const particleNodes = overlayRef.current?.querySelectorAll?.("[data-gold-rush-particle]") || [];
    particleNodes.forEach((node, index) => {
      const particle = particles[index];
      if (!particle) return;

      const particleAnimation = safeAnimate(
        node,
        [
          {
            opacity: 0,
            transform: "translate3d(0,-10px,0) scale(.45) rotate(0deg)",
            filter: "brightness(.9)",
            offset: 0,
          },
          {
            opacity: 1,
            filter: "brightness(1.42)",
            offset: .10,
          },
          {
            opacity: .96,
            filter: "brightness(1.08)",
            offset: .72,
          },
          {
            opacity: 0,
            transform: `translate3d(${particle.drift}vw, ${particle.fall}vh, 0) scale(${particle.endScale}) rotate(${particle.spin}deg)`,
            filter: "brightness(.92)",
            offset: 1,
          },
        ],
        {
          duration: particle.duration,
          delay: particle.delay,
          easing: "cubic-bezier(.14,.64,.24,1)",
          fill: "both",
        }
      );
      if (particleAnimation) animations.push(particleAnimation);
    });

    return () => {
      animations.forEach((animation) => {
        try {
          animation.cancel();
        } catch {
          // Gold Rush is decorative; cleanup must never affect the page.
        }
      });
    };
  }, [particles, rush]);

  if (!rush || typeof document === "undefined") return null;

  return createPortal(
    <Overlay ref={overlayRef} aria-hidden>
      <Glow ref={glowRef} $x={rush.originX} $y={rush.originY} />
      <Ring ref={ringRef} $x={rush.originX} $y={rush.originY} />
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          data-gold-rush-particle
          $star={particle.star}
          $x={particle.x}
          $y={particle.y}
          $size={particle.size}
        >
          {particle.star ? "✦" : null}
        </Particle>
      ))}
    </Overlay>,
    document.body
  );
}
