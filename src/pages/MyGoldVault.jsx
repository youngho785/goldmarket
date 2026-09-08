// src/pages/MyGoldVault.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
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
import { ArrowRight, Calculator, ChevronRight, Gem, Minus, Plus, Save, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import MyGoldValueTrend from "@/components/gold/MyGoldValueTrend";
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
} from "@/lib/goldVaultImportDraft";


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
  overflow: hidden;
  display: grid;
  gap: 11px;
  padding: clamp(18px, 3.2vw, 25px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 25px;
  background:
    radial-gradient(circle at 94% 6%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 10%, transparent) 0, transparent 32%),
    linear-gradient(140deg, color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 30%, white), ${({ theme }) => theme.colors.surface} 68%);
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 12px 34px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 7%, transparent);

  &::after {
    content: "G";
    position: absolute;
    right: -21px;
    bottom: -58px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 8%, transparent);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 12rem;
    font-weight: 950;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 520px) {
    gap: 10px;
    padding: 17px 16px 18px;
    border-radius: 23px;
  }
`;

const HeroKicker = styled.div`
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 7px;
  min-height: 27px;
  padding: 5px 9px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, ${({ theme }) => theme.colors.border});
  border-radius: 999px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.66rem;
  font-weight: 950;
  letter-spacing: 0.06em;
`;

const HeroTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.28rem, 4vw, 1.82rem);
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: -0.035em;
`;

const HeroAmount = styled.strong`
  position: relative;
  z-index: 1;
  display: block;
  margin-top: -2px;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: ${({ $empty }) => $empty ? "clamp(1.35rem, 4.5vw, 2rem)" : "clamp(2.45rem, 8vw, 4.15rem)"};
  font-weight: 950;
  line-height: 0.98;
  letter-spacing: -0.055em;
  overflow-wrap: anywhere;
`;

const HeroChangeGroup = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 6px 14px;
  flex-wrap: wrap;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
`;

const HeroStat = styled.div`
  min-width: 0;
  padding: 10px 9px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, ${({ theme }) => theme.colors.border});
  border-radius: 14px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 92%, ${({ theme }) => theme.semantic.badgeGoldBg});

  span {
    display: block;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: clamp(0.52rem, 2vw, 0.61rem);
    font-weight: 850;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(0.76rem, 2.7vw, 0.96rem);
    font-weight: 950;
    line-height: 1.15;
    white-space: nowrap;
  }
`;

const ReadinessPanel = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 15px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 30%, ${({ theme }) => theme.colors.primary});
  border-radius: 17px;
  background:
    radial-gradient(circle at 92% 10%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent) 0, transparent 34%),
    linear-gradient(140deg, #081925 0%, ${({ theme }) => theme.colors.primary} 72%, #17231f 100%);
  box-shadow: 0 10px 24px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 13%, transparent);

  > div:first-child { min-width: 0; }

  small {
    display: block;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.56rem;
    font-weight: 950;
    letter-spacing: 0.07em;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: #fffaf0;
    font-size: clamp(0.95rem, 3.2vw, 1.22rem);
    font-weight: 950;
    line-height: 1.24;
    word-break: keep-all;
  }

  p {
    margin: 5px 0 0;
    color: rgba(255,255,255,0.64);
    font-size: 0.62rem;
    line-height: 1.45;
    word-break: keep-all;
  }

  .bar {
    display: grid;
    grid-template-rows: auto auto auto;
    place-items: center;
    width: 92px;
    min-height: 64px;
    padding: 7px 8px;
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 55%, transparent);
    border-radius: 13px;
    background: linear-gradient(145deg, #f7e6b9 0%, ${({ theme }) => theme.colors.goldLight} 38%, ${({ theme }) => theme.colors.gold} 100%);
    color: ${({ theme }) => theme.colors.primary};
    text-align: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 8px 18px rgba(0,0,0,0.18);
  }

  .bar b {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 0.78rem;
    line-height: 1;
  }

  .bar span {
    margin-top: 2px;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.43rem;
    font-weight: 900;
    letter-spacing: 0.035em;
    line-height: 1.15;
    white-space: nowrap;
  }

  .bar em {
    margin-top: 3px;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.82rem;
    font-style: normal;
    font-weight: 950;
    line-height: 1;
    white-space: nowrap;
  }

  @media (max-width: 440px) {
    grid-template-columns: minmax(0, 1fr) 82px;
    gap: 9px;
    padding: 13px;

    .bar { width: 82px; min-height: 60px; }
  }
`;

const HeroActions = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
`;

const HeroExchangeAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 50px;
  padding: 10px 15px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 52%, transparent);
  border-radius: 15px;
  background: linear-gradient(105deg, #f7e6ba 0%, ${({ theme }) => theme.colors.goldLight} 38%, ${({ theme }) => theme.colors.gold} 100%);
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 9px 22px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);
  font-size: 0.8rem;
  font-weight: 950;
  text-decoration: none;

  svg { width: 18px; height: 18px; }
`;

const VaultSection = styled.section`
  display: grid;
  gap: 13px;
  padding: clamp(16px, 3vw, 20px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 13%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 28px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

const SectionHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

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

const BonusStrip = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 30%, ${({ theme }) => theme.colors.border});
  border-radius: 15px;
  background: linear-gradient(120deg, ${({ theme }) => theme.semantic.badgeGoldBg}, ${({ theme }) => theme.colors.surface});

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.57rem;
    font-weight: 950;
    letter-spacing: 0.05em;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.78rem;
    font-weight: 900;
    line-height: 1.35;
  }

  .amount {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.9rem;
    font-weight: 950;
    text-align: right;
  }
`;

const GuestJourney = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;

  span {
    display: grid;
    place-items: center;
    min-height: 66px;
    padding: 8px 7px;
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, ${({ theme }) => theme.colors.border});
    border-radius: 13px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.63rem;
    font-weight: 850;
    line-height: 1.35;
    text-align: center;
  }

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    span { min-height: 56px; }
  }
`;

const GuestCtaRow = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  a {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 48px;
    padding: 10px 12px;
    border-radius: 14px;
    font-size: 0.72rem;
    font-weight: 950;
    text-decoration: none;
  }

  a:first-child {
    background: linear-gradient(105deg, #f7e6ba 0%, ${({ theme }) => theme.colors.gold} 100%);
    color: ${({ theme }) => theme.colors.primary};
  }

  a:last-child {
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 22%, ${({ theme }) => theme.colors.border});
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 480px) { grid-template-columns: 1fr; }
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
    font-size: 0.58rem;
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
    font-size: 0.59rem;
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
    font-size: 0.59rem;
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
    font-size: 0.56rem;
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
    font-size: 0.59rem;
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
  gap: 8px;
`;

const ItemCard = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 11%, ${({ theme }) => theme.colors.border});
  border-radius: 17px;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 18%, white),
      ${({ theme }) => theme.colors.surfaceAlt} 74%
    );
  transition:
    transform ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.base};

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, ${({ theme }) => theme.colors.border});
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
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
  font-size: 0.55rem;
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

const Notice = styled.p`
  margin: 0 4px;
  padding: 2px 4px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.59rem;
  line-height: 1.5;
  text-align: center;
  word-break: keep-all;
`;

const EMPTY_FORM = { label: "", goldType: "", weightValue: "", weightUnit: "g", note: "" };


const GUEST_SAMPLE_BONUS_G = 0.03;
const GOLD_EXCHANGE_MAX_PRODUCTS = 20;
const GUEST_SAMPLE_ITEMS = Object.freeze([
  {
    id: "guest-sample-bracelet",
    label: "18K 팔찌",
    goldType: "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
    weightG: 10,
    note: "체험 예시",
  },
  {
    id: "guest-sample-ring",
    label: "순금 돌반지",
    goldType: "순금 999제품(팔찌,목걸이, 반지,귀걸이)",
    weightG: DON_TO_GRAMS * 2,
    note: "체험 예시",
  },
]);

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
  const bonusBalanceG = Number(bonus.balanceG || 0);
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
  const importRequested = new URLSearchParams(location.search).get("import") === "calculator";
  const [importDraft, setImportDraft] = useState(() =>
    importRequested ? readGoldVaultImportDraft() : null
  );
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    if (!importRequested) return;
    setImportDraft(readGoldVaultImportDraft());
    setImportError("");
  }, [importRequested]);

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

  const canAddMore = items.length < GOLD_VAULT_MAX_ITEMS || !!editingId;

  const sortedItems = useMemo(() => items, [items]);
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

  const guestSample = useMemo(() => {
    const sampleItems = GUEST_SAMPLE_ITEMS.map((item) => {
      const pureGoldG = computeVaultPureGoldG(item, rates);
      const estimatedValueWon = publicPriceEnabled
        ? computeVaultValueWon(pureGoldG, customerSellPricePerDon)
        : 0;
      return { ...item, pureGoldG, estimatedValueWon };
    });

    const registeredWeightG = sampleItems.reduce(
      (total, item) => total + Number(item.weightG || 0),
      0
    );
    const productPureGoldG = sampleItems.reduce(
      (total, item) => total + Number(item.pureGoldG || 0),
      0
    );
    const totalPureGoldG = productPureGoldG + GUEST_SAMPLE_BONUS_G;
    const currentValueWon = publicPriceEnabled
      ? computeVaultValueWon(totalPureGoldG, customerSellPricePerDon)
      : 0;
    const previousValueWon = publicPriceEnabled
      ? computeVaultValueWon(totalPureGoldG, previousCustomerSellPricePerDon)
      : 0;

    return {
      items: sampleItems,
      registeredWeightG,
      productPureGoldG,
      totalPureGoldG,
      currentValueWon,
      previousValueWon,
      change: getValueChange(currentValueWon, previousValueWon),
    };
  }, [
    rates,
    publicPriceEnabled,
    customerSellPricePerDon,
    previousCustomerSellPricePerDon,
  ]);

  const guestReadiness = useMemo(
    () => getGoldBarReadiness(guestSample.totalPureGoldG),
    [guestSample.totalPureGoldG]
  );

  const bonusCurrentValueWon =
    publicPriceEnabled && bonusBalanceG > 0
      ? computeVaultValueWon(bonusBalanceG, customerSellPricePerDon)
      : 0;
  const bonusPreviousValueWon =
    publicPriceEnabled && bonusBalanceG > 0
      ? computeVaultValueWon(bonusBalanceG, previousCustomerSellPricePerDon)
      : 0;
  const vaultValueWon = Number(summary.estimatedValueWon || 0) + bonusCurrentValueWon;
  const previousVaultValueWon =
    Number(summary.previousEstimatedValueWon || 0) + bonusPreviousValueWon;
  const vaultPureGoldG = Number(summary.pureGoldG || 0) + bonusBalanceG;
  const hasVaultContent = summary.itemCount > 0 || bonusBalanceG > 0;
  const vaultLoading = itemsLoading || bonus.loading;
  const barReadiness = useMemo(() => getGoldBarReadiness(summary.pureGoldG), [summary.pureGoldG]);
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

    const draft = importDraft || readGoldVaultImportDraft();
    const pendingItems = Array.isArray(draft?.items) ? draft.items : [];
    if (!pendingItems.length) {
      setImportDraft(null);
      setImportError("저장할 계산 정보가 없습니다. 금교환 계산기에서 다시 계산해 주세요.");
      return;
    }

    if (itemsLoading) {
      setImportError("현재 내금고를 확인하고 있습니다. 잠시 후 다시 눌러 주세요.");
      return;
    }

    if (items.length + pendingItems.length > GOLD_VAULT_MAX_ITEMS) {
      setImportError(
        `내금고는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 저장할 수 있습니다. 현재 ${items.length}개가 있어 ${pendingItems.length}개를 모두 추가할 공간이 부족합니다.`
      );
      return;
    }

    setImportSaving(true);
    setImportError("");
    try {
      await createGoldVaultItems(user.uid, pendingItems);
      clearGoldVaultImportDraft();
      setImportDraft(null);
      navigate("/my-gold", {
        replace: true,
        state: { myGoldImportSuccess: pendingItems.length },
      });
    } catch (saveError) {
      setImportError(saveError?.message || "내금고에 저장하지 못했습니다. 다시 시도해 주세요.");
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
      setError(`내금고에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 등록할 수 있습니다.`);
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
    if (!user?.uid || saving) return;
    if (!canAddMore) {
      setError(`내금고에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 등록할 수 있습니다.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const values = {
        label: form.label,
        goldType: form.goldType,
        weightG: weightInputToGrams(form),
        note: form.note,
      };

      if (editingId) {
        await updateGoldVaultItem(user.uid, editingId, values);
      } else {
        await createGoldVaultItem(user.uid, values);
      }
      resetForm();
      setFormOpen(false);
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
    if (!user?.uid) return;
    if (!window.confirm(`“${item.label || "금제품"}”을 내금고에서 삭제할까요?`)) return;
    try {
      await deleteGoldVaultItem(user.uid, item.id);
      if (editingId === item.id) resetForm();
    } catch (deleteError) {
      setError(deleteError?.message || "삭제하지 못했습니다. 다시 시도해 주세요.");
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

  if (!user?.uid) {
    const GuestChangeIcon =
      guestSample.change.direction === "up"
        ? TrendingUp
        : guestSample.change.direction === "down"
          ? TrendingDown
          : Minus;

    return (
      <Page>
        <VaultHero aria-labelledby="guest-vault-title">
          <HeroKicker><Gem size={15} aria-hidden /> MY GOLD · 내금고 체험</HeroKicker>
          <HeroTitle id="guest-vault-title">내 금의 오늘 가치를 먼저 확인해보세요.</HeroTitle>
          <HeroAmount>
            {publicPriceEnabled ? formatWon(guestSample.currentValueWon) : "시세 공개 대기"}
          </HeroAmount>

          {publicPriceEnabled && Number.isFinite(guestSample.change.percent) && (
            <HeroChangeGroup>
              <HeroChange $direction={guestSample.change.direction}>
                <GuestChangeIcon aria-hidden />
                오늘 {formatSignedWon(guestSample.change.amount)} · {formatSignedPercent(guestSample.change.percent)}
              </HeroChange>
            </HeroChangeGroup>
          )}

          <HeroStats aria-label="내금고 체험 예시 요약">
            <HeroStat><span>예시 실물 금</span><strong>{formatGramsAndDon(guestSample.registeredWeightG)}</strong></HeroStat>
            <HeroStat><span>예상 순금량</span><strong>{guestSample.productPureGoldG.toFixed(2)}g</strong></HeroStat>
            <HeroStat><span>회원혜택 예시</span><strong>+{GUEST_SAMPLE_BONUS_G.toFixed(2)}g</strong></HeroStat>
          </HeroStats>

          <ReadinessPanel>
            <div>
              <small>MY GOLD → 999.9 GOLD BAR</small>
              <strong>
                {guestReadiness?.available
                  ? `${guestReadiness.label} 교환 가능`
                  : `1g 골드바까지 ${Number(guestReadiness?.neededG || 0).toFixed(2)}g 더 필요`}
              </strong>
              <p>18K 팔찌 10g과 순금 돌반지 2돈을 예시로 계산했습니다.</p>
            </div>
            <div className="bar" aria-hidden><b>MY GOLD</b><span>999.9 GOLD</span><em>DEMO</em></div>
          </ReadinessPanel>

          <GuestJourney aria-label="내금고에서 확인할 수 있는 정보">
            <span>오늘<br />내 금 가치</span>
            <span>가격<br />변화</span>
            <span>예상<br />순금량</span>
            <span>교환 가능한<br />골드바</span>
          </GuestJourney>

          <GuestCtaRow>
            <Link to="/register?next=%2Fmy-gold">회원가입하고 내 금 저장 <ArrowRight size={16} aria-hidden /></Link>
            <Link to="/login?next=%2Fmy-gold">로그인하고 내금고 시작 <ArrowRight size={16} aria-hidden /></Link>
          </GuestCtaRow>
        </VaultHero>

        <BonusStrip>
          <div>
            <small>MEMBER BENEFIT</small>
            <strong>회원가입 · 퀵퀴즈 · 금시세 알림 각 +0.01g</strong>
          </div>
          <div className="amount">최대 0.03g</div>
        </BonusStrip>

        <Notice>
          체험 화면의 금액과 예상 순금량은 예시 금제품과 현재 공개 시세·한국골드마켓 교환 기준을 적용한 참고값입니다. 실제 교환 순금량과 비용은 매장 실측 후 최종 확정됩니다.
        </Notice>
      </Page>
    );
  }

  return (
    <Page>
      <VaultHero aria-labelledby="my-vault-current-value-title">
        <HeroKicker><Gem size={15} aria-hidden /> MY GOLD · 내금고</HeroKicker>
        <HeroTitle id="my-vault-current-value-title">내 금의 오늘 가치</HeroTitle>
        <HeroAmount $empty={!vaultLoading && !hasVaultContent}>
          {vaultLoading
            ? "불러오는 중"
            : !hasVaultContent
              ? "첫 금을 등록해 보세요"
              : publicPriceEnabled
                ? formatWon(vaultValueWon)
                : "시세 공개 대기"}
        </HeroAmount>

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
            <span>실물 금</span>
            <strong>{Number(summary.totalWeightG || 0).toFixed(2)}g</strong>
          </HeroStat>
          <HeroStat>
            <span>예상 순금량</span>
            <strong>{Number(summary.pureGoldG || 0).toFixed(2)}g</strong>
          </HeroStat>
          <HeroStat>
            <span>적립 순금</span>
            <strong>{bonusBalanceG.toFixed(2)}g</strong>
          </HeroStat>
        </HeroStats>

        <ReadinessPanel>
          {summary.itemCount > 0 ? (
            <>
              <div>
                <small>MY GOLD → 999.9 GOLD BAR</small>
                <strong>
                  {barReadiness?.available
                    ? `${barReadiness.label} 교환 가능`
                    : `1g 골드바까지 약 ${Number(barReadiness?.neededG || 0).toFixed(2)}g 더 필요`}
                </strong>
                <p>
                  예상 순금량 {Number(summary.pureGoldG || 0).toFixed(2)}g
                  {barReadiness?.available
                    ? ` · 예상 잔여 순금 ${Number(barReadiness.remainingG || 0).toFixed(2)}g`
                    : " · 금을 더 등록하면 교환 가능 규격이 자동으로 갱신됩니다."}
                </p>
              </div>
              <div className="bar" aria-label={barReadiness?.available ? `${barReadiness.label} 999.9 골드바` : "1g 골드바 목표"}>
                <b>KGM</b>
                <span>FINE GOLD 999.9</span>
                <em>{barReadiness?.available ? barReadiness.label : "1g 목표"}</em>
              </div>
            </>
          ) : (
            <>
              <div>
                <small>첫 금을 등록해 보세요</small>
                <strong>금 종류와 무게만 입력하면 예상 순금량과 가능한 골드바를 바로 계산합니다.</strong>
                <p>반지, 목걸이, 돌반지처럼 지금 가지고 있는 금부터 기록해 두세요.</p>
              </div>
              <div className="bar" aria-hidden><b>KGM</b><span>FINE GOLD 999.9</span><em>START</em></div>
            </>
          )}
        </ReadinessPanel>

        <HeroActions>
          <HeroExchangeAction
            to="/gold-exchange"
            state={{ source: "my-gold", vaultProducts: exchangeProducts }}
            aria-label="내금고의 실물 금으로 금교환 계산하기"
          >
            <Calculator aria-hidden />
            {summary.itemCount > 0 ? "내금고로 교환 계산하기" : "금교환 계산 먼저 해보기"}
            <ArrowRight aria-hidden />
          </HeroExchangeAction>
        </HeroActions>
      </VaultHero>

      {Number(location.state?.myGoldImportSuccess || 0) > 0 && (
        <Notice role="status">
          금교환 계산에서 가져온 금 {Number(location.state.myGoldImportSuccess)}개를 내금고에 저장했습니다. 현재 시세와 교환 기준으로 가치가 자동 계산됩니다.
        </Notice>
      )}

      {importRequested && (
        <MyGoldImportPrompt
          draft={importDraft}
          currentCount={items.length}
          maxItems={GOLD_VAULT_MAX_ITEMS}
          loading={itemsLoading}
          saving={importSaving}
          error={importError}
          onConfirm={confirmCalculatorImport}
          onCancel={cancelCalculatorImport}
        />
      )}

      <VaultSection aria-labelledby="my-vault-items-title">
        <SectionHead>
          <div>
            <h2 id="my-vault-items-title">보유 금</h2>
            <p>실물 금을 기록해 두면 오늘 가치와 예상 순금량, 교환 가능 골드바가 자동으로 따라옵니다.</p>
          </div>
          <AddGoldButton type="button" onClick={openAddForm} disabled={!canAddMore}>
            <Plus size={15} aria-hidden /> 금 등록
          </AddGoldButton>
        </SectionHead>

        {error && !formOpen && <ErrorText role="alert">{error}</ErrorText>}

        {vaultLoading ? (
          <Empty>내금고 정보를 불러오는 중입니다.</Empty>
        ) : sortedItems.length > 0 ? (
          <ItemList>
            {sortedItems.map((item) => (
              <ItemCard key={item.id}>
                <ItemMain>
                  <h3>{item.label}</h3>
                  <p>{getGoldVaultTypeLabel(item.goldType)}{item.note ? ` · ${item.note}` : ""}</p>
                  <ItemMetrics>
                    <span>등록 <strong>{formatGramsAndDon(item.weightG)}</strong></span>
                    <span>예상 순금량 <strong>{Number(item.pureGoldG || 0).toFixed(2)}g</strong></span>
                    {publicPriceEnabled && (
                      <span>오늘 가치 <strong>{formatWon(item.estimatedValueWon)}</strong></span>
                    )}
                  </ItemMetrics>
                </ItemMain>
                <ItemActions>
                  <button
                    type="button"
                    data-variant="exchange"
                    onClick={() => openSingleItemExchange(item)}
                    aria-label={`${item.label} 금교환 계산`}
                    title="금교환 계산"
                  >
                    교환
                  </button>
                  <button type="button" onClick={() => startEdit(item)} aria-label={`${item.label} 수정`} title="수정">
                    수정
                  </button>
                  <button type="button" data-variant="danger" onClick={() => remove(item)} aria-label={`${item.label} 삭제`} title="삭제">
                    삭제
                  </button>
                </ItemActions>
              </ItemCard>
            ))}
          </ItemList>
        ) : (
          <Empty>
            <Gem size={28} aria-hidden />
            <strong>아직 등록한 실물 금이 없습니다.</strong>
            <span>금 하나를 등록하면 오늘 가치와 골드바 교환 가능량을 바로 확인할 수 있습니다.</span>
            <AddGoldButton type="button" onClick={openAddForm}><Plus size={15} aria-hidden /> 첫 금 등록하기</AddGoldButton>
          </Empty>
        )}

        <BonusStrip>
          <div>
            <small><Sparkles size={12} aria-hidden /> MEMBER GOLD</small>
            <strong>회원 혜택으로 적립한 순금도 금교환 가치에 함께 더해집니다.</strong>
          </div>
          <div className="amount">순금 {bonusBalanceG.toFixed(2)}g</div>
        </BonusStrip>
      </VaultSection>

      {hasVaultContent && publicPriceEnabled && (
        <MyGoldValueTrend
          pureGoldG={vaultPureGoldG}
          currentPricePerDon={customerSellPricePerDon}
          enabled={!vaultLoading && hasVaultContent && publicPriceEnabled}
          onWeeklyChange={handleWeeklyTrendChange}
          bonusOnly={summary.itemCount === 0 && bonusBalanceG > 0}
          bonusGoldG={bonusBalanceG}
        />
      )}

      <MyGoldAlertSummary uid={user.uid} />

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

      <Notice>
        내금고의 <strong>등록 실물 금</strong>은 사용자가 보유한 금제품 기록이고, <strong>회원 혜택 적립 순금</strong>은 한국골드마켓에서 적립된 별도 잔액입니다. 예상 순금량과 금액은 현재 교환 적용률·공개 시세를 적용한 참고값이며, 실제 교환 순금량과 비용은 매장에서 순도·중량을 실측한 뒤 최종 확정합니다.
      </Notice>

      {formOpen && (
        <FormOverlay onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <FormSheet role="dialog" aria-modal="true" aria-labelledby="my-vault-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <FormSheetHead>
              <div>
                <small>MY GOLD · 내금고</small>
                <h2 id="my-vault-form-title">{editingId ? "등록한 금 수정" : "내 금 등록"}</h2>
              </div>
              <button type="button" onClick={closeForm} aria-label="금 등록 창 닫기" disabled={saving}><X size={19} aria-hidden /></button>
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
                    <small>등록 후 자동 계산</small>
                    <strong>현재 교환 기준의 예상 순금량과 오늘 가치가 내금고에 바로 반영됩니다.</strong>
                  </div>
                  <ChevronRight size={20} aria-hidden />
                </BonusStrip>
              )}

              {error && <ErrorText role="alert">{error}</ErrorText>}

              <Buttons>
                <Button type="submit" disabled={saving || !canAddMore}>
                  {editingId ? <Save aria-hidden /> : <Plus aria-hidden />}
                  {saving ? "저장 중..." : editingId ? "수정 저장" : "내금고에 저장"}
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
