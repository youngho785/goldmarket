// src/pages/MyGoldVault.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ArrowRight, ChevronRight, Gem, Minus, Plus, Save, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import MyGoldValueTrend from "@/components/gold/MyGoldValueTrend";
import LivingGoldCompanion from "@/components/common/LivingGoldCompanion";
import { livingGoldSweep } from "@/styles/livingGoldMotion";
import MyGoldAlertSummary from "@/components/gold/MyGoldAlertSummary";
import MyGoldImportPrompt from "@/components/gold/MyGoldImportPrompt";
import { DON_TO_GRAMS } from "@/lib/goldRates";
import {
  GOLD_VAULT_MAX_ITEMS,
  GOLD_VAULT_MAX_LABEL_LENGTH,
  GOLD_VAULT_MAX_NOTE_LENGTH,
  computeVaultPureGoldG,
  computeVaultValueWon,
  getGoldVaultTypeLabel,
  validateGoldVaultValues,
} from "@/lib/goldVaultCatalog";
import {
  createGoldVaultItem,
  createGoldVaultItems,
  deleteGoldVaultItem,
  updateGoldVaultItem,
} from "@/services/goldVaultService";
import {
  clearGoldVaultImportDraft,
  readGoldVaultImportDraft,
  saveGoldVaultGuestDraft,
} from "@/lib/goldVaultImportDraft";
import {
  DEFAULT_GUEST_MY_GOLD_ITEMS,
  GUEST_MY_GOLD_BONUS_G,
  clearGuestMyGoldDemo,
  readGuestMyGoldItems,
  resetGuestMyGoldItems,
  saveGuestMyGoldItems,
} from "@/lib/myGoldGuestDemo";


const MY_GOLD_PRODUCT_OPTIONS = Object.freeze([
  { value: "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)", label: "14k(585) 제품(팔찌/목걸이/반지/귀걸이/발찌)" },
  { value: "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)", label: "18k(750) 제품(팔찌/목걸이/반지/귀걸이/발찌)" },
  { value: "순금 995제품(목걸이,팔찌,반지,귀걸이)", label: "순금 995 제품(목걸이/팔찌/반지/귀걸이/돌반지)" },
  { value: "순금 999제품(팔찌,목걸이, 반지,귀걸이)", label: "순금 999 제품(목걸이/팔찌/반지/귀걸이/돌반지)" },
  { value: "순금 열쇠", label: "순금 열쇠" },
  { value: "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)", label: "순금 장식모양(거북이/두꺼비 등)" },
  { value: "순금 마고자 단추 / 색상이 들어있는 제품", label: "순금 마고자 단추/색상 포함" },
  { value: "999,24k 순금덩어리(순도 측정후 999일 경우)", label: "999 순금덩어리" },
]);

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

const Page = styled.div`
  display: grid;
  gap: 14px;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  padding: 8px 0 28px;
`;

const VaultHero = styled.section`
  position: relative;
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


const HeroGoldMark = styled(LivingGoldCompanion)`
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

const HeroKicker = styled.div`
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

const HeroTitle = styled.h1`
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

const HeroAmount = styled.strong`
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

const HeroValueNote = styled.p`
  position: relative;
  z-index: 1;
  margin: -3px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.62rem;
  font-weight: 750;
  line-height: 1.4;
  word-break: keep-all;
`;

const HeroChangeGroup = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 6px 14px;
  flex-wrap: wrap;
  animation: ${viewEnter} 430ms cubic-bezier(.2,.8,.2,1) 150ms both;
`;

const HeroChange = styled.span`
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

const HeroStats = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const HeroStat = styled.div`
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

const ReadinessPanel = styled(Link)`
  position: relative;
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
`;

const HeroActions = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
`;

const HeroAddAction = styled.button`
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

const HeroExchangeAction = styled(Link)`
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

const GuestModeNote = styled.p`
  position: relative;
  z-index: 1;
  margin: -2px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.62rem;
  line-height: 1.45;
  text-align: center;
  word-break: keep-all;
`;

const VaultSection = styled.section`
  display: grid;
  gap: 11px;
  padding: clamp(14px, 2.6vw, 18px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 10%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 7px 20px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);
`;

const ViewTabs = styled.nav`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const ViewTab = styled(Link)`
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

const ViewPanel = styled.div`
  display: grid;
  gap: 14px;
  animation: ${viewEnter} 280ms cubic-bezier(.2,.8,.2,1) both;
`;

const ViewIntro = styled.section`
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

const SummaryHead = styled.div`
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

const SummaryItems = styled.div`
  display: grid;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 13px;
`;

const SummaryItem = styled.div`
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

const GoalProgress = styled.div`
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

const GoalTrack = styled.div`
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

const SectionHead = styled.div`
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

const SectionActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;

  @media (max-width: 620px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const AddGoldButton = styled.button`
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

const FormOverlay = styled.div`
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

const FormSheet = styled.section`
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

const FormSheetHead = styled.div`
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

const ValuePanel = styled.section`
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

const ValueKicker = styled.small`
  display: block;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.61rem;
  font-weight: 950;
  letter-spacing: 0.12em;
`;

const ValueTitle = styled.h2`
  margin: 5px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.96rem;
  line-height: 1.3;
`;

const ValueAmount = styled.strong`
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

const ValueChange = styled.div`
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

const ValueChangeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 7px 12px;
  flex-wrap: wrap;

  ${ValueChange} {
    margin-top: 9px;
  }
`;

const FoldPanel = styled.details`
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

const FoldSummary = styled.summary`
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

const FoldBody = styled.div`
  padding: 13px 15px 15px;
`;

const CompareRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

const DateInput = styled.input`
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

const CompareButton = styled.button`
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

const ComparisonResult = styled.div`
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

const CompareError = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.67rem;
  font-weight: 800;
`;

const GuestVaultPanel = styled.section`
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

const GuestBenefits = styled.div`
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

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.div`
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

const ExchangeCta = styled(Link)`
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

const Panel = styled.section`
  overflow: hidden;
  padding: clamp(15px, 3vw, 18px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 10%, ${({ theme }) => theme.colors.border});
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 28px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);
`;

const PanelHead = styled.div`
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

const Form = styled.form`
  display: grid;
  gap: 10px;
`;

const Field = styled.label`
  display: grid;
  gap: 5px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.7rem;
  font-weight: 900;
`;

const Input = styled.input`
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

const Select = styled.select`
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

const WeightRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 118px;
  gap: 8px;

  @media (max-width: 390px) {
    grid-template-columns: minmax(0, 1fr) 104px;
  }
`;

const UnitToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 45px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const UnitButton = styled.button`
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

const WeightConversion = styled.div`
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

const WeightHint = styled.small`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.6rem;
  font-weight: 700;
`;

const BonusStrip = styled.div`
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

const Textarea = styled.textarea`
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

const Buttons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 2px;
`;

const Button = styled.button`
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

const GhostButton = styled(Button)`
  border-color: ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;

  svg {
    color: currentColor;
  }
`;

const ErrorText = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.error} 7%, transparent);
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.69rem;
  font-weight: 800;
`;

const ItemList = styled.div`
  display: grid;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
`;

const ItemCard = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 11px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  background: transparent;
  transition: background ${({ theme }) => theme.transitions.base};

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 26%, transparent);
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
    padding-inline: 9px;
  }
`;

const ItemMain = styled.div`
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

const ItemMetrics = styled.div`
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

const BonusItemCard = styled(ItemCard)`
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

const BonusBadge = styled.span`
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

const ItemActions = styled.div`
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

const GoldSeed = styled.span`
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

const Empty = styled.div`
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

const SaveFeedback = styled.div`
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

const Notice = styled.p`
  margin: 0 4px;
  padding: 2px 4px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.62rem;
  line-height: 1.5;
  text-align: center;
  word-break: keep-all;
`;

const GuestSaveCard = styled.section`
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

const GuestSaveCopy = styled.div`
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

const GuestSaveAction = styled.button`
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

const EMPTY_FORM = { label: "", goldType: "", weightValue: "", weightUnit: "g", note: "" };


const GOLD_EXCHANGE_MAX_PRODUCTS = 20;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function weightInputToGrams(form) {
  const value = Number(form?.weightValue);
  if (!Number.isFinite(value)) return Number.NaN;
  return form?.weightUnit === "don" ? value * DON_TO_GRAMS : value;
}

function formatGramsAndDon(value) {
  const grams = Number(value);
  if (!Number.isFinite(grams) || grams <= 0) return "-";
  return `${grams.toFixed(2)}g · ${(grams / DON_TO_GRAMS).toFixed(2)}돈`;
}

function compactDate(value) {
  return String(value || "").replace(/-/g, "");
}

function formatDateKey(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return text || "-";
  return `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`;
}

function koreaTodayInputDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getValueChange(currentValue, previousValue) {
  const current = Number(currentValue);
  const previous = Number(previousValue);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || current <= 0 || previous <= 0) {
    return { amount: 0, percent: null, direction: "unknown" };
  }

  const amount = current - previous;
  return {
    amount,
    percent: (amount / previous) * 100,
    direction: amount > 0 ? "up" : amount < 0 ? "down" : "same",
  };
}

function formatSignedWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "0원";
  return `${number > 0 ? "+" : "-"}${Math.abs(Math.round(number)).toLocaleString("ko-KR")}원`;
}

function formatSignedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "비교 준비 중";
  if (number === 0) return "0.00%";
  return `${number > 0 ? "+" : "-"}${Math.abs(number).toFixed(2)}%`;
}

function guestVaultFingerprint(items) {
  return JSON.stringify(
    (Array.isArray(items) ? items : []).map((item) => ({
      label: String(item?.label || "").trim(),
      goldType: String(item?.goldType || "").trim(),
      weightG: Number(item?.weightG || 0),
      note: String(item?.note || "").trim(),
    }))
  );
}

const MY_GOLD_BAR_DENOMS = Object.freeze([
  { grams: 500, label: "500g 골드바" },
  { grams: 100, label: "100g 골드바" },
  { grams: 75, label: "20돈(75g) 골드바" },
  { grams: 56.25, label: "15돈(56.25g) 골드바" },
  { grams: 50, label: "50g 골드바" },
  { grams: 37.5, label: "10돈(37.5g) 골드바" },
  { grams: 30, label: "30g 골드바" },
  { grams: 20, label: "20g 골드바" },
  { grams: 18.75, label: "5돈(18.75g) 골드바" },
  { grams: 11.25, label: "3돈(11.25g) 골드바" },
  { grams: 10, label: "10g 골드바" },
  { grams: 7.5, label: "2돈(7.5g) 골드바" },
  { grams: 5, label: "5g 골드바" },
  { grams: 3.75, label: "1돈(3.75g) 골드바" },
  { grams: 3, label: "3g 골드바" },
  { grams: 1, label: "1g 골드바" },
]);

function getGoldBarReadiness(pureGoldG) {
  const grams = Number(pureGoldG) || 0;
  if (grams <= 0) return null;
  const available = MY_GOLD_BAR_DENOMS.find((item) => item.grams <= grams + 1e-9);
  if (available) {
    return {
      available: true,
      label: available.label,
      grams: available.grams,
      remainingG: Math.max(0, grams - available.grams),
    };
  }
  return {
    available: false,
    label: "1g 골드바",
    grams: 1,
    neededG: Math.max(0, 1 - grams),
  };
}

export default function MyGoldVault() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    items,
    itemsLoading,
    publicPriceEnabled,
    customerSellPricePerDon,
    previousCustomerSellPricePerDon,
    rates,
    summary,
  } = useGoldVaultDashboard(user?.uid);
  const bonus = useBonusGoldBalance(user?.uid);
  const isGuest = !user?.uid;
  const [guestRawItems, setGuestRawItems] = useState(() => readGuestMyGoldItems());
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [compareDate, setCompareDate] = useState("");
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [historicalMeta, setHistoricalMeta] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [weeklyTrendChange, setWeeklyTrendChange] = useState(null);
  const view = location.pathname === "/my-gold/items"
    ? "items"
    : location.pathname === "/my-gold/trend"
      ? "trend"
      : "summary";
  const isSummaryView = view === "summary";
  const isItemsView = view === "items";
  const isTrendView = view === "trend";
  const importKind = new URLSearchParams(location.search).get("import");
  const addRequested = new URLSearchParams(location.search).get("add") === "1";
  const importRequested = importKind === "calculator" || importKind === "guest";
  const importSource = importKind === "guest" ? "guest-my-gold" : "gold-exchange-calculator";
  const [importDraft, setImportDraft] = useState(() =>
    importRequested ? readGoldVaultImportDraft(importSource) : null
  );
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");

  useEffect(() => {
    if (!importRequested) return;
    setImportDraft(readGoldVaultImportDraft(importSource));
    setImportError("");
  }, [importRequested, importSource]);

  useEffect(() => {
    if (!saveFeedback) return undefined;
    const timer = window.setTimeout(() => setSaveFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [saveFeedback]);

  useEffect(() => {
    if (!formOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        setFormOpen(false);
        setEditingId("");
        setForm(EMPTY_FORM);
        setError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [formOpen, saving]);

  const guestItems = useMemo(
    () =>
      guestRawItems.map((item) => {
        const pureGoldG = computeVaultPureGoldG(item, rates);
        const estimatedValueWon = publicPriceEnabled
          ? computeVaultValueWon(pureGoldG, customerSellPricePerDon)
          : 0;
        const previousEstimatedValueWon = publicPriceEnabled
          ? computeVaultValueWon(pureGoldG, previousCustomerSellPricePerDon)
          : 0;
        return { ...item, pureGoldG, estimatedValueWon, previousEstimatedValueWon };
      }),
    [
      customerSellPricePerDon,
      guestRawItems,
      previousCustomerSellPricePerDon,
      publicPriceEnabled,
      rates,
    ]
  );

  const guestSummary = useMemo(() => {
    const totalWeightG = guestItems.reduce(
      (total, item) => total + Number(item.weightG || 0),
      0
    );
    const pureGoldG = guestItems.reduce(
      (total, item) => total + Number(item.pureGoldG || 0),
      0
    );
    const estimatedValueWon = guestItems.reduce(
      (total, item) => total + Number(item.estimatedValueWon || 0),
      0
    );
    const previousEstimatedValueWon = guestItems.reduce(
      (total, item) => total + Number(item.previousEstimatedValueWon || 0),
      0
    );
    return {
      itemCount: guestItems.length,
      totalWeightG,
      pureGoldG,
      estimatedValueWon,
      previousEstimatedValueWon,
    };
  }, [guestItems]);

  const activeItems = isGuest ? guestItems : items;
  const activeSummary = isGuest ? guestSummary : summary;
  const hasPersonalizedGuestVault = useMemo(() => {
    if (!isGuest || guestRawItems.length === 0) return false;
    return guestVaultFingerprint(guestRawItems) !== guestVaultFingerprint(DEFAULT_GUEST_MY_GOLD_ITEMS);
  }, [guestRawItems, isGuest]);
  const bonusBalanceG = isGuest ? GUEST_MY_GOLD_BONUS_G : Number(bonus.balanceG || 0);
  const vaultLoading = isGuest ? false : itemsLoading || bonus.loading;
  const canAddMore = activeItems.length < GOLD_VAULT_MAX_ITEMS || !!editingId;

  useEffect(() => {
    if (!addRequested || formOpen || editingId) return;

    const params = new URLSearchParams(location.search);
    params.delete("add");
    const nextSearch = params.toString();

    if (!canAddMore) {
      setError(`MY GOLD에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다.`);
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
        { replace: true }
      );
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId("");
    setError("");
    setFormOpen(true);
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true }
    );
  }, [
    addRequested,
    canAddMore,
    editingId,
    formOpen,
    location.pathname,
    location.search,
    navigate,
  ]);

  const sortedItems = useMemo(() => activeItems, [activeItems]);
  const exchangeProducts = useMemo(
    () =>
      sortedItems.slice(0, GOLD_EXCHANGE_MAX_PRODUCTS).map((item) => ({
        goldType: item.goldType,
        quantity: Number(item.weightG || 0),
        inputUnit: "g",
        exchangeType: "999.9골드바",
        sourceItemId: item.id,
        sourceLabel: item.label || "금제품",
      })),
    [sortedItems]
  );
  const weightReference = useMemo(() => {
    const value = Number(form.weightValue);
    if (!Number.isFinite(value) || value <= 0) return "";

    if (form.weightUnit === "don") {
      return `${value.toFixed(2)}돈 = ${(value * DON_TO_GRAMS).toFixed(2)}g`;
    }

    return `${value.toFixed(2)}g = ${(value / DON_TO_GRAMS).toFixed(2)}돈`;
  }, [form.weightUnit, form.weightValue]);

  const bonusCurrentValueWon =
    publicPriceEnabled && bonusBalanceG > 0
      ? computeVaultValueWon(bonusBalanceG, customerSellPricePerDon)
      : 0;
  const bonusPreviousValueWon =
    publicPriceEnabled && bonusBalanceG > 0
      ? computeVaultValueWon(bonusBalanceG, previousCustomerSellPricePerDon)
      : 0;
  const vaultValueWon = Number(activeSummary.estimatedValueWon || 0) + bonusCurrentValueWon;
  const previousVaultValueWon =
    Number(activeSummary.previousEstimatedValueWon || 0) + bonusPreviousValueWon;
  const vaultPureGoldG = Number(activeSummary.pureGoldG || 0) + bonusBalanceG;
  const hasVaultContent = activeSummary.itemCount > 0 || bonusBalanceG > 0;
  const barReadiness = useMemo(
    () => getGoldBarReadiness(activeSummary.pureGoldG),
    [activeSummary.pureGoldG]
  );
  const nextBarTarget = useMemo(() => {
    const grams = Number(activeSummary.pureGoldG) || 0;
    if (grams <= 0) return MY_GOLD_BAR_DENOMS[MY_GOLD_BAR_DENOMS.length - 1];
    const larger = MY_GOLD_BAR_DENOMS.filter((item) => item.grams > grams + 1e-9);
    return larger.length > 0 ? larger[larger.length - 1] : null;
  }, [activeSummary.pureGoldG]);
  const nextBarProgress = useMemo(() => {
    const grams = Number(activeSummary.pureGoldG) || 0;
    const target = Number(nextBarTarget?.grams) || 0;
    if (target <= 0) return 100;
    return Math.max(0, Math.min(100, (grams / target) * 100));
  }, [activeSummary.pureGoldG, nextBarTarget]);
  const previewItems = useMemo(() => sortedItems.slice(0, 2), [sortedItems]);
  const handleWeeklyTrendChange = useCallback((next) => {
    setWeeklyTrendChange(next || null);
  }, []);

  const currentChange = getValueChange(vaultValueWon, previousVaultValueWon);
  const CurrentChangeIcon =
    currentChange.direction === "up"
      ? TrendingUp
      : currentChange.direction === "down"
        ? TrendingDown
        : Minus;
  const historicalValueWon =
    historicalPrice && vaultPureGoldG > 0
      ? computeVaultValueWon(vaultPureGoldG, historicalPrice)
      : 0;
  const historicalChange = historicalPrice
    ? getValueChange(vaultValueWon, historicalValueWon)
    : null;

  const confirmCalculatorImport = async () => {
    if (!user?.uid || importSaving) return;

    const draft = importDraft || readGoldVaultImportDraft(importSource);
    const pendingItems = Array.isArray(draft?.items) ? draft.items : [];
    if (!pendingItems.length) {
      setImportDraft(null);
      setImportError(
        importKind === "guest"
          ? "저장할 MY GOLD 체험 정보가 없습니다. MY GOLD 체험에서 다시 만들어 주세요."
          : "저장할 계산 정보가 없습니다. 금교환 계산기에서 다시 계산해 주세요."
      );
      return;
    }

    if (itemsLoading) {
      setImportError("현재 MY GOLD 기록을 확인하고 있습니다. 잠시 후 다시 눌러 주세요.");
      return;
    }

    if (items.length + pendingItems.length > GOLD_VAULT_MAX_ITEMS) {
      setImportError(
        `MY GOLD는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다. 현재 ${items.length}개가 있어 ${pendingItems.length}개를 모두 추가할 공간이 부족합니다.`
      );
      return;
    }

    setImportSaving(true);
    setImportError("");
    try {
      await createGoldVaultItems(user.uid, pendingItems);
      clearGoldVaultImportDraft();
      if (draft?.source === "guest-my-gold") clearGuestMyGoldDemo();
      setImportDraft(null);
      navigate("/my-gold", {
        replace: true,
        state: {
          myGoldImportSuccess: pendingItems.length,
          myGoldImportSource: draft?.source || "gold-exchange-calculator",
        },
      });
    } catch (saveError) {
      setImportError(saveError?.message || "MY GOLD에 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setImportSaving(false);
    }
  };

  const cancelCalculatorImport = () => {
    clearGoldVaultImportDraft();
    setImportDraft(null);
    setImportError("");
    navigate("/my-gold", { replace: true });
  };

  const openSingleItemExchange = (item) => {
    if (!item) return;
    navigate("/gold-exchange", {
      state: {
        source: "my-gold",
        vaultProducts: [
          {
            goldType: item.goldType,
            quantity: Number(item.weightG || 0),
            inputUnit: "g",
            exchangeType: "999.9골드바",
            sourceItemId: item.id,
            sourceLabel: item.label || "금제품",
          },
        ],
      },
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setError("");
  };

  const openAddForm = () => {
    if (!canAddMore) {
      setError(`MY GOLD에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다.`);
      return;
    }
    resetForm();
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    resetForm();
    setFormOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!canAddMore) {
      setError(`MY GOLD에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다.`);
      return;
    }

    const wasEditing = Boolean(editingId);
    setSaving(true);
    setError("");
    try {
      const values = {
        label: form.label,
        goldType: form.goldType,
        weightG: weightInputToGrams(form),
        note: form.note,
      };

      if (isGuest) {
        const normalized = validateGoldVaultValues(values);
        const nextItem = {
          id: editingId || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...normalized,
        };
        const nextItems = editingId
          ? guestRawItems.map((item) => item.id === editingId ? nextItem : item)
          : [nextItem, ...guestRawItems];
        const savedItems = saveGuestMyGoldItems(nextItems);
        setGuestRawItems(savedItems);
      } else if (editingId) {
        await updateGoldVaultItem(user.uid, editingId, values);
      } else {
        await createGoldVaultItem(user.uid, values);
      }
      resetForm();
      setFormOpen(false);
      setSaveFeedback(
        wasEditing
          ? "MY GOLD 기록을 업데이트했어요."
          : isGuest
            ? "MY GOLD 체험에 이어졌어요."
            : "MY GOLD에 이어졌어요."
      );
    } catch (submitError) {
      setError(submitError?.message || "저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      label: item.label || "",
      goldType: item.goldType || "",
      weightValue: String(item.weightG || ""),
      weightUnit: "g",
      note: item.note || "",
    });
    setError("");
    setFormOpen(true);
  };

  const remove = async (item) => {
    if (!window.confirm(`“${item.label || "금제품"}”을 ${isGuest ? "MY GOLD 체험" : "MY GOLD"}에서 삭제할까요?`)) return;
    try {
      if (isGuest) {
        const savedItems = saveGuestMyGoldItems(
          guestRawItems.filter((current) => current.id !== item.id)
        );
        setGuestRawItems(savedItems);
      } else {
        await deleteGoldVaultItem(user.uid, item.id);
      }
      if (editingId === item.id) resetForm();
    } catch (deleteError) {
      setError(deleteError?.message || "삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const resetGuestDemo = () => {
    if (!isGuest) return;
    if (!window.confirm("MY GOLD 체험을 처음 예시 상태로 되돌릴까요?")) return;
    setGuestRawItems(resetGuestMyGoldItems());
    resetForm();
    setCompareDate("");
    setHistoricalPrice(null);
    setHistoricalMeta(null);
    setCompareError("");
  };

  const saveGuestVaultToAccount = () => {
    if (!isGuest || guestRawItems.length === 0) return;
    try {
      saveGoldVaultGuestDraft(guestRawItems);
      navigate("/login?next=%2Fmy-gold%3Fimport%3Dguest", {
        state: {
          from: "/my-gold?import=guest",
          intent: "save-guest-my-gold",
        },
      });
    } catch (draftError) {
      setError(draftError?.message || "MY GOLD 체험 기록을 임시 저장하지 못했습니다.");
    }
  };

  const compareHistory = async () => {
    const key = compactDate(compareDate);
    setCompareError("");
    setHistoricalPrice(null);
    setHistoricalMeta(null);

    if (!/^\d{8}$/.test(key)) {
      setCompareError("비교할 날짜를 선택해 주세요.");
      return;
    }

    setCompareLoading(true);
    try {
      let selected = null;
      const exactSnap = await getDoc(doc(db, "goldPriceHistory", key));

      if (exactSnap.exists()) {
        selected = {
          ...(exactSnap.data() || {}),
          lookupDate: key,
          carriedForward: false,
        };
      } else {
        const fallbackQuery = query(
          collection(db, "goldPriceHistory"),
          where("sourceDate", "<=", key),
          orderBy("sourceDate", "desc"),
          limit(1)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackDoc = fallbackSnapshot.docs[0];
        if (fallbackDoc) {
          selected = {
            ...(fallbackDoc.data() || {}),
            lookupDate: key,
            carriedForward: true,
          };
        }
      }

      const price = Number(selected?.market?.pureGoldBuyPerDon) || 0;
      if (!selected || price <= 0) {
        setCompareError("선택한 날짜까지 저장된 공개 시세가 없습니다.");
        return;
      }

      setHistoricalPrice(price);
      setHistoricalMeta(selected);
    } catch (historyError) {
      console.warn("[MyGoldVault] 과거 가치 비교 실패:", historyError?.message || historyError);
      setCompareError("과거 시세를 불러오지 못했습니다.");
    } finally {
      setCompareLoading(false);
    }
  };

  const resetComparison = () => {
    setCompareDate("");
    setHistoricalPrice(null);
    setHistoricalMeta(null);
    setCompareError("");
  };

  useEffect(() => {
    const supportedTargets = new Set(["#my-gold-value-trend"]);
    if (!supportedTargets.has(location.hash)) return;
    const targetId = location.hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [location.hash, user?.uid]);

  return (
    <Page>
      {saveFeedback && (
        <SaveFeedback role="status" aria-live="polite">
          <Sparkles aria-hidden /> {saveFeedback}
        </SaveFeedback>
      )}

      <ViewTabs aria-label="MY GOLD 화면 선택">
        <ViewTab to="/my-gold" $active={isSummaryView} aria-current={isSummaryView ? "page" : undefined}>요약</ViewTab>
        <ViewTab to="/my-gold/items" $active={isItemsView} aria-current={isItemsView ? "page" : undefined}>내 금</ViewTab>
        <ViewTab to="/my-gold/trend" $active={isTrendView} aria-current={isTrendView ? "page" : undefined}>가치 변화</ViewTab>
      </ViewTabs>

      {isSummaryView && (
        <VaultHero aria-labelledby="my-vault-current-value-title">
          <HeroGoldMark
            size={62}
            delay={80}
            hint
            ariaLabel="Living Gold로 오늘 MY GOLD 보기"
            title={hasVaultContent ? "오늘의 MY GOLD" : "첫 금빛을 이어보세요."}
            value={
              vaultLoading
                ? "가치를 확인하고 있어요"
                : hasVaultContent && publicPriceEnabled
                  ? formatWon(vaultValueWon)
                  : undefined
            }
            description={
              vaultLoading
                ? "MY GOLD의 오늘 가치를 불러오고 있습니다."
                : hasVaultContent && publicPriceEnabled
                  ? `${Number.isFinite(currentChange.percent) ? `어제보다 ${formatSignedWon(currentChange.amount)} · ` : ""}예상 순금 ${Number(activeSummary.pureGoldG || 0).toFixed(2)}g`
                  : "금 하나를 기록하면 오늘 가치와 변화가 이 작은 금빛에 이어집니다."
            }
            actionLabel={hasVaultContent ? "내 금 자세히 보기" : "첫 금 기록하기"}
            actionTo={hasVaultContent ? "/my-gold/items" : "/my-gold/items?add=1"}
          />
          <HeroKicker>
            <Gem size={15} aria-hidden /> {isGuest ? "MY GOLD · 체험" : "MY GOLD"}
          </HeroKicker>
          <HeroTitle id="my-vault-current-value-title">내 금의 오늘 가치</HeroTitle>
          <HeroAmount $empty={!vaultLoading && !hasVaultContent}>
            {vaultLoading
              ? "불러오는 중"
              : !hasVaultContent
                ? "첫 금을 기록해 보세요"
                : publicPriceEnabled
                  ? formatWon(vaultValueWon)
                  : "시세 공개 대기"}
          </HeroAmount>
          {!vaultLoading && hasVaultContent && publicPriceEnabled && (
            <HeroValueNote>
              {bonusBalanceG > 0
                ? "MY GOLD에 기록한 금과 MEMBER GOLD를 합산한 오늘 참고가치입니다."
                : "MY GOLD에 기록한 금의 오늘 참고가치입니다."}
            </HeroValueNote>
          )}

          {!vaultLoading && hasVaultContent && publicPriceEnabled && (
            <HeroChangeGroup>
              <HeroChange $direction={currentChange.direction}>
                <CurrentChangeIcon aria-hidden />
                {Number.isFinite(currentChange.percent)
                  ? `오늘 ${formatSignedWon(currentChange.amount)} · ${formatSignedPercent(currentChange.percent)}`
                  : "전일 비교 준비 중"}
              </HeroChange>
              {weeklyTrendChange && Number.isFinite(weeklyTrendChange.percent) && (
                <HeroChange $direction={weeklyTrendChange.direction}>
                  {weeklyTrendChange.direction === "up" ? (
                    <TrendingUp aria-hidden />
                  ) : weeklyTrendChange.direction === "down" ? (
                    <TrendingDown aria-hidden />
                  ) : (
                    <Minus aria-hidden />
                  )}
                  7일 {formatSignedWon(weeklyTrendChange.amount)} · {formatSignedPercent(weeklyTrendChange.percent)}
                </HeroChange>
              )}
            </HeroChangeGroup>
          )}

          <HeroStats>
            <HeroStat>
              <span>기록 중량</span>
              <strong>{Number(activeSummary.totalWeightG || 0).toFixed(2)}g</strong>
            </HeroStat>
            <HeroStat>
              <span>예상 순금</span>
              <strong>{Number(activeSummary.pureGoldG || 0).toFixed(2)}g</strong>
            </HeroStat>
          </HeroStats>

          <HeroActions>
            <HeroAddAction
              type="button"
              onClick={() => navigate("/my-gold/items?add=1")}
              disabled={!canAddMore}
            >
              <Plus aria-hidden /> 금 추가
            </HeroAddAction>
            <HeroExchangeAction to="/my-gold/trend" aria-label="내 금 가치 변화 자세히 보기">
              <TrendingUp aria-hidden />
              가치 변화 보기
              <ArrowRight aria-hidden />
            </HeroExchangeAction>
          </HeroActions>
          {isGuest && (
            <GuestModeNote>
              로그인 없이 MY GOLD를 체험할 수 있습니다. 실제 계정 저장과 푸시 알림은 로그인 후 연결됩니다.
            </GuestModeNote>
          )}
        </VaultHero>
      )}

      {Number(location.state?.myGoldImportSuccess || 0) > 0 && (
        <Notice role="status">
          {location.state?.myGoldImportSource === "guest-my-gold"
            ? `체험에서 만든 금 ${Number(location.state.myGoldImportSuccess)}개를 MY GOLD에 저장했습니다.`
            : `금교환 계산에서 가져온 금 ${Number(location.state.myGoldImportSuccess)}개를 MY GOLD에 저장했습니다.`}
          {" "}현재 시세와 교환 기준으로 가치가 자동 계산됩니다.
        </Notice>
      )}

      {!isGuest && importRequested && (
        <MyGoldImportPrompt
          draft={importDraft}
          source={importSource}
          currentCount={items.length}
          maxItems={GOLD_VAULT_MAX_ITEMS}
          loading={itemsLoading}
          saving={importSaving}
          error={importError}
          onConfirm={confirmCalculatorImport}
          onCancel={cancelCalculatorImport}
        />
      )}

      {isSummaryView && (
        <>
          <VaultSection aria-labelledby="my-gold-summary-items-title">
            <SummaryHead>
              <strong id="my-gold-summary-items-title">{isGuest ? "체험 중인 금" : "내가 기록한 금"}</strong>
              <Link to="/my-gold/items">
                {sortedItems.length > 0 ? `${sortedItems.length}개 전체 관리` : "금 기록하기"} <ChevronRight size={14} aria-hidden />
              </Link>
            </SummaryHead>

            {vaultLoading ? (
              <Empty>MY GOLD 기록을 불러오는 중입니다.</Empty>
            ) : previewItems.length > 0 ? (
              <SummaryItems>
                {previewItems.map((item) => (
                  <SummaryItem key={item.id}>
                    <div className="copy">
                      <strong>{item.label}</strong>
                      <small>{getGoldVaultTypeLabel(item.goldType)} · {Number(item.weightG || 0).toFixed(2)}g</small>
                    </div>
                    <span className="value">{publicPriceEnabled ? formatWon(item.estimatedValueWon) : `${Number(item.pureGoldG || 0).toFixed(2)}g`}</span>
                  </SummaryItem>
                ))}
              </SummaryItems>
            ) : (
              <Empty>
                <GoldSeed aria-hidden />
                <strong>아직 기록한 금이 없습니다.</strong>
                <span>금 하나를 기록하면 오늘 가치와 가격 변화를 바로 확인할 수 있습니다.</span>
                <AddGoldButton type="button" onClick={() => navigate("/my-gold/items?add=1")}>
                  <Plus size={15} aria-hidden /> 첫 금 기록하기
                </AddGoldButton>
              </Empty>
            )}
          </VaultSection>

          {isGuest && hasPersonalizedGuestVault && activeSummary.itemCount > 0 && (
            <GuestSaveCard aria-label="MY GOLD 회원가입 저장 안내">
              <GuestSaveCopy>
                <h2>오늘 확인한 내 금, MY GOLD에 이어두세요.</h2>
                <p>지금 입력한 금 기록을 그대로 저장하면 다음에도 오늘 가치와 변화, 예상 순금량을 이어서 확인할 수 있습니다.</p>
              </GuestSaveCopy>
              <GuestSaveAction type="button" onClick={saveGuestVaultToAccount}>
                <Save aria-hidden /> MY GOLD 기록 저장하기 <ArrowRight aria-hidden />
              </GuestSaveAction>
            </GuestSaveCard>
          )}

          {hasVaultContent && publicPriceEnabled && (
            <MyGoldValueTrend
              pureGoldG={vaultPureGoldG}
              currentPricePerDon={customerSellPricePerDon}
              enabled={!vaultLoading && hasVaultContent && publicPriceEnabled}
              onWeeklyChange={handleWeeklyTrendChange}
              bonusOnly={activeSummary.itemCount === 0 && bonusBalanceG > 0}
              bonusGoldG={bonusBalanceG}
              compact
              detailsTo="/my-gold/trend"
            />
          )}

          <ReadinessPanel
            to="/gold-exchange"
            state={{ source: "my-gold", vaultProducts: exchangeProducts }}
            aria-label="MY GOLD 예상 순금량으로 금교환 페이지 열기"
          >
            <div>
              <small>GOLD TO GOLD</small>
              <strong>
                {activeSummary.itemCount > 0
                  ? barReadiness?.available
                    ? `${barReadiness.label} 교환 가능`
                    : `1g 골드바까지 약 ${Number(barReadiness?.neededG || 0).toFixed(2)}g 더 필요`
                  : "금 하나를 기록하면 교환 가능한 999.9 GOLD를 확인합니다."}
              </strong>
              {activeSummary.itemCount > 0 && nextBarTarget && (
                <GoalProgress>
                  <div className="labels">
                    <span>현재 {Number(activeSummary.pureGoldG || 0).toFixed(2)}g</span>
                    <span>다음 {nextBarTarget.label}까지 {Math.max(0, Number(nextBarTarget.grams) - Number(activeSummary.pureGoldG || 0)).toFixed(2)}g</span>
                  </div>
                  <GoalTrack $progress={nextBarProgress} aria-hidden><span /></GoalTrack>
                </GoalProgress>
              )}
            </div>
            <ChevronRight aria-hidden />
          </ReadinessPanel>

          <ExchangeCta to={isGuest ? "/register" : "/profile"} aria-label="MEMBER GOLD 회원 혜택 보기">
            <div>
              <small><Sparkles size={12} aria-hidden /> MEMBER GOLD{isGuest ? " · 체험" : ""}</small>
              <strong>순금 {bonusBalanceG.toFixed(2)}g</strong>
              <p>{isGuest ? "회원 혜택 순금이 MY GOLD 가치에 반영되는 모습을 체험하고 있습니다." : "회원 혜택으로 적립된 금이며 MY GOLD 오늘 참고가치와 가치 변화에 함께 반영됩니다."}</p>
            </div>
            <ChevronRight aria-hidden />
          </ExchangeCta>

          <MyGoldAlertSummary uid={user?.uid} demoMode={isGuest} compact />
        </>
      )}

      {isItemsView && (
        <ViewPanel key="items">
          <ViewIntro>
            <div>
              <h1>{isGuest ? "체험 중인 금 관리" : "내가 기록한 금"}</h1>
              <p>금마다 이름을 붙이고 종류와 중량을 기록해 오늘 가치와 예상 순금량을 관리합니다.</p>
            </div>
            <AddGoldButton type="button" onClick={openAddForm} disabled={!canAddMore}>
              <Plus size={15} aria-hidden /> 금 추가
            </AddGoldButton>
          </ViewIntro>

          <VaultSection aria-labelledby="my-vault-items-title">
            <SectionHead>
              <div>
                <h2 id="my-vault-items-title">기록 목록</h2>
                <p>
                  {isGuest
                    ? "예시 금을 수정하거나 내 금을 새로 기록해 보세요. 변경한 내용이 MY GOLD 요약과 가치 변화에 바로 반영됩니다."
                    : `현재 ${sortedItems.length}개 · 기록 중량 ${Number(activeSummary.totalWeightG || 0).toFixed(2)}g · 예상 순금 ${Number(activeSummary.pureGoldG || 0).toFixed(2)}g`}
                </p>
              </div>
              <SectionActions>
                {isGuest && <AddGoldButton type="button" onClick={resetGuestDemo}>예시 초기화</AddGoldButton>}
              </SectionActions>
            </SectionHead>

            {error && !formOpen && <ErrorText role="alert">{error}</ErrorText>}

            {vaultLoading ? (
              <Empty>MY GOLD 기록을 불러오는 중입니다.</Empty>
            ) : sortedItems.length > 0 ? (
              <ItemList>
                {sortedItems.map((item) => (
                  <ItemCard key={item.id}>
                    <ItemMain>
                      <h3>{item.label}</h3>
                      <p>{getGoldVaultTypeLabel(item.goldType)}{item.note ? ` · ${item.note}` : ""}</p>
                      <ItemMetrics>
                        <span>기록 <strong>{formatGramsAndDon(item.weightG)}</strong></span>
                        <span>예상 순금량 <strong>{Number(item.pureGoldG || 0).toFixed(2)}g</strong></span>
                        {publicPriceEnabled && <span>오늘 가치 <strong>{formatWon(item.estimatedValueWon)}</strong></span>}
                      </ItemMetrics>
                    </ItemMain>
                    <ItemActions>
                      <button type="button" data-variant="exchange" onClick={() => openSingleItemExchange(item)} aria-label={`${item.label} 금교환 계산`} title="금교환 계산">교환</button>
                      <button type="button" onClick={() => startEdit(item)} aria-label={`${item.label} 수정`} title="수정">수정</button>
                      <button type="button" data-variant="danger" onClick={() => remove(item)} aria-label={`${item.label} 삭제`} title="삭제">삭제</button>
                    </ItemActions>
                  </ItemCard>
                ))}
              </ItemList>
            ) : (
              <Empty>
                <GoldSeed aria-hidden />
                <strong>아직 기록한 금이 없습니다.</strong>
                <span>금 하나를 기록하면 오늘 가치와 가격 변화를 바로 확인할 수 있습니다.</span>
                <AddGoldButton type="button" onClick={openAddForm}><Plus size={15} aria-hidden /> 첫 금 기록하기</AddGoldButton>
              </Empty>
            )}
          </VaultSection>

          {isGuest && hasPersonalizedGuestVault && activeSummary.itemCount > 0 && (
            <GuestSaveCard aria-label="MY GOLD 회원가입 저장 안내">
              <GuestSaveCopy>
                <h2>기록한 금을 계정에 그대로 이어두세요.</h2>
                <p>회원가입 후에도 지금 만든 금 이름·종류·중량이 그대로 MY GOLD에 이어집니다.</p>
              </GuestSaveCopy>
              <GuestSaveAction type="button" onClick={saveGuestVaultToAccount}>
                <Save aria-hidden /> MY GOLD 기록 저장하기 <ArrowRight aria-hidden />
              </GuestSaveAction>
            </GuestSaveCard>
          )}
        </ViewPanel>
      )}

      {isTrendView && (
        <ViewPanel key="trend">
          {hasVaultContent && publicPriceEnabled ? (
            <MyGoldValueTrend
              pureGoldG={vaultPureGoldG}
              currentPricePerDon={customerSellPricePerDon}
              enabled={!vaultLoading && hasVaultContent && publicPriceEnabled}
              onWeeklyChange={handleWeeklyTrendChange}
              bonusOnly={activeSummary.itemCount === 0 && bonusBalanceG > 0}
              bonusGoldG={bonusBalanceG}
            />
          ) : (
            <Empty>
              <TrendingUp size={28} aria-hidden />
              <strong>가치 변화를 보려면 먼저 금을 기록해 주세요.</strong>
              <AddGoldButton type="button" onClick={() => navigate("/my-gold/items?add=1")}><Plus size={15} aria-hidden /> 금 기록하기</AddGoldButton>
            </Empty>
          )}

          {hasVaultContent && publicPriceEnabled && (
            <FoldPanel>
              <FoldSummary aria-controls="my-gold-history-content">
                <div>
                  <h2 id="my-gold-history-title">특정 날짜와 비교</h2>
                  <small>원하는 날짜 하나를 골라 그날의 공개 시세 기준 가치와 오늘을 비교합니다.</small>
                </div>
              </FoldSummary>
              <FoldBody id="my-gold-history-content" aria-labelledby="my-gold-history-title">
                <CompareRow>
                  <DateInput
                    type="date"
                    value={compareDate}
                    max={koreaTodayInputDate()}
                    aria-label="내 금 가치 비교 기준 날짜"
                    onChange={(event) => {
                      setCompareDate(event.target.value);
                      setHistoricalPrice(null);
                      setHistoricalMeta(null);
                      setCompareError("");
                    }}
                  />
                  <CompareButton type="button" disabled={compareLoading} onClick={compareHistory}>
                    {compareLoading ? "비교 중" : "비교"}
                  </CompareButton>
                  {(compareDate || historicalPrice) && (
                    <CompareButton type="button" data-variant="ghost" onClick={resetComparison}>초기화</CompareButton>
                  )}
                </CompareRow>
                {compareError && <CompareError role="alert">{compareError}</CompareError>}
                {historicalPrice && historicalMeta && historicalChange && (
                  <ComparisonResult>
                    <strong>{formatDateKey(historicalMeta.sourceDate || historicalMeta.lookupDate)}</strong> 참고가
                    {" "}<strong>{formatWon(historicalValueWon)}</strong> → 오늘
                    {" "}<strong>{formatWon(vaultValueWon)}</strong>
                    {" · "}{formatSignedWon(historicalChange.amount)}
                    {" · "}{formatSignedPercent(historicalChange.percent)}
                    {historicalMeta.carriedForward
                      ? ` · 선택일 이전의 가장 최근 공개 시세 ${formatDateKey(historicalMeta.sourceDate)} 적용`
                      : ""}
                  </ComparisonResult>
                )}
              </FoldBody>
            </FoldPanel>
          )}
        </ViewPanel>
      )}

      <Notice>
        {isGuest ? (
          <>체험 중 입력한 금 기록은 이 기기에만 임시 보관되며 <strong>MY GOLD 기록 저장</strong>을 선택하기 전에는 계정에 저장되지 않습니다. MY GOLD는 실물 금 보관 서비스가 아닙니다. 회원혜택 0.03g은 체험 예시이며, 예상 순금량과 금액은 참고값입니다. 실제 교환은 매장 실측 후 확정됩니다.</>
        ) : (
          <>MY GOLD는 <strong>실물 금 보관 서비스가 아닙니다.</strong> 기록한 금 정보는 사용자가 가진 금제품의 개인 기록이며, <strong>MEMBER GOLD</strong>는 한국골드마켓에서 적립된 별도 잔액입니다. 예상 순금량과 금액은 현재 교환 적용률·공개 시세를 적용한 참고값이며, 실제 교환 순금량과 비용은 매장에서 순도·중량을 실측한 뒤 최종 확정합니다.</>
        )}
      </Notice>

      {formOpen && (
        <FormOverlay onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <FormSheet role="dialog" aria-modal="true" aria-labelledby="my-vault-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <FormSheetHead>
              <div>
                <small>{isGuest ? "MY GOLD · 체험" : "MY GOLD"}</small>
                <h2 id="my-vault-form-title">{editingId ? "기록한 금 수정" : "내 금 기록"}</h2>
              </div>
              <button type="button" onClick={closeForm} aria-label="금 기록 창 닫기" disabled={saving}><X size={19} aria-hidden /></button>
            </FormSheetHead>

            <Form onSubmit={submit}>
              <Field>
                이름
                <Input
                  value={form.label}
                  maxLength={GOLD_VAULT_MAX_LABEL_LENGTH}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="예: 엄마에게 받은 반지"
                  autoFocus
                  required
                />
              </Field>

              <Field>
                금 종류
                <Select value={form.goldType} onChange={(e) => setForm((prev) => ({ ...prev, goldType: e.target.value }))} required>
                  <option value="">선택해 주세요</option>
                  {MY_GOLD_PRODUCT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </Select>
                <WeightHint>금교환 계산에서 사용하는 금 종류와 동일합니다. 기타·판단이 어려운 품목은 금교환의 현장 확인 예약을 이용해 주세요.</WeightHint>
              </Field>

              <Field>
                무게
                <WeightRow>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0.001"
                    max={form.weightUnit === "don" ? (10000 / DON_TO_GRAMS).toFixed(3) : "10000"}
                    step="0.001"
                    value={form.weightValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, weightValue: e.target.value }))}
                    placeholder={form.weightUnit === "don" ? "예: 2.00" : "예: 7.50"}
                    required
                  />
                  <UnitToggle aria-label="무게 단위 선택">
                    <UnitButton type="button" $active={form.weightUnit === "g"} aria-pressed={form.weightUnit === "g"} onClick={() => setForm((prev) => ({ ...prev, weightUnit: "g" }))}>g</UnitButton>
                    <UnitButton type="button" $active={form.weightUnit === "don"} aria-pressed={form.weightUnit === "don"} onClick={() => setForm((prev) => ({ ...prev, weightUnit: "don" }))}>돈</UnitButton>
                  </UnitToggle>
                </WeightRow>
                {weightReference && <WeightConversion aria-live="polite">{weightReference}</WeightConversion>}
                <WeightHint>1돈 = 3.75g · 입력한 무게는 반대 단위로도 바로 환산해 보여드립니다.</WeightHint>
              </Field>

              <Field>
                메모 (선택)
                <Textarea
                  value={form.note}
                  maxLength={GOLD_VAULT_MAX_NOTE_LENGTH}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="예: 결혼할 때 받은 반지"
                />
              </Field>

              {weightReference && form.goldType && (
                <BonusStrip aria-live="polite">
                  <div>
                    <small>기록 후 자동 계산</small>
                    <strong>현재 교환 기준의 예상 순금량과 오늘 가치가 MY GOLD에 바로 반영됩니다.</strong>
                  </div>
                  <ChevronRight size={20} aria-hidden />
                </BonusStrip>
              )}

              {error && <ErrorText role="alert">{error}</ErrorText>}

              <Buttons>
                <Button type="submit" disabled={saving || !canAddMore}>
                  {editingId ? <Save aria-hidden /> : <Plus aria-hidden />}
                  {saving
                    ? "저장 중..."
                    : editingId
                      ? isGuest ? "체험에 수정 반영" : "수정 저장"
                      : isGuest ? "체험 기록에 추가" : "MY GOLD에 저장"}
                </Button>
                <GhostButton type="button" onClick={closeForm} disabled={saving}><X aria-hidden /> 취소</GhostButton>
              </Buttons>
            </Form>
          </FormSheet>
        </FormOverlay>
      )}
    </Page>
  );
}
