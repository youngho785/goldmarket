import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";

import LivingGoldCompanion from "@/components/common/LivingGoldCompanion";
import { livingGoldSweep } from "@/styles/livingGoldMotion";

const viewEnter = keyframes`
  from { opacity: 0; transform: translateY(7px); }
  to { opacity: 1; transform: translateY(0); }
`;

const heroValueReveal = keyframes`
  0% { opacity: 0; transform: translateY(8px) scale(0.985); filter: blur(2px); }
  70% { opacity: 1; transform: translateY(0) scale(1.008); filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
`;

const goalFill = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

const goldDotArrive = keyframes`
  0%, 70% { opacity: 0; transform: translate(50%, -50%) scale(0.35); }
  82% { opacity: 1; transform: translate(50%, -50%) scale(1.28); }
  100% { opacity: 1; transform: translate(50%, -50%) scale(1); }
`;

const toastEnter = keyframes`
  0% { opacity: 0; transform: translate(-50%, 10px) scale(0.97); }
  18%, 82% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -4px) scale(0.99); }
`;

const seedArrive = keyframes`
  0% { opacity: 0; transform: translateY(7px) scale(0.72) rotate(-10deg); }
  68% { opacity: 1; transform: translateY(-1px) scale(1.08) rotate(2deg); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
`;

export const Page = styled.div`
  display: grid;
  gap: 14px;
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 8px 0 28px;
`;

export const VaultHero = styled.section`
  position: relative;
  min-height: 100%;
  display: grid;
  overflow: hidden;
  gap: 10px;
  padding: clamp(16px, 2.8vw, 21px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, ${({ theme }) => theme.colors.border});
  border-radius: 20px;
  background:
    linear-gradient(
      140deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 20%, white),
      ${({ theme }) => theme.colors.surface} 72%
    );
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 8px 24px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
  animation: ${viewEnter} 420ms cubic-bezier(.2,.8,.2,1) both;

  &::after {
    content: "";
    position: absolute;
    z-index: 0;
    top: -30%;
    bottom: -30%;
    left: -20%;
    width: 16%;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 58%, transparent), transparent);
    pointer-events: none;
    animation: ${livingGoldSweep} 1650ms cubic-bezier(.2,.8,.2,1) 420ms both;
  }

  @media (max-width: 520px) {
    gap: 9px;
    padding: 15px 14px 16px;
    border-radius: 18px;
  }
`;


export const HeroGoldMark = styled(LivingGoldCompanion)`
  position: absolute;
  z-index: 1;
  top: 12px;
  right: 14px;
  opacity: 0.98;

  @media (max-width: 520px) {
    top: 11px;
    right: 11px;
    transform: scale(.88);
    transform-origin: top right;
  }
`;

export const HeroKicker = styled.div`
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.61rem;
  font-weight: 950;
  letter-spacing: 0.08em;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.gold};
  }
`;

export const HeroTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.02rem, 3vw, 1.32rem);
  font-weight: 600;
  line-height: 1.22;
  letter-spacing: -0.03em;
`;

export const HeroAmount = styled.strong`
  position: relative;
  z-index: 1;
  display: block;
  margin-top: -1px;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: ${({ $empty }) => $empty ? "clamp(1.2rem, 4vw, 1.65rem)" : "clamp(2.15rem, 6.5vw, 3.35rem)"};
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.05em;
  overflow-wrap: anywhere;
  animation: ${heroValueReveal} 620ms cubic-bezier(.2,.8,.2,1) 70ms both;
`;

export const HeroValueNote = styled.p`
  position: relative;
  z-index: 1;
  margin: -3px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.62rem;
  font-weight: 750;
  line-height: 1.4;
  word-break: keep-all;
`;

export const HeroChangeGroup = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 6px 14px;
  flex-wrap: wrap;
  animation: ${viewEnter} 430ms cubic-bezier(.2,.8,.2,1) 150ms both;
`;

export const HeroChange = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.semantic.alertErrorText
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textSecondary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.73rem;
  font-weight: 900;

  svg { width: 14px; height: 14px; }
`;

export const HeroStats = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(${({ $hasBonus }) => ($hasBonus ? 3 : 2)}, minmax(0, 1fr));
  margin-top: 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

export const HeroStat = styled.div`
  min-width: 0;
  padding: 9px 10px;

  & + & {
    border-left: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  }

  span {
    display: block;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: clamp(0.51rem, 1.8vw, 0.58rem);
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(0.74rem, 2.4vw, 0.9rem);
    font-weight: 950;
    line-height: 1.15;
    white-space: nowrap;
  }

  @media (max-width: 420px) {
    padding-inline: 7px;
  }
`;

export const ReadinessPanel = styled(Link)`
  position: relative;
  min-height: 100%;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 11px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 13px;
  background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 46%, ${({ theme }) => theme.colors.surface});
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;

  &:hover {
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 38%, ${({ theme }) => theme.colors.border});
    background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 68%, ${({ theme }) => theme.colors.surface});
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 55%, transparent);
    outline-offset: 2px;
  }

  > div {
    min-width: 0;
  }

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(0.76rem, 2.7vw, 0.9rem);
    font-weight: 950;
    line-height: 1.3;
    word-break: keep-all;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    line-height: 1.4;
    word-break: keep-all;
  }

  > svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  @media (max-width: 900px) {
    min-height: auto;
  }
`;

export const HeroActions = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
`;

export const HeroAddAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 0.73rem;
  font-weight: 950;
  cursor: pointer;
  grid-column: 1 / -1;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.goldLight};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const HeroExchangeAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 9px 11px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 30%, ${({ theme }) => theme.colors.border});
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.7rem;
  font-weight: 900;
  text-decoration: none;

  svg {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

export const GuestModeNote = styled.p`
  position: relative;
  z-index: 1;
  margin: -2px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.62rem;
  line-height: 1.45;
  text-align: center;
  word-break: keep-all;
`;

export const VaultSection = styled.section`
  display: grid;
  gap: 11px;
  padding: clamp(14px, 2.6vw, 18px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 10%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 7px 20px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);
`;

export const ViewTabs = styled.nav`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const ViewTab = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 7px 8px;
  border-radius: 10px;
  background: ${({ $active, theme }) => $active ? theme.colors.primary : "transparent"};
  text-decoration: none;
  font-size: 0.69rem;
  font-weight: 950;
  transition: background ${({ theme }) => theme.transitions.base}, color ${({ theme }) => theme.transitions.base}, transform ${({ theme }) => theme.transitions.fast};

  && {
    color: ${({ $active, theme }) => $active ? theme.colors.buttonText : theme.colors.textSecondary};
  }

  &:hover {
    color: ${({ $active, theme }) => $active ? theme.colors.buttonText : theme.colors.primary};
  }

  &:active {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 48%, transparent);
    outline-offset: 2px;
  }
`;


export const SummaryOverviewGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.75fr);
  gap: 14px;
  align-items: stretch;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const SummarySideStack = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 14px;
  min-width: 0;
`;

export const ViewPanel = styled.div`
  display: grid;
  gap: 14px;
  animation: ${viewEnter} 280ms cubic-bezier(.2,.8,.2,1) both;
`;

export const ViewIntro = styled.section`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 15px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 10%, ${({ theme }) => theme.colors.border});
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surface};

  h1 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.08rem;
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.64rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

export const SummaryHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.92rem;
    font-weight: 950;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    text-decoration: none;
    font-size: 0.62rem;
    font-weight: 900;
  }
`;

export const SummaryItems = styled.div`
  display: grid;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 13px;
`;

export const SummaryItem = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 11px;
  background: ${({ theme }) => theme.colors.surface};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  }

  .copy {
    min-width: 0;
  }

  strong {
    display: block;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.76rem;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: block;
    margin-top: 3px;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.6rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.7rem;
    font-weight: 950;
    white-space: nowrap;
  }
`;

export const GoalProgress = styled.div`
  display: grid;
  gap: 5px;
  margin-top: 8px;

  .labels {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.58rem;
    font-weight: 800;
  }
`;

export const GoalTrack = styled.div`
  position: relative;
  height: 6px;
  margin-right: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.dividerSubtle};

  span {
    position: relative;
    display: block;
    width: ${({ $progress }) => `${Math.max(0, Math.min(100, Number($progress) || 0))}%`};
    height: 100%;
    border-radius: inherit;
    background: ${({ theme }) => theme.gradients.gold};
    transform-origin: left center;
    animation: ${goalFill} 760ms cubic-bezier(.2,.8,.2,1) 140ms both;
  }

  span::after {
    content: "";
    position: absolute;
    top: 50%;
    right: 0;
    width: 11px;
    height: 11px;
    border: 2px solid ${({ theme }) => theme.colors.surface};
    border-radius: 50%;
    background: ${({ theme }) => theme.gradients.gold};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 14%, transparent),
      0 2px 7px color-mix(in srgb, ${({ theme }) => theme.colors.secondaryDark} 26%, transparent);
    animation: ${goldDotArrive} 860ms cubic-bezier(.2,.8,.2,1) 120ms both;
  }
`;

export const SectionHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  > div:first-child {
    min-width: 0;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.06rem;
    font-weight: 950;
    letter-spacing: -0.025em;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.64rem;
    line-height: 1.45;
    word-break: keep-all;
  }

  @media (max-width: 620px) {
    flex-direction: column;
    gap: 8px;

    > div:first-child {
      width: 100%;
    }
  }
`;

export const SectionActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;

  @media (max-width: 620px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

export const AddGoldButton = styled.button`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, ${({ theme }) => theme.colors.border});
  border-radius: 11px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.68rem;
  font-weight: 950;
  cursor: pointer;
`;

export const FormOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 4200;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(3, 12, 20, 0.62);
  backdrop-filter: blur(4px);

  @media (max-width: 620px) {
    place-items: end stretch;
    padding: 0;
  }
`;

export const FormSheet = styled.section`
  width: min(100%, 620px);
  max-height: min(86vh, 780px);
  overflow: auto;
  padding: 20px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 24px 70px rgba(0,0,0,0.28);

  @media (max-width: 620px) {
    width: 100%;
    max-height: calc(92vh - env(safe-area-inset-top, 0px));
    padding: 18px 18px calc(20px + env(safe-area-inset-bottom, 0px));
    border-radius: 24px 24px 0 0;
  }
`;

export const FormSheetHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.15rem;
    font-weight: 950;
    letter-spacing: -0.03em;
  }

  button {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
`;

export const ValuePanel = styled.section`
  position: relative;
  overflow: hidden;
  padding: clamp(18px, 4vw, 26px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 92% 8%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 11%, transparent) 0,
      transparent 32%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 42%, white),
      ${({ theme }) => theme.colors.surface} 70%
    );
  box-shadow: 0 8px 24px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

export const ValueKicker = styled.small`
  display: block;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.61rem;
  font-weight: 950;
  letter-spacing: 0.12em;
`;

export const ValueTitle = styled.h2`
  margin: 5px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.96rem;
  line-height: 1.3;
`;

export const ValueAmount = styled.strong`
  display: block;
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: ${({ $empty }) =>
    $empty ? "clamp(1.35rem, 4.4vw, 2rem)" : "clamp(2.2rem, 7vw, 3.8rem)"};
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.055em;
  overflow-wrap: anywhere;
`;

export const ValueChange = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 9px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.semantic.alertErrorText
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textSecondary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.76rem;
  font-weight: 900;

  svg {
    width: 15px;
    height: 15px;
  }
`;

export const ValueChangeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 7px 12px;
  flex-wrap: wrap;

  ${ValueChange} {
    margin-top: 9px;
  }
`;

export const FoldPanel = styled.details`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);

  &[open] > summary {
    border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  }

  > summary::after {
    content: "+";
  }

  &[open] > summary::after {
    content: "−";
  }
`;

export const FoldSummary = styled.summary`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 13px 15px;
  cursor: pointer;
  list-style: none;
  user-select: none;

  &::-webkit-details-marker {
    display: none;
  }

  > div {
    min-width: 0;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.9rem;
    font-weight: 900;
    letter-spacing: -0.02em;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    line-height: 1.35;
  }

  &::after {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 1rem;
    font-weight: 900;
    line-height: 1;
  }
`;

export const FoldBody = styled.div`
  padding: 13px 15px 15px;
`;

export const CompareRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

export const DateInput = styled.input`
  flex: 1 1 180px;
  min-width: 0;
  min-height: 40px;
  padding: 7px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.76rem;
`;

export const CompareButton = styled.button`
  min-height: 40px;
  padding: 7px 12px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 0.72rem;
  font-weight: 900;
  cursor: pointer;

  &[data-variant="ghost"] {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const ComparisonResult = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.7rem;
  line-height: 1.55;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-weight: 900;
  }
`;

export const CompareError = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.67rem;
  font-weight: 800;
`;

export const GuestVaultPanel = styled.section`
  display: grid;
  gap: 14px;
  padding: clamp(18px, 3vw, 24px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, ${({ theme }) => theme.colors.border});
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 28px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.61rem;
    font-weight: 950;
    letter-spacing: 0.12em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.2rem, 3.6vw, 1.55rem);
    line-height: 1.25;
    letter-spacing: -0.03em;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.76rem;
    line-height: 1.62;
    word-break: keep-all;
  }
`;

export const GuestBenefits = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;

  span {
    display: grid;
    place-items: center;
    min-height: 48px;
    padding: 8px 6px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.66rem;
    font-weight: 850;
    text-align: center;
    word-break: keep-all;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;

    span {
      min-height: 40px;
    }
  }
`;

export const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const SummaryCard = styled.div`
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 14px 13px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, ${({ theme }) => theme.colors.border});
  border-radius: 17px;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 22%, white),
      ${({ theme }) => theme.colors.surface} 64%
    );
  box-shadow: 0 6px 18px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    font-weight: 850;
    letter-spacing: -0.01em;
  }

  strong {
    display: block;
    margin-top: 5px;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(0.92rem, 3.2vw, 1.06rem);
    font-weight: 950;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

`;

export const ExchangeCta = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 15%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 20%, white),
      ${({ theme }) => theme.colors.surface} 72%
    );
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  transition:
    border-color ${({ theme }) => theme.transitions.base},
    background ${({ theme }) => theme.transitions.base};

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.86rem;
    font-weight: 900;
    line-height: 1.35;
    letter-spacing: -0.02em;
    word-break: keep-all;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    line-height: 1.45;
    word-break: keep-all;
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.64rem;
    font-weight: 900;
  }

  > svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: color-mix(
      in srgb,
      ${({ theme }) => theme.colors.gold} 32%,
      ${({ theme }) => theme.colors.border}
    );
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  @media (max-width: 520px) {
    padding: 11px 12px;
    border-radius: 14px;

    strong {
      font-size: 0.82rem;
    }

    p {
      font-size: 0.6rem;
    }

    > svg {
      width: 17px;
      height: 17px;
    }
  }
`;

export const Panel = styled.section`
  overflow: hidden;
  padding: clamp(15px, 3vw, 18px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 10%, ${({ theme }) => theme.colors.border});
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 28px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);
`;

export const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: -0.025em;
  }

  small {
    display: inline-flex;
    align-items: center;
    min-height: 25px;
    padding: 4px 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 850;
    white-space: nowrap;
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 10px;
`;

export const Field = styled.label`
  display: grid;
  gap: 5px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.7rem;
  font-weight: 900;
`;

export const Input = styled.input`
  min-height: 45px;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background:
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.surface} 0%,
      ${({ theme }) => theme.colors.surfaceAlt} 100%
    );
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.88rem;
  transition:
    border-color ${({ theme }) => theme.transitions.base},
    box-shadow ${({ theme }) => theme.transitions.base};

  &:focus {
    outline: 0;
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 55%, ${({ theme }) => theme.colors.border});
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 11%, transparent);
  }
`;

export const Select = styled.select`
  min-height: 45px;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background:
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.surface} 0%,
      ${({ theme }) => theme.colors.surfaceAlt} 100%
    );
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.86rem;

  &:focus {
    outline: 0;
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 55%, ${({ theme }) => theme.colors.border});
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 11%, transparent);
  }
`;

export const WeightRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 118px;
  gap: 8px;

  @media (max-width: 390px) {
    grid-template-columns: minmax(0, 1fr) 104px;
  }
`;

export const UnitToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 45px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const UnitButton = styled.button`
  min-width: 0;
  padding: 6px 4px;
  border: 0;
  border-radius: 9px;
  background: ${({ $active, theme }) =>
    $active ? theme.gradients.primary : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.on.primary : theme.colors.textSecondary};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? `0 4px 12px color-mix(in srgb, ${theme.colors.primary} 16%, transparent)`
      : "none"};
  font-size: 0.75rem;
  font-weight: 900;
  cursor: pointer;
`;

export const WeightConversion = styled.div`
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  min-height: 29px;
  padding: 5px 9px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 26%, ${({ theme }) => theme.colors.border});
  border-radius: 999px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.67rem;
  font-weight: 900;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

export const WeightHint = styled.small`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.6rem;
  font-weight: 700;
`;

export const BonusStrip = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 9px 3px 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  background: transparent;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.05em;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.66rem;
    font-weight: 800;
    line-height: 1.4;
  }

  svg {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.gold};
  }
`;

export const Textarea = styled.textarea`
  min-height: 78px;
  width: 100%;
  resize: vertical;
  padding: 10px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background:
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.surface} 0%,
      ${({ theme }) => theme.colors.surfaceAlt} 100%
    );
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  line-height: 1.45;

  &:focus {
    outline: 0;
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 55%, ${({ theme }) => theme.colors.border});
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 11%, transparent);
  }
`;

export const Buttons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 2px;
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 7px 16px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);
  font-size: 0.76rem;
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

export const GhostButton = styled(Button)`
  border-color: ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;

  svg {
    color: currentColor;
  }
`;

export const ErrorText = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.error} 7%, transparent);
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.69rem;
  font-weight: 800;
`;

export const ItemList = styled.div`
  display: grid;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const ItemCard = styled.article`
  display: grid;
  grid-template-columns: ${({ $selecting }) => ($selecting ? "auto minmax(0, 1fr)" : "minmax(0, 1fr) auto")};
  gap: 10px;
  padding: 11px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  background: ${({ theme, $selected }) =>
    $selected
      ? `color-mix(in srgb, ${theme.semantic.badgeGoldBg} 74%, ${theme.colors.surface})`
      : "transparent"};
  transition:
    background ${({ theme }) => theme.transitions.base},
    box-shadow ${({ theme }) => theme.transitions.base};

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected
        ? `color-mix(in srgb, ${theme.semantic.badgeGoldBg} 86%, ${theme.colors.surface})`
        : `color-mix(in srgb, ${theme.semantic.badgeGoldBg} 26%, transparent)`};
  }

  ${({ theme, $selected }) =>
    $selected
      ? `box-shadow: inset 3px 0 0 ${theme.colors.gold};`
      : ""}

  @media (max-width: 460px) {
    grid-template-columns: ${({ $selecting }) => ($selecting ? "auto minmax(0, 1fr)" : "1fr")};
    padding-inline: 9px;
  }
`;

export const ItemSelectToggle = styled.label`
  display: grid;
  place-items: start center;
  width: 38px;
  min-height: 38px;
  padding-top: 2px;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    margin: 0;
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
`;

export const ExchangeSelectionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, ${({ theme }) => theme.colors.border});
  border-radius: 13px;
  background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 54%, ${({ theme }) => theme.colors.surface});

  > div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.76rem;
    font-weight: 950;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.64rem;
    line-height: 1.4;
  }

  button {
    flex: 0 0 auto;
    min-height: 38px;
    padding: 8px 12px;
    border: 1px solid ${({ theme }) => theme.colors.primary};
    border-radius: 11px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.surface};
    font-size: 0.68rem;
    font-weight: 950;
    cursor: pointer;
  }

  button:disabled {
    border-color: ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: not-allowed;
  }

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;

    button {
      width: 100%;
    }
  }
`;

export const ItemMain = styled.div`
  min-width: 0;

  h3 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.86rem;
    font-weight: 900;
    letter-spacing: -0.02em;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.64rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

export const ItemMetrics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;

  span {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    min-height: 26px;
    padding: 4px 7px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.61rem;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-weight: 900;
  }
`;

export const BonusItemCard = styled(ItemCard)`
  border-color: color-mix(
    in srgb,
    ${({ theme }) => theme.colors.gold} 34%,
    ${({ theme }) => theme.colors.border}
  );
  background:
    radial-gradient(
      circle at 94% 10%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 14%, transparent),
      transparent 9rem
    ),
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 42%, white),
      ${({ theme }) => theme.colors.surface} 76%
    );
`;

export const BonusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  margin-bottom: 6px;
  padding: 3px 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.62rem;
  font-weight: 950;
  letter-spacing: 0.04em;
`;

export const ItemActions = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: 10px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary} !important;
    font-size: 0.65rem;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
  }

  button[data-variant="exchange"] {
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 42%, ${({ theme }) => theme.colors.border});
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark} !important;
  }

  button[data-variant="danger"] {
    color: ${({ theme }) => theme.colors.error} !important;
  }

  @media (max-width: 460px) {
    justify-content: flex-end;
  }
`;

export const GoldSeed = styled.span`
  position: relative;
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 58%, ${({ theme }) => theme.colors.border});
  border-radius: 48% 52% 52% 48% / 58% 46% 54% 42%;
  background: radial-gradient(circle at 34% 28%, #fff6cf 0 7%, #e6c36b 24%, #b8872f 58%, #805717 100%);
  box-shadow: inset -4px -5px 8px rgba(89, 57, 10, 0.2), 0 5px 14px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, transparent);
  animation: ${seedArrive} 640ms cubic-bezier(.2,.8,.2,1) 80ms both;

  &::after {
    content: "";
    position: absolute;
    top: 5px;
    left: 7px;
    width: 6px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.72);
    transform: rotate(-28deg);
  }
`;

export const Empty = styled.div`
  display: grid;
  place-items: center;
  gap: 7px;
  min-height: 128px;
  padding: 18px;
  border: 1px dashed
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  font-size: 0.71rem;

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

export const SaveFeedback = styled.div`
  position: fixed;
  left: 50%;
  bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  z-index: 1180;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: calc(100vw - 32px);
  padding: 9px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 999px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 94%, ${({ theme }) => theme.colors.surface});
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 12px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 22%, transparent);
  font-size: 0.68rem;
  font-weight: 900;
  white-space: nowrap;
  pointer-events: none;
  animation: ${toastEnter} 1800ms cubic-bezier(.2,.8,.2,1) both;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

export const Notice = styled.p`
  margin: 0 4px;
  padding: 2px 4px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.62rem;
  line-height: 1.5;
  text-align: center;
  word-break: keep-all;
`;

export const GuestSaveCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px 18px;
  align-items: center;
  padding: clamp(16px, 2.6vw, 20px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background:
    linear-gradient(
      140deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 45%, white),
      ${({ theme }) => theme.colors.surface} 70%
    );
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 8px 24px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px 14px;
    border-radius: 16px;
  }
`;

export const GuestSaveCopy = styled.div`
  display: grid;
  gap: 6px;

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.1em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.02rem, 2.8vw, 1.3rem);
    line-height: 1.3;
    word-break: keep-all;
  }

  p {
    max-width: 580px;
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.66rem;
    line-height: 1.58;
    word-break: keep-all;
  }
`;

export const GuestSaveAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 0.68rem;
  font-weight: 950;
  white-space: nowrap;
  cursor: pointer;

  svg {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.goldLight};
  }

  @media (max-width: 680px) {
    width: 100%;
  }
`;
