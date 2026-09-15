import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import styled, { keyframes } from "styled-components";

import GoldRushOverlay from "@/components/common/GoldRushOverlay";
import LivingGoldMark from "@/components/common/LivingGoldMark";

const TAP_WINDOW_MS = 2800;
const TAP_RESET_MS = 3000;
const RUSH_VISIBLE_MS = 1700;
const RUSH_COOLDOWN_MS = 2400;

const localRing = keyframes`
  0% { opacity: .94; transform: scale(.44); }
  58% { opacity: .48; }
  100% { opacity: 0; transform: scale(2.5); }
`;

const localSpark = keyframes`
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.25) rotate(0deg); }
  14% { opacity: 1; }
  70% { opacity: .96; }
  100% { opacity: 0; transform: translate(var(--x), var(--y)) scale(1.02) rotate(110deg); }
`;

const hintPop = keyframes`
  0%, 10% { opacity: 0; transform: translateY(3px) scale(.9); }
  18%, 68% { opacity: 1; transform: translateY(0) scale(1); }
  82%, 100% { opacity: 0; transform: translateY(-2px) scale(.94); }
`;

const Wrap = styled.span`
  position: relative;
  display: inline-grid;
  place-items: center;
  width: fit-content;
  height: fit-content;
  overflow: visible;
  isolation: isolate;
`;

const OrbButton = styled.button`
  position: relative;
  display: grid;
  place-items: center;
  min-width: ${({ $hitSize }) => `${Math.max(52, Number($hitSize) || 52)}px`};
  min-height: ${({ $hitSize }) => `${Math.max(52, Number($hitSize) || 52)}px`};
  margin: -10px;
  padding: 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;

  &:active {
    transform: scale3d(.93, .88, 1);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 72%, transparent);
    outline-offset: 2px;
  }
`;

const PopStage = styled.span`
  position: relative;
  z-index: 5;
  display: grid;
  place-items: center;
  transform-origin: 50% 78%;
  will-change: transform;
`;

const LocalBurst = styled.span`
  position: absolute;
  z-index: 8;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
`;

const LocalRing = styled.span`
  position: absolute;
  width: 76%;
  aspect-ratio: 1;
  border: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 92%, transparent);
  border-radius: 50%;
  box-shadow:
    0 0 14px color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 62%, transparent),
    0 0 30px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 32%, transparent);
  opacity: 0;
  animation: ${localRing} 640ms cubic-bezier(.12,.76,.16,1) both;
`;

const LocalSpark = styled.span`
  --x: ${({ $x }) => `${Number($x) || 0}px`};
  --y: ${({ $y }) => `${Number($y) || 0}px`};
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${({ $size }) => `${Number($size) || 8}px`};
  height: ${({ $size }) => `${Number($size) || 8}px`};
  opacity: 0;
  animation: ${localSpark} 660ms cubic-bezier(.1,.78,.14,1) ${({ $delay }) => `${Number($delay) || 0}ms`} both;

  &::before,
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    border-radius: 999px;
    background: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 88%, white);
    box-shadow:
      0 0 6px rgba(255,255,255,.9),
      0 0 15px color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 92%, transparent);
  }

  &::before { width: 2px; height: 100%; }
  &::after { width: 100%; height: 2px; }
`;

const TapHint = styled.span`
  position: absolute;
  z-index: 9;
  top: -2px;
  right: -7px;
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 3px 7px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 999px;
  background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 88%, white);
  box-shadow: 0 5px 14px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 8%, transparent);
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .52rem;
  font-weight: 950;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  animation: ${hintPop} 3.8s ease 1.15s both;
`;

const LOCAL_SPARKS = [
  { x: -46, y: -34, delay: 0, size: 10 },
  { x: -18, y: -52, delay: 18, size: 7 },
  { x: 18, y: -55, delay: 32, size: 10 },
  { x: 48, y: -28, delay: 46, size: 8 },
  { x: 51, y: 18, delay: 60, size: 9 },
  { x: 22, y: 46, delay: 74, size: 7 },
  { x: -22, y: 48, delay: 88, size: 10 },
  { x: -50, y: 18, delay: 102, size: 7 },
];

function bounceFrames(level) {
  const lift = level >= 3 ? 50 : level === 2 ? 38 : 28;
  const squeeze = level >= 3 ? .60 : level === 2 ? .66 : .72;
  const stretch = level >= 3 ? 1.28 : level === 2 ? 1.21 : 1.16;

  return [
    { transform: "translate3d(0,0,0) scale3d(1,1,1) rotate(0deg)", offset: 0 },
    { transform: `translate3d(0,7px,0) scale3d(1.18,${squeeze},1) rotate(-4deg)`, offset: .13 },
    { transform: `translate3d(0,-${lift}px,0) scale3d(.90,${stretch},1) rotate(6deg)`, offset: .36 },
    { transform: `translate3d(0,-${Math.round(lift * .4)}px,0) scale3d(1.08,.93,1) rotate(-5deg)`, offset: .53 },
    { transform: "translate3d(0,4px,0) scale3d(1.10,.80,1) rotate(2deg)", offset: .68 },
    { transform: `translate3d(0,-${Math.round(lift * .18)}px,0) scale3d(.98,1.08,1) rotate(-2deg)`, offset: .82 },
    { transform: "translate3d(0,0,0) scale3d(1,1,1) rotate(0deg)", offset: 1 },
  ];
}

async function playTapHaptics(level, goldRush) {
  let nativeWorked = false;

  try {
    await Haptics.impact({
      style: level >= 2 ? ImpactStyle.Heavy : ImpactStyle.Medium,
    });
    nativeWorked = true;
  } catch {
    // Continue with other haptic fallbacks.
  }

  if (goldRush) {
    try {
      await Haptics.notification({ type: NotificationType.Success });
      nativeWorked = true;
    } catch {
      // Continue with vibration fallback.
    }
  }

  try {
    await Haptics.vibrate({ duration: goldRush ? 82 : level === 2 ? 58 : 42 });
    nativeWorked = true;
  } catch {
    // Browser fallback below.
  }

  if (nativeWorked) return;

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(goldRush ? [64, 28, 38] : level === 2 ? [48, 22, 26] : 38);
    }
  } catch {
    // Living Gold haptics are decorative and must never block the UI.
  }
}

export default function LivingGoldCompanion({
  size = 58,
  delay = 0,
  className,
  ariaLabel = "Living Gold 반짝이기",
  hint = false,
}) {
  const [burstId, setBurstId] = useState(0);
  const [hasTapped, setHasTapped] = useState(false);
  const [rush, setRush] = useState(null);
  const stageRef = useRef(null);
  const buttonRef = useRef(null);
  const bounceAnimationRef = useRef(null);
  const tapRef = useRef({ count: 0, lastAt: 0 });
  const tapResetTimerRef = useRef(null);
  const rushTimerRef = useRef(null);
  const rushCooldownUntilRef = useRef(0);

  const effectiveAriaLabel = String(ariaLabel || "Living Gold 반짝이기").replace(/열기/g, "반짝이기");
  const localSparkles = useMemo(() => LOCAL_SPARKS, []);

  const runBounce = useCallback((level) => {
    const node = stageRef.current;
    if (!node) return;

    try {
      bounceAnimationRef.current?.cancel();
      if (typeof node.animate !== "function") return;
      bounceAnimationRef.current = node.animate(bounceFrames(level), {
        duration: level >= 3 ? 780 : level === 2 ? 680 : 590,
        easing: "cubic-bezier(.16,.88,.18,1)",
        fill: "none",
      });
    } catch {
      // The decorative bounce must never affect the page.
    }
  }, []);

  const activate = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const withinWindow = now - tapRef.current.lastAt <= TAP_WINDOW_MS;
    let count = withinWindow ? Math.min(tapRef.current.count + 1, 3) : 1;
    const canRush = now >= rushCooldownUntilRef.current;
    const triggerRush = count === 3 && canRush;
    const level = triggerRush ? 3 : Math.min(count, 2);

    setHasTapped(true);
    setBurstId((value) => value + 1);
    runBounce(level);
    void playTapHaptics(level, triggerRush);

    if (tapResetTimerRef.current) window.clearTimeout(tapResetTimerRef.current);

    if (triggerRush) {
      const rect = buttonRef.current?.getBoundingClientRect?.();
      const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
      const rushId = Date.now();

      setRush({ id: rushId, originX, originY });
      rushCooldownUntilRef.current = now + RUSH_COOLDOWN_MS;
      count = 0;

      if (rushTimerRef.current) window.clearTimeout(rushTimerRef.current);
      rushTimerRef.current = window.setTimeout(() => setRush(null), RUSH_VISIBLE_MS);
    }

    tapRef.current = { count, lastAt: now };
    tapResetTimerRef.current = window.setTimeout(() => {
      tapRef.current = { count: 0, lastAt: 0 };
    }, TAP_RESET_MS);
  }, [runBounce]);

  useEffect(() => () => {
    bounceAnimationRef.current?.cancel?.();
    if (tapResetTimerRef.current) window.clearTimeout(tapResetTimerRef.current);
    if (rushTimerRef.current) window.clearTimeout(rushTimerRef.current);
  }, []);

  return (
    <Wrap className={className}>
      <OrbButton
        ref={buttonRef}
        type="button"
        aria-label={effectiveAriaLabel}
        $hitSize={size}
        onClick={activate}
      >
        <PopStage ref={stageRef}>
          <LivingGoldMark size={size} delay={delay} />
        </PopStage>
        {burstId > 0 && (
          <LocalBurst key={burstId} aria-hidden>
            <LocalRing />
            {localSparkles.map((spark, index) => (
              <LocalSpark
                key={`${spark.x}-${spark.y}-${index}`}
                $x={spark.x}
                $y={spark.y}
                $delay={spark.delay}
                $size={spark.size}
              />
            ))}
          </LocalBurst>
        )}
      </OrbButton>
      {hint && !hasTapped && <TapHint aria-hidden>톡</TapHint>}
      <GoldRushOverlay rush={rush} />
    </Wrap>
  );
}
