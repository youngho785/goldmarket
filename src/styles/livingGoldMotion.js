import { keyframes } from "styled-components";

export const livingGoldReveal = keyframes`
  0% { opacity: 0; transform: translateY(8px) scale(0.985); }
  68% { opacity: 1; transform: translateY(-1px) scale(1.006); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

export const livingGoldSweep = keyframes`
  0% { transform: translateX(-145%) skewX(-18deg); opacity: 0; }
  18% { opacity: 0.12; }
  52% { opacity: 0.48; }
  78% { opacity: 0.12; }
  100% { transform: translateX(210%) skewX(-18deg); opacity: 0; }
`;

export const livingGoldFloat = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -3px, 0); }
`;

export const livingGoldPulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.94); }
  50% { opacity: 0.7; transform: scale(1.04); }
`;

export const livingGoldGlint = keyframes`
  0%, 18% { transform: translateX(-160%) rotate(18deg); opacity: 0; }
  34% { opacity: 0.12; }
  52% { opacity: 0.6; }
  70% { opacity: 0.08; }
  100% { transform: translateX(210%) rotate(18deg); opacity: 0; }
`;

export const livingGoldTrail = keyframes`
  0% { transform: scaleX(0); opacity: 0.45; }
  100% { transform: scaleX(1); opacity: 1; }
`;

export const livingGoldArrive = keyframes`
  0%, 60% { opacity: 0; transform: translate(-50%, -50%) scale(0.45); }
  78% { opacity: 1; transform: translate(-50%, -50%) scale(1.26); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

export const livingGoldJourney = keyframes`
  0% { left: 4%; opacity: 0; transform: translate(-50%, -50%) scale(0.55); }
  12% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  88% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { left: 96%; opacity: 0; transform: translate(-50%, -50%) scale(0.65); }
`;
