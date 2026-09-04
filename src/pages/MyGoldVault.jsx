// src/pages/MyGoldVault.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { ArrowRight, Gem, Minus, Plus, Save, TrendingDown, TrendingUp, X } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { DON_TO_GRAMS } from "@/lib/goldRates";
import {
  GOLD_VAULT_MAX_ITEMS,
  GOLD_VAULT_MAX_LABEL_LENGTH,
  GOLD_VAULT_MAX_NOTE_LENGTH,
  GOLD_VAULT_TYPES,
  computeVaultPureGoldG,
  computeVaultValueWon,
  getGoldVaultTypeLabel,
} from "@/lib/goldVaultCatalog";
import {
  createGoldVaultItem,
  deleteGoldVaultItem,
  updateGoldVaultItem,
} from "@/services/goldVaultService";

const Page = styled.div`
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
  padding: 8px 0 26px;
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

const GuestAction = styled(Link)`
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.gold};
  border-radius: 12px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.72rem;
  font-weight: 950;
  text-decoration: none;
  word-break: keep-all;

  svg {
    flex: 0 0 auto;
    width: 15px;
    height: 15px;
  }

  @media (max-width: 520px) {
    width: 100%;
  }
`;

const GuestPreviewBar = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 13px 15px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  > div {
    min-width: 0;
  }

  strong {
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding: 3px 7px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.57rem;
    font-weight: 950;
    letter-spacing: 0.05em;
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.68rem;
    line-height: 1.45;
    word-break: keep-all;
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

const GuestLockedNote = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px dashed
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.67rem;
    line-height: 1.5;
    word-break: keep-all;
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
  return `${grams.toFixed(3)}g · ${(grams / DON_TO_GRAMS).toFixed(3)}돈`;
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

export default function MyGoldVault() {
  const { user } = useAuthContext();
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
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [compareDate, setCompareDate] = useState("");
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [historicalMeta, setHistoricalMeta] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");

  const canAddMore = items.length < GOLD_VAULT_MAX_ITEMS || !!editingId;
  const formTitle = editingId ? "나의 금 수정하기" : "나의 금 추가하기";

  const sortedItems = useMemo(() => items, [items]);
  const weightReference = useMemo(() => {
    const value = Number(form.weightValue);
    if (!Number.isFinite(value) || value <= 0) return "";

    if (form.weightUnit === "don") {
      return `${value.toFixed(3)}돈 = ${(value * DON_TO_GRAMS).toFixed(3)}g`;
    }

    return `${value.toFixed(3)}g = ${(value / DON_TO_GRAMS).toFixed(3)}돈`;
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

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!user?.uid || saving) return;
    if (!canAddMore) {
      setError(`내 금고에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 등록할 수 있습니다.`);
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
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const remove = async (item) => {
    if (!user?.uid) return;
    if (!window.confirm(`“${item.label || "금제품"}”을 내 금고에서 삭제할까요?`)) return;
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

  if (!user?.uid) {
    const GuestChangeIcon =
      guestSample.change.direction === "up"
        ? TrendingUp
        : guestSample.change.direction === "down"
          ? TrendingDown
          : Minus;
    const guestHistoricalValueWon =
      historicalPrice && guestSample.totalPureGoldG > 0
        ? computeVaultValueWon(guestSample.totalPureGoldG, historicalPrice)
        : 0;
    const guestHistoricalChange = historicalPrice
      ? getValueChange(guestSample.currentValueWon, guestHistoricalValueWon)
      : null;

    return (
      <Page>
        <ValuePanel aria-labelledby="guest-my-gold-current-value-title">
          <ValueKicker>MY GOLD VALUE · 체험 예시</ValueKicker>
          <ValueTitle id="guest-my-gold-current-value-title">내 금의 현재 참고가치</ValueTitle>
          <ValueAmount>
            {publicPriceEnabled ? formatWon(guestSample.currentValueWon) : "시세 공개 대기"}
          </ValueAmount>
          {publicPriceEnabled && (
            <ValueChange $direction={guestSample.change.direction}>
              <GuestChangeIcon aria-hidden />
              {Number.isFinite(guestSample.change.percent)
                ? `전일 시세 대비 ${formatSignedWon(guestSample.change.amount)} · ${formatSignedPercent(guestSample.change.percent)}`
                : "전일 시세 비교 준비 중"}
            </ValueChange>
          )}
        </ValuePanel>

        <GuestPreviewBar>
          <div>
            <strong>체험 예시</strong>
            <p>18K 팔찌 10g + 순금 돌반지 2돈 + 적립 순금 0.03g을 넣어본 화면입니다.</p>
          </div>
          <GuestAction to="/register">
            회원가입하고 순금 0.03g 나의 금고에 보관하기
            <ArrowRight aria-hidden />
          </GuestAction>
        </GuestPreviewBar>

        <SummaryGrid>
          <SummaryCard>
            <span>나의 금</span>
            <strong>{guestSample.items.length}개</strong>
          </SummaryCard>
          <SummaryCard>
            <span>총 등록 무게</span>
            <strong>{formatGramsAndDon(guestSample.registeredWeightG)}</strong>
          </SummaryCard>
          <SummaryCard>
            <span>예상 순금 중량</span>
            <strong>{formatGramsAndDon(guestSample.productPureGoldG)}</strong>
          </SummaryCard>
          <SummaryCard>
            <span>보너스 적립 순금</span>
            <strong>순금 {GUEST_SAMPLE_BONUS_G.toFixed(3)}g</strong>
          </SummaryCard>
        </SummaryGrid>

        <FoldPanel>
          <FoldSummary>
            <div>
              <h2>날짜별 내 금 가치 비교</h2>
              <small>체험 예시의 금을 선택한 과거 공개 시세와 비교합니다.</small>
            </div>
          </FoldSummary>
          <FoldBody>
            <CompareRow>
              <DateInput
                type="date"
                value={compareDate}
                max={koreaTodayInputDate()}
                onChange={(event) => {
                  setCompareDate(event.target.value);
                  setHistoricalPrice(null);
                  setHistoricalMeta(null);
                  setCompareError("");
                }}
              />
              <CompareButton type="button" onClick={compareHistory} disabled={compareLoading}>
                {compareLoading ? "조회 중" : "비교하기"}
              </CompareButton>
              {(historicalPrice || compareDate) && (
                <CompareButton type="button" data-variant="ghost" onClick={resetComparison}>
                  초기화
                </CompareButton>
              )}
            </CompareRow>
            {compareError && <CompareError>{compareError}</CompareError>}
            {historicalPrice && historicalMeta && guestHistoricalChange && (
              <ComparisonResult>
                <div>
                  선택 날짜 기준 <strong>{formatWon(guestHistoricalValueWon)}</strong>
                  {historicalMeta.carriedForward && " · 직전 공개 시세 적용"}
                </div>
                <div>
                  현재 참고가치와 비교하면 <strong>{formatSignedWon(guestHistoricalChange.amount)}</strong>
                  {Number.isFinite(guestHistoricalChange.percent) && (
                    <> · <strong>{formatSignedPercent(guestHistoricalChange.percent)}</strong></>
                  )}
                  입니다.
                </div>
                <div>적용 시세 기준일 {formatDateKey(historicalMeta.sourceDate || historicalMeta.lookupDate)}</div>
              </ComparisonResult>
            )}
          </FoldBody>
        </FoldPanel>

        <Panel>
          <PanelHead>
            <h2>나의 금 추가하기</h2>
            <small>회원가입 후 직접 저장</small>
          </PanelHead>
          <Form onSubmit={(event) => event.preventDefault()}>
            <Field>
              이름
              <Input value="엄마에게 받은 반지" readOnly aria-label="체험 예시 이름" />
            </Field>
            <Field>
              금 종류
              <Select value="18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)" disabled aria-label="체험 예시 금 종류">
                <option value="18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)">18K 제품</option>
              </Select>
            </Field>
            <Field>
              무게
              <WeightRow>
                <Input value="10.000" readOnly aria-label="체험 예시 무게" />
                <UnitToggle aria-label="체험 예시 무게 단위">
                  <UnitButton type="button" $active disabled>g</UnitButton>
                  <UnitButton type="button" disabled>돈</UnitButton>
                </UnitToggle>
              </WeightRow>
              <WeightConversion>10.000g = 2.667돈</WeightConversion>
            </Field>
            <GuestLockedNote>
              <p>회원가입하면 이 입력창이 활성화되어 실제 보유 금을 추가·수정할 수 있습니다.</p>
              <GuestAction to="/register">
                회원가입하고 나의 금 추가하기
                <ArrowRight aria-hidden />
              </GuestAction>
            </GuestLockedNote>
          </Form>
        </Panel>

        <FoldPanel open>
          <FoldSummary>
            <div>
              <h2>나의 금고 확인하기</h2>
              <small>체험 예시 · 나의 금 2개 + 적립 순금</small>
            </div>
          </FoldSummary>
          <FoldBody>
            <ItemList>
              <BonusItemCard>
                <ItemMain>
                  <BonusBadge>MEMBER GOLD · 체험 예시</BonusBadge>
                  <h3>한국골드마켓 적립 순금</h3>
                  <p>회원가입·퀵퀴즈·금시세 알림 혜택으로 최대 순금 0.03g까지 모을 수 있습니다.</p>
                  <ItemMetrics>
                    <span>현재 보유 <strong>순금 {GUEST_SAMPLE_BONUS_G.toFixed(3)}g</strong></span>
                    {publicPriceEnabled && (
                      <span>오늘 참고가 <strong>{formatWon(computeVaultValueWon(GUEST_SAMPLE_BONUS_G, customerSellPricePerDon))}</strong></span>
                    )}
                  </ItemMetrics>
                </ItemMain>
              </BonusItemCard>

              {guestSample.items.map((item) => (
                <ItemCard key={item.id}>
                  <ItemMain>
                    <BonusBadge>체험 예시</BonusBadge>
                    <h3>{item.label}</h3>
                    <p>{getGoldVaultTypeLabel(item.goldType)} · 실제 회원은 이름과 메모를 자유롭게 기록할 수 있습니다.</p>
                    <ItemMetrics>
                      <span>등록 <strong>{formatGramsAndDon(item.weightG)}</strong></span>
                      <span>예상 순금 <strong>{Number(item.pureGoldG || 0).toFixed(3)}g</strong></span>
                      {publicPriceEnabled && (
                        <span>오늘 참고가 <strong>{formatWon(item.estimatedValueWon)}</strong></span>
                      )}
                    </ItemMetrics>
                  </ItemMain>
                </ItemCard>
              ))}
            </ItemList>
          </FoldBody>
        </FoldPanel>

        <GuestPreviewBar>
          <div>
            <strong>나의 금고 시작하기</strong>
            <p>회원가입 후 내 금을 기록하고, 적립된 순금도 같은 금고에서 함께 확인할 수 있습니다.</p>
          </div>
          <GuestAction to="/register">
            회원가입하고 순금 0.03g 나의 금고에 보관하기
            <ArrowRight aria-hidden />
          </GuestAction>
        </GuestPreviewBar>

        <Notice>
          위 금제품·중량·적립 순금은 비회원용 체험 예시입니다. 실제 가입 후에는 본인의 금고와 실제 적립 잔액이 표시됩니다.
        </Notice>
      </Page>
    );
  }

  return (
    <Page>
      <ValuePanel aria-labelledby="my-gold-current-value-title">
        <ValueKicker>MY GOLD VALUE</ValueKicker>
        <ValueTitle id="my-gold-current-value-title">내 금의 현재 참고가치</ValueTitle>
        <ValueAmount $empty={!vaultLoading && !hasVaultContent}>
          {vaultLoading
            ? "불러오는 중"
            : !hasVaultContent
              ? "나의 금을 추가해 주세요"
              : publicPriceEnabled
                ? formatWon(vaultValueWon)
                : "시세 공개 대기"}
        </ValueAmount>

        {!vaultLoading && hasVaultContent && publicPriceEnabled && (
          <ValueChange $direction={currentChange.direction}>
            <CurrentChangeIcon aria-hidden />
            {Number.isFinite(currentChange.percent)
              ? `전일 시세 대비 ${formatSignedWon(currentChange.amount)} · ${formatSignedPercent(currentChange.percent)}`
              : "전일 시세 비교 준비 중"}
          </ValueChange>
        )}

      </ValuePanel>

      <SummaryGrid>
        <SummaryCard><span>나의 금</span><strong>{summary.itemCount}개</strong></SummaryCard>
        <SummaryCard><span>총 등록 무게</span><strong>{formatGramsAndDon(summary.totalWeightG)}</strong></SummaryCard>
        <SummaryCard><span>예상 순금 중량</span><strong>{formatGramsAndDon(summary.pureGoldG)}</strong></SummaryCard>
        <SummaryCard><span>보너스 적립</span><strong>순금 {bonusBalanceG.toFixed(3)}g</strong></SummaryCard>
      </SummaryGrid>

      {hasVaultContent && publicPriceEnabled && (
        <FoldPanel>
          <FoldSummary aria-controls="my-gold-history-content">
            <div>
              <h2 id="my-gold-history-title">날짜별 내 금 가치 비교</h2>
              <small>필요할 때 펼쳐 선택한 날짜와 오늘의 가치를 비교합니다.</small>
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
              <CompareButton
                type="button"
                disabled={compareLoading}
                onClick={compareHistory}
              >
                {compareLoading ? "비교 중" : "비교"}
              </CompareButton>
              {(compareDate || historicalPrice) && (
                <CompareButton type="button" data-variant="ghost" onClick={resetComparison}>
                  전일 기준
                </CompareButton>
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

      <Panel>
        <PanelHead>
          <h2>{formTitle}</h2>
          <small>{items.length}/{GOLD_VAULT_MAX_ITEMS} · 계속 추가 가능</small>
        </PanelHead>
        <Form onSubmit={submit}>
          <Field>
            이름
            <Input
              value={form.label}
              maxLength={GOLD_VAULT_MAX_LABEL_LENGTH}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="예: 엄마에게 받은 반지"
              required
            />
          </Field>

          <Field>
            금 종류
            <Select
              value={form.goldType}
              onChange={(e) => setForm((prev) => ({ ...prev, goldType: e.target.value }))}
              required
            >
              <option value="">선택해 주세요</option>
              {GOLD_VAULT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
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
                placeholder={form.weightUnit === "don" ? "예: 2.000" : "예: 7.500"}
                required
              />
              <UnitToggle aria-label="무게 단위 선택">
                <UnitButton
                  type="button"
                  $active={form.weightUnit === "g"}
                  aria-pressed={form.weightUnit === "g"}
                  onClick={() => setForm((prev) => ({ ...prev, weightUnit: "g" }))}
                >
                  g
                </UnitButton>
                <UnitButton
                  type="button"
                  $active={form.weightUnit === "don"}
                  aria-pressed={form.weightUnit === "don"}
                  onClick={() => setForm((prev) => ({ ...prev, weightUnit: "don" }))}
                >
                  돈
                </UnitButton>
              </UnitToggle>
            </WeightRow>
            {weightReference && (
              <WeightConversion aria-live="polite">{weightReference}</WeightConversion>
            )}
            <WeightHint>
              1돈 = 3.75g · 선택한 단위의 반대 단위를 위에 실시간으로 보여드립니다.
            </WeightHint>
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

          {error && <ErrorText role="alert">{error}</ErrorText>}

          <Buttons>
            <Button type="submit" disabled={saving || !canAddMore}>
              {editingId ? <Save aria-hidden /> : <Plus aria-hidden />}
              {saving ? "저장 중..." : editingId ? "수정 저장" : "나의 금 추가하기"}
            </Button>
            {editingId && (
              <GhostButton type="button" onClick={resetForm}>
                <X aria-hidden /> 취소
              </GhostButton>
            )}
          </Buttons>
        </Form>
      </Panel>

      <FoldPanel>
        <FoldSummary aria-controls="my-gold-vault-content">
          <div>
            <h2>나의 금고 확인하기</h2>
            <small>
              {vaultLoading
                ? "내 금고 정보를 불러오는 중입니다."
                : summary.itemCount > 0 || bonusBalanceG > 0
                  ? `나의 금 ${summary.itemCount}개 · 적립 순금 ${bonusBalanceG.toFixed(3)}g`
                  : "아직 추가한 금은 없지만 순금 혜택을 모을 수 있습니다."}
            </small>
          </div>
        </FoldSummary>
        <FoldBody id="my-gold-vault-content">
          {vaultLoading ? (
            <Empty>내 금고 정보를 불러오는 중입니다.</Empty>
          ) : (
            <>
              <ItemList>
                <BonusItemCard>
                  <ItemMain>
                    <BonusBadge>MEMBER GOLD</BonusBadge>
                    <h3>한국골드마켓 적립 순금</h3>
                    <p>회원가입·퀵퀴즈·금시세 알림 혜택으로 최대 순금 0.03g까지 모을 수 있습니다.</p>
                    <ItemMetrics>
                      <span>현재 보유 <strong>순금 {bonusBalanceG.toFixed(3)}g</strong></span>
                      {publicPriceEnabled && bonusBalanceG > 0 && (
                        <span>오늘 참고가 <strong>{formatWon(bonusCurrentValueWon)}</strong></span>
                      )}
                    </ItemMetrics>
                  </ItemMain>
                </BonusItemCard>

                {sortedItems.map((item) => (
                  <ItemCard key={item.id}>
                    <ItemMain>
                      <h3>{item.label}</h3>
                      <p>{getGoldVaultTypeLabel(item.goldType)}{item.note ? ` · ${item.note}` : ""}</p>
                      <ItemMetrics>
                        <span>등록 <strong>{formatGramsAndDon(item.weightG)}</strong></span>
                        <span>예상 순금 <strong>{Number(item.pureGoldG || 0).toFixed(3)}g</strong></span>
                        {publicPriceEnabled && (
                          <span>오늘 참고가 <strong>{formatWon(item.estimatedValueWon)}</strong></span>
                        )}
                      </ItemMetrics>
                    </ItemMain>
                    <ItemActions>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        aria-label={`${item.label} 수정`}
                        title="수정"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        data-variant="danger"
                        onClick={() => remove(item)}
                        aria-label={`${item.label} 삭제`}
                        title="삭제"
                      >
                        삭제
                      </button>
                    </ItemActions>
                  </ItemCard>
                ))}
              </ItemList>

              {sortedItems.length === 0 && (
                <Empty><Gem size={28} aria-hidden />보너스 순금과 함께 나의 금도 추가해 보세요.</Empty>
              )}
            </>
          )}
        </FoldBody>
      </FoldPanel>

      <Notice>
        내 금고의 등록 금과 적립 순금 금액은 공개 시세를 적용한 참고값입니다. 실제 금제품 교환 중량과 비용은 매장에서 순도·중량을 실측한 뒤 최종 확인합니다.
      </Notice>
    </Page>
  );
}
