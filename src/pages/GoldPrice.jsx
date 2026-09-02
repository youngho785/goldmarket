// src/pages/GoldPrice.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";

import { db, registerForPush } from "@/firebase/firebase";
import { useAuthContext } from "@/context/AuthContext";
import {
  getNotificationPreferences,
  saveMarketingNotificationConsent,
  saveMarketingPushTarget,
} from "@/services/notificationPreferences";

const Page = styled.div`
  --gold: #c8922f;
  --gold-bright: #e4b758;
  --gold-soft: #f6ead3;
  --ink: #0c1116;
  --ink-soft: #171d23;
  --cream: #faf8f4;
  --line: rgba(12, 17, 22, 0.1);

  width: 100%;
  padding: 0 0 clamp(44px, 7vw, 76px);

  @media (max-width: 760px) {
    padding-bottom: 12px;
  }

  color: ${({ theme }) => theme.colors.text};
  background:
    radial-gradient(circle at 85% 4%, rgba(228, 183, 88, 0.12), transparent 28rem),
    linear-gradient(180deg, #ffffff 0%, var(--cream) 72%, #ffffff 100%);
`;

const Shell = styled.div`
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;

  @media (max-width: 680px) {
    width: calc(100% - 20px);
  }
`;

const Hero = styled.section`
  padding: clamp(18px, 3vw, 30px) 0 10px;
`;

const HeroCard = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(260px, 0.92fr);
  min-height: 282px;
  overflow: hidden;
  border: 1px solid rgba(213, 164, 67, 0.28);
  border-radius: 26px;
  background:
    radial-gradient(circle at 82% 18%, rgba(212, 159, 53, 0.15), transparent 24rem),
    linear-gradient(135deg, #080b0e 0%, #10161b 55%, #07090b 100%);
  box-shadow: 0 24px 58px rgba(7, 10, 13, 0.15);

  &::after {
    content: "";
    position: absolute;
    inset: auto -80px -120px auto;
    width: 330px;
    height: 330px;
    border: 1px solid rgba(226, 178, 78, 0.12);
    border-radius: 50%;
    box-shadow:
      0 0 0 42px rgba(226, 178, 78, 0.025),
      0 0 0 86px rgba(226, 178, 78, 0.018);
    pointer-events: none;
  }

  @media (max-width: 760px) {
    display: block;
    min-height: 248px;
    border-radius: 20px;
  }
`;

const HeroCopy = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(22px, 4vw, 42px);

  @media (max-width: 760px) {
    min-height: 248px;
    justify-content: flex-start;
    padding: 18px 92px 18px 16px;
  }
`;

const Eyebrow = styled.div`
  margin-bottom: 11px;
  color: var(--gold-bright);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.16em;

  @media (max-width: 760px) {
    margin-bottom: 8px;
    font-size: 0.58rem;
    letter-spacing: 0.13em;
  }
`;

const HeroTitle = styled.h1`
  margin: 0;
  color: #fff;
  font-size: clamp(1.9rem, 4.3vw, 3.25rem);
  font-weight: 900;
  line-height: 1.03;
  letter-spacing: -0.055em;
  word-break: keep-all;

  @media (max-width: 760px) {
    font-size: 1.72rem;
    line-height: 1.04;
  }
`;

const HeroLead = styled.p`
  margin: 11px 0 0;
  max-width: 520px;
  color: rgba(255, 255, 255, 0.68);
  font-size: clamp(0.88rem, 1.7vw, 1rem);
  line-height: 1.65;
  word-break: keep-all;

  @media (max-width: 760px) {
    margin-top: 7px;
    max-width: 100%;
    font-size: 0.7rem;
    line-height: 1.45;
  }
`;

const HeroPriceBlock = styled.div`
  margin-top: clamp(20px, 3vw, 30px);

  @media (max-width: 760px) {
    margin-top: 13px;
  }
`;

const PriceLabel = styled.div`
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
  font-weight: 800;

  @media (max-width: 760px) {
    font-size: 0.64rem;
    line-height: 1.35;
  }
`;

const HeroPrice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 9px;
  margin-top: 7px;
`;

const HeroPriceValue = styled.strong`
  color: #f2c45f;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(2.55rem, 7vw, 5.15rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.055em;

  @media (max-width: 760px) {
    font-size: clamp(2.25rem, 11vw, 3rem);
  }
`;

const Won = styled.span`
  color: #f2c45f;
  font-size: clamp(1.3rem, 3vw, 2rem);
  font-weight: 900;

  @media (max-width: 760px) {
    font-size: 1.15rem;
  }
`;

const ChangeLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  margin-top: 15px;
  color: ${({ $direction }) =>
    $direction === "up"
      ? "#ff6969"
      : $direction === "down"
        ? "#68b7ff"
        : "rgba(255,255,255,.68)"};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.86rem;
  font-weight: 850;

  @media (max-width: 760px) {
    display: grid;
    gap: 4px;
    margin-top: 9px;
    max-width: 100%;
    font-size: 0.63rem;
    line-height: 1.35;
  }
`;

const Source = styled.span`
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.72rem;
  font-weight: 700;

  @media (max-width: 760px) {
    font-size: 0.58rem;
  }
`;

const GoldVisual = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  min-height: 282px;
  padding: 22px;
  background:
    linear-gradient(115deg, transparent 0 42%, rgba(255,255,255,.025) 42% 43%, transparent 43%),
    radial-gradient(circle at 50% 70%, rgba(236, 184, 73, 0.15), transparent 45%);

  @media (max-width: 760px) {
    position: absolute;
    right: 5px;
    bottom: 9px;
    width: 82px;
    height: 108px;
    min-height: 0;
    padding: 0;
    background: radial-gradient(circle at 50% 70%, rgba(236, 184, 73, 0.1), transparent 62%);
    pointer-events: none;
  }
`;

const GoldBar = styled.div`
  position: relative;
  width: clamp(138px, 20vw, 198px);
  aspect-ratio: 0.67;
  border: 1px solid #ffd978;
  border-radius: 22px;
  transform: rotate(7deg);
  background:
    linear-gradient(116deg, rgba(255,255,255,.58) 0 6%, transparent 11% 58%, rgba(255,255,255,.24) 68%, transparent 78%),
    linear-gradient(145deg, #f7da83 0%, #d79b2f 28%, #f4c965 55%, #b87213 100%);
  box-shadow:
    inset 0 0 0 5px rgba(116, 65, 5, 0.18),
    inset 0 0 0 7px rgba(255, 245, 189, 0.55),
    20px 28px 42px rgba(0, 0, 0, 0.42),
    0 0 50px rgba(222, 167, 54, 0.13);

  &::after {
    content: "";
    position: absolute;
    left: 14%;
    right: 14%;
    bottom: -22px;
    height: 18px;
    border-radius: 50%;
    background: rgba(220, 163, 55, 0.23);
    filter: blur(9px);
  }

  @media (max-width: 760px) {
    width: 58px;
    border-radius: 11px;
    transform: rotate(9deg);
    box-shadow:
      inset 0 0 0 2px rgba(116, 65, 5, 0.18),
      inset 0 0 0 4px rgba(255, 245, 189, 0.55),
      8px 12px 20px rgba(0, 0, 0, 0.36),
      0 0 24px rgba(222, 167, 54, 0.1);
  }
`;

const BarInner = styled.div`
  position: absolute;
  inset: 16%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-top: 1px solid rgba(112, 65, 7, 0.45);
  border-bottom: 1px solid rgba(112, 65, 7, 0.4);
  color: #744409;
  text-align: center;
  text-shadow: 0 1px rgba(255, 244, 183, 0.7);

  strong {
    font-family: Georgia, serif;
    font-size: clamp(1.7rem, 3.2vw, 2.4rem);
    letter-spacing: 0.04em;
  }

  span {
    margin-top: 12px;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.75rem;
    font-weight: 850;
    line-height: 1.65;
  }

  @media (max-width: 760px) {
    inset: 14%;

    strong {
      font-size: 0.92rem;
    }

    span {
      margin-top: 5px;
      font-size: 0.42rem;
      line-height: 1.45;
    }
  }
`;

const Section = styled.section`
  padding: clamp(30px, 5vw, 52px) 0 0;

  @media (max-width: 760px) {
    padding-top: 24px;
  }
`;

const SectionHead = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;

  @media (max-width: 620px) {
    align-items: start;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 11px;
  }
`;

const SectionKicker = styled.div`
  margin-bottom: 5px;
  color: var(--gold);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.14em;
`;

const SectionTitle = styled.h2`
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.45rem, 3.5vw, 2.25rem);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.04em;

  @media (max-width: 760px) {
    font-size: 1.55rem;
  }
`;

const SectionNote = styled.p`
  margin: 0;
  color: #777d83;
  font-size: 0.78rem;
  line-height: 1.55;
  word-break: keep-all;

  @media (max-width: 760px) {
    font-size: 0.66rem;
    line-height: 1.4;
  }
`;

const PriceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    display: none;
  }
`;

const PriceCard = styled.article`
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(14, 18, 22, 0.055);

  @media (max-width: 760px) {
    border-radius: 13px;
    box-shadow: 0 7px 18px rgba(14, 18, 22, 0.045);
  }
`;

const MetalHead = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 102px;
  padding: 20px;
  color: ${({ $dark }) => ($dark ? "#fff" : "#17191b")};
  background: ${({ $metal }) =>
    $metal === "pure"
      ? "linear-gradient(135deg, #12171b, #050709)"
      : $metal === "18k"
        ? "linear-gradient(135deg, #e7bfa2, #c8875d)"
        : "linear-gradient(135deg, #dedede, #a9abad)"};

  @media (max-width: 760px) {
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    min-height: 56px;
    padding: 7px 3px;
    text-align: center;
  }
`;

const MetalBadge = styled.div`
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 1px solid ${({ $dark }) => ($dark ? "#d7a53c" : "rgba(25,25,25,.35)")};
  clip-path: polygon(25% 7%, 75% 7%, 96% 50%, 75% 93%, 25% 93%, 4% 50%);
  color: ${({ $dark }) => ($dark ? "#efc45e" : "#4d3423")};
  font-family: Georgia, serif;
  font-size: 1.05rem;
  font-weight: 800;

  @media (max-width: 760px) {
    width: 25px;
    height: 25px;
    font-size: 0.58rem;
  }
`;

const MetalName = styled.strong`
  display: block;
  font-size: 1.15rem;
  line-height: 1.1;

  @media (max-width: 760px) {
    font-size: clamp(0.62rem, 2.9vw, 0.72rem);
    line-height: 1.15;
    white-space: normal;
    word-break: keep-all;
  }
`;

const MetalPurity = styled.span`
  display: block;
  margin-top: 5px;
  opacity: 0.72;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.73rem;
  font-weight: 750;

  @media (max-width: 760px) {
    display: none;
  }
`;

const CardBody = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const CardMetric = styled.div`
  min-width: 0;
  padding: 20px 16px;
  border-left: ${({ $right }) => ($right ? "1px solid var(--line)" : "0")};
  text-align: center;

  span {
    display: block;
    color: #777d83;
    font-size: 0.67rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 7px;
    color: var(--ink);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1.05rem, 2.3vw, 1.42rem);
    font-weight: 900;
    line-height: 1.15;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    padding: 8px 2px;
    border-left: 0;
    border-top: ${({ $right }) => ($right ? "1px solid var(--line)" : "0")};

    span {
      font-size: 0.48rem;
      line-height: 1.25;
    }

    strong {
      min-height: 1.9em;
      margin-top: 4px;
      font-size: clamp(0.62rem, 3.1vw, 0.78rem);
      line-height: 1.18;
      letter-spacing: -0.035em;
      white-space: normal;
      overflow-wrap: anywhere;
    }
  }
`;

const CardChange = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 43px;
  padding: 10px 12px;
  border-top: 1px solid var(--line);
  background: #fbfaf8;
  color: ${({ $direction }) =>
    $direction === "up"
      ? "#d63b3b"
      : $direction === "down"
        ? "#1b6fae"
        : "#777d83"};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.7rem;
  font-weight: 850;

  @media (max-width: 760px) {
    min-height: 42px;
    padding: 6px 3px;
    text-align: center;
    font-size: clamp(0.46rem, 2.2vw, 0.56rem);
    line-height: 1.3;
    white-space: normal;
    overflow-wrap: anywhere;
  }
`;


const MobilePriceMatrix = styled.div`
  display: none;

  @media (max-width: 760px) {
    display: grid;
    grid-template-columns: 52px repeat(3, minmax(0, 1fr));
    overflow: hidden;
    border: 1px solid rgba(12, 17, 22, 0.1);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(14, 18, 22, 0.045);
  }
`;

const MatrixCell = styled.div`
  min-width: 0;
  padding: 10px 5px;
  border-top: ${({ $top }) => ($top ? "0" : "1px solid rgba(12,17,22,.08)")};
  border-left: ${({ $first }) => ($first ? "0" : "1px solid rgba(12,17,22,.08)")};
  background: ${({ $head, $metal }) =>
    $head
      ? $metal === "pure"
        ? "linear-gradient(180deg, #12171b, #080b0e)"
        : $metal === "18k"
          ? "linear-gradient(180deg, #e7bfa2, #d49a74)"
          : $metal === "14k"
            ? "linear-gradient(180deg, #dedede, #b8babc)"
            : "#faf9f6"
      : "#fff"};
  color: ${({ $head, $metal }) =>
    $head && $metal === "pure" ? "#f0c45d" : "#171a1d"};
  text-align: center;

  ${({ $label }) =>
    $label
      ? `
    display: flex;
    align-items: center;
    justify-content: center;
    background: #faf9f6;
    color: #6f757b;
    font-size: .58rem;
    font-weight: 850;
    line-height: 1.25;
  `
      : ""}

  strong {
    display: block;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(0.68rem, 3.25vw, 0.82rem);
    font-weight: 950;
    line-height: 1.25;
    letter-spacing: -0.035em;
    overflow-wrap: anywhere;
  }

  small {
    display: block;
    margin-top: 2px;
    font-size: 0.5rem;
    font-weight: 800;
    line-height: 1.2;
    opacity: 0.72;
  }
`;

const MatrixChange = styled.span`
  display: block;
  color: ${({ $direction }) =>
    $direction === "up"
      ? "#d63b3b"
      : $direction === "down"
        ? "#1b6fae"
        : "#7b8085"};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(0.52rem, 2.4vw, 0.62rem);
  font-weight: 900;
  line-height: 1.25;
`;

const AlertCard = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(250px, 0.8fr);
  gap: clamp(24px, 5vw, 64px);
  overflow: hidden;
  padding: clamp(24px, 5vw, 48px);
  border: 1px solid rgba(199, 148, 48, 0.22);
  border-radius: 24px;
  background:
    radial-gradient(circle at 85% 40%, rgba(212, 159, 53, 0.17), transparent 20rem),
    #fff;
  box-shadow: 0 14px 40px rgba(14, 18, 22, 0.055);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 0;
    padding: 20px 16px 18px;
    border-radius: 18px;
  }
`;

const AlertTitle = styled.h2`
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.55rem, 4vw, 2.65rem);
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -0.045em;
  word-break: keep-all;

  em {
    color: var(--gold);
    font-style: normal;
  }

  @media (max-width: 760px) {
    font-size: 1.55rem;
    line-height: 1.12;
  }
`;

const AlertText = styled.p`
  margin: 12px 0 0;
  max-width: 540px;
  color: #676d72;
  font-size: 0.87rem;
  line-height: 1.65;
  word-break: keep-all;

  @media (max-width: 760px) {
    margin-top: 8px;
    font-size: 0.76rem;
    line-height: 1.55;
  }
`;

const AlertBullets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 18px;

  @media (max-width: 760px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 14px;
  }
`;

const AlertBullet = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #33383d;
  font-size: 0.73rem;
  font-weight: 800;

  svg {
    color: var(--gold);
  }

  @media (max-width: 760px) {
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 8px 3px;
    border-radius: 10px;
    background: #faf8f3;
    text-align: center;
    font-size: 0.55rem;
    line-height: 1.25;

    svg {
      width: 15px;
      height: 15px;
    }
  }
`;

const ActionArea = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 22px;
  max-width: 560px;

  @media (max-width: 760px) {
    margin-top: 14px;
  }
`;

const MainButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 52px;
  padding: 13px 18px;
  border: 1px solid var(--ink);
  border-radius: 12px;
  background: var(--ink);
  color: #fff;
  font-size: 0.91rem;
  font-weight: 900;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    background: #20262b;
    color: #fff;
  }

  &:disabled {
    opacity: 0.72;
    cursor: default;
  }
`;

const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  color: #6f531f;
  font-size: 0.8rem;
  font-weight: 850;
  text-decoration: none;
`;

const ConsentBox = styled.div`
  display: grid;
  gap: 8px;
  padding: 13px 14px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #faf9f6;
`;

const ConsentLabel = styled.label`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    margin: 2px 0 0;
    accent-color: #b98424;
  }

  strong {
    display: block;
    color: var(--ink);
    font-size: 0.83rem;
  }

  small {
    display: block;
    margin-top: 3px;
    color: #73797e;
    font-size: 0.72rem;
    line-height: 1.5;
  }
`;

const ConsentAccepted = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #697076;
  font-size: 0.76rem;
  line-height: 1.5;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
    color: var(--gold);
  }
`;

const Status = styled.p`
  margin: 0;
  color: ${({ $error, theme }) =>
    $error
      ? theme.semantic?.alertErrorText || theme.colors.error
      : theme.colors.textSecondary};
  font-size: 0.78rem;
  line-height: 1.55;
  text-align: center;
  word-break: keep-all;
`;

const Phone = styled.div`
  position: relative;
  align-self: end;
  width: min(100%, 286px);
  min-height: 330px;
  margin: 0 auto -68px;
  padding: 17px 12px;
  border: 7px solid #0b0e11;
  border-radius: 38px;
  background:
    radial-gradient(circle at 50% 18%, rgba(232, 185, 83, 0.18), transparent 10rem),
    linear-gradient(180deg, #151b21, #080b0e);
  box-shadow: 0 20px 42px rgba(14, 18, 22, 0.21);

  &::before {
    content: "";
    display: block;
    width: 78px;
    height: 19px;
    margin: -6px auto 24px;
    border-radius: 0 0 12px 12px;
    background: #020304;
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

const PhoneTime = styled.div`
  color: #fff;
  text-align: center;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 2.15rem;
  font-weight: 350;

  @media (max-width: 760px) {
    font-size: 1.45rem;
  }
`;

const PhoneDate = styled.div`
  margin-top: 3px;
  color: rgba(255,255,255,.57);
  text-align: center;
  font-size: 0.68rem;

  @media (max-width: 760px) {
    font-size: 0.6rem;
  }
`;

const PushPreview = styled.div`
  margin-top: 56px;
  padding: 13px 14px;
  border: 1px solid rgba(255,255,255,.62);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 30px rgba(0,0,0,.2);

  @media (max-width: 760px) {
    margin-top: 14px;
    padding: 11px 12px;
    border-radius: 14px;
  }
`;

const PushHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303338;
  font-size: 0.7rem;
  font-weight: 900;
`;

const PushIcon = styled.div`
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 8px;
  background: #11161a;
  color: #e3af4a;
`;

const PushBody = styled.div`
  margin-top: 8px;
  color: #15181b;
  font-size: 0.72rem;
  line-height: 1.5;

  strong {
    display: block;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.83rem;
  }
`;


const MobileAlertPreview = styled.div`
  display: none;

  @media (max-width: 760px) {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 9px;
    align-items: center;
    margin-top: 14px;
    padding: 10px 11px;
    border: 1px solid rgba(199, 148, 48, 0.2);
    border-radius: 12px;
    background: linear-gradient(135deg, #fffaf0, #fff);
    box-shadow: 0 7px 18px rgba(14, 18, 22, 0.04);

    .icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: #11161a;
      color: #e4b758;
    }

    strong {
      display: block;
      color: #191d20;
      font-size: 0.7rem;
      line-height: 1.25;
    }

    span {
      display: block;
      margin-top: 2px;
      color: #747a80;
      font-size: 0.58rem;
      line-height: 1.35;
    }

    b {
      color: #b57c1e;
      font-family: ${({ theme }) => theme.fonts.numeric};
      font-size: 0.7rem;
      white-space: nowrap;
    }
  }
`;

const RewardCard = styled.div`
  position: relative;
  overflow: hidden;
  padding: clamp(24px, 5vw, 44px);
  border-radius: 24px;
  background:
    radial-gradient(circle at 88% 20%, rgba(228,183,88,.18), transparent 20rem),
    linear-gradient(135deg, #080b0e, #171d23);
  color: #fff;
  box-shadow: 0 18px 44px rgba(8, 11, 14, 0.14);

  @media (max-width: 760px) {
    padding: 19px 14px 15px;
    border-radius: 18px;
  }
`;

const RewardTop = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 680px) {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
`;

const RewardTitle = styled.h2`
  margin: 0;
  color: #fff;
  font-size: clamp(1.55rem, 4vw, 2.7rem);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.045em;

  span {
    color: #f1bd55;
  }

  @media (max-width: 760px) {
    font-size: 1.35rem;
    line-height: 1.12;
  }
`;

const RewardLead = styled.p`
  margin: 10px 0 0;
  color: rgba(255,255,255,.62);
  font-size: 0.8rem;
  line-height: 1.6;

  @media (max-width: 760px) {
    margin-top: 7px;
    font-size: 0.68rem;
    line-height: 1.45;
  }
`;

const QuizButton = styled(Link)`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 45px;
  padding: 0 18px;
  border: 1px solid #efbd55;
  border-radius: 999px;
  background: #efbd55;
  color: #16120b;
  font-size: 0.8rem;
  font-weight: 900;
  text-decoration: none;

  &:hover {
    color: #16120b;
  }

  @media (max-width: 760px) {
    min-height: 40px;
    padding: 0 14px;
    font-size: 0.73rem;
  }
`;

const RewardSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 26px;

  @media (max-width: 680px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
    margin-top: 13px;
  }
`;

const RewardStep = styled.div`
  position: relative;
  padding: 18px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  background: rgba(255,255,255,.055);

  small {
    display: block;
    color: rgba(255,255,255,.48);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.65rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 0.9rem;
  }

  span {
    display: block;
    margin-top: 5px;
    color: #efbd55;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.82rem;
    font-weight: 900;
  }

  @media (max-width: 680px) {
    min-width: 0;
    min-height: 86px;
    padding: 9px 3px;
    border-radius: 11px;
    text-align: center;

    small {
      font-size: 0.44rem;
      line-height: 1.2;
      letter-spacing: -0.02em;
      white-space: normal;
    }

    strong {
      margin-top: 5px;
      font-size: clamp(0.58rem, 2.7vw, 0.67rem);
      line-height: 1.2;
      white-space: normal;
      word-break: keep-all;
    }

    span {
      margin-top: 4px;
      font-size: clamp(0.52rem, 2.5vw, 0.6rem);
      line-height: 1.25;
      white-space: normal;
      word-break: keep-all;
    }
  }
`;

const CrossLink = styled(Link)`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  margin-top: 20px;
  padding: clamp(24px, 4vw, 34px);
  overflow: hidden;
  border: 1px solid rgba(225, 176, 75, 0.42);
  border-radius: 20px;
  background:
    radial-gradient(circle at 90% 18%, rgba(232, 183, 78, 0.2), transparent 14rem),
    linear-gradient(135deg, #090d11, #171d23);
  color: #fff;
  text-decoration: none;
  box-shadow: 0 18px 38px rgba(8, 11, 14, 0.13);

  &::after {
    content: "";
    position: absolute;
    right: -42px;
    bottom: -70px;
    width: 210px;
    height: 210px;
    border: 1px solid rgba(239, 189, 85, 0.13);
    border-radius: 50%;
    pointer-events: none;
  }

  .gold-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #efbd55;
    font-size: 0.78rem;
    font-weight: 950;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: clamp(1.35rem, 3vw, 1.78rem);
    font-weight: 950;
    line-height: 1.28;
    letter-spacing: -0.035em;
    word-break: keep-all;
  }

  p {
    max-width: 760px;
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: clamp(0.84rem, 1.6vw, 0.96rem);
    line-height: 1.7;
    word-break: keep-all;
  }

  .gold-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    margin-top: 15px;
    padding: 0 15px;
    border: 1px solid rgba(239, 189, 85, 0.58);
    border-radius: 999px;
    background: rgba(239, 189, 85, 0.12);
    color: #efbd55;
    font-size: 0.86rem;
    font-weight: 950;
  }

  > svg {
    position: relative;
    z-index: 1;
    flex: 0 0 auto;
    width: 27px;
    height: 27px;
    color: #efbd55;
  }

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    padding: 19px 16px;

    strong {
      font-size: 1.18rem;
    }

    p {
      margin-top: 7px;
      font-size: 0.73rem;
      line-height: 1.55;
    }

    .gold-action {
      min-height: 38px;
      margin-top: 12px;
      padding: 0 12px;
      font-size: 0.72rem;
    }

    > svg {
      position: absolute;
      right: 18px;
      top: 22px;
      width: 21px;
      height: 21px;
    }
  }
`;

const Footnote = styled.p`
  margin: 15px 0 0;
  color: #8a8f94;
  text-align: center;
  font-size: 0.66rem;
  line-height: 1.5;
`;

function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return window.Notification.permission;
}

function detectBrowserName() {
  if (typeof navigator === "undefined") return "현재 브라우저";

  const ua = String(navigator.userAgent || "");

  if (/SamsungBrowser/i.test(ua)) return "삼성인터넷";
  if (/EdgA|EdgiOS|Edg\//i.test(ua)) return "Microsoft Edge";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS|Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";

  return "현재 브라우저";
}

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.round(number).toLocaleString("ko-KR")
    : "-";
}

function formatDateKey(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return text || "-";
  return `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`;
}

function getKoreaTodayDateKey() {
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

  return `${values.year}${values.month}${values.day}`;
}

function validPrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function changeInfo(current, previous) {
  if (!validPrice(current) || !validPrice(previous)) return null;

  const diff = Number(current) - Number(previous);
  const percent = (diff / Number(previous)) * 100;

  return {
    diff,
    percent,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
  };
}

function changeText(change) {
  if (!change) return "전일 비교 없음";
  if (change.diff === 0) return "－ 보합";

  const arrow = change.diff > 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(change.diff).toLocaleString("ko-KR")}원 · ${Math.abs(
    change.percent
  ).toFixed(2)}%`;
}

function compactChangeText(change) {
  if (!change) return "-";
  if (change.diff === 0) return "보합";
  const arrow = change.diff > 0 ? "▲" : "▼";
  return `${arrow}${Math.abs(change.percent).toFixed(2)}%`;
}

export default function GoldPrice() {
  const navigate = useNavigate();
  const { user, isEmailVerified } = useAuthContext();

  const [pushStatus, setPushStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [marketingNotificationsEnabled, setMarketingNotificationsEnabled] =
    useState(false);
  const [marketingFcmBrowser, setMarketingFcmBrowser] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const [goldData, setGoldData] = useState(null);
  const [goldEnabled, setGoldEnabled] = useState(false);
  const [goldLoading, setGoldLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [display14kSellPrice, setDisplay14kSellPrice] = useState(false);

  const currentBrowserName = detectBrowserName();
  const isMember = !!user?.uid && user.isAnonymous !== true;
  const registerPath = "/register?from=gold-price";
  const loginState = useMemo(() => ({ from: "/gold-price" }), []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "오늘의 금시세 | 한국골드마켓";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // GoldPriceBoard는 랜딩페이지 등에서 그대로 사용합니다.
  // 이 전용 페이지는 동일한 공개 시세 문서를 읽어 별도 UI로 표현합니다.
  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPrices", "current"),
        (snapshot) => {
          setGoldData(snapshot.exists() ? snapshot.data() : null);
          setGoldLoading(false);
        },
        (error) => {
          console.warn(
            "[GoldPrice] 시세 조회 실패:",
            error?.message || error
          );
          setGoldLoading(false);
        }
      ),
    []
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPricePublic", "config"),
        (snapshot) => {
          const config = snapshot.exists() ? snapshot.data() : {};
          setGoldEnabled(config.enabled === true);
          setDisplay14kSellPrice(config.display14kSellPrice === true);
          setConfigLoading(false);
        },
        (error) => {
          console.warn(
            "[GoldPrice] 공개 설정 조회 실패:",
            error?.message || error
          );
          setGoldEnabled(false);
          setConfigLoading(false);
        }
      ),
    []
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMessage("");

      if (!isMember) {
        if (!cancelled) {
          setMarketingAccepted(false);
          setMarketingNotificationsEnabled(false);
          setConsentChecked(false);
          setPushStatus("guest");
        }
        return;
      }

      if (!isEmailVerified) {
        if (!cancelled) setPushStatus("ready");
        return;
      }

      const permission = getNotificationPermission();

      try {
        const preferences = await getNotificationPreferences(user.uid);

        let localToken = "";
        let localTokenUid = "";
        if (typeof window !== "undefined") {
          try {
            localToken = window.localStorage.getItem("fcmToken") || "";
            localTokenUid =
              window.localStorage.getItem("fcmTokenUid") || "";
          } catch {
            localToken = "";
            localTokenUid = "";
          }
        }

        const currentBrowserIsTarget =
          !!localToken &&
          localTokenUid === user.uid &&
          !!preferences.marketingFcmToken &&
          preferences.marketingFcmToken === localToken;

        if (!cancelled) {
          setMarketingAccepted(preferences.marketingAccepted === true);
          setMarketingNotificationsEnabled(
            preferences.marketingNotificationsEnabled === true
          );
          setMarketingFcmBrowser(preferences.marketingFcmBrowser || "");
          setConsentChecked(preferences.marketingAccepted === true);

          if (permission === "unsupported") {
            setPushStatus("unsupported");
          } else if (permission === "denied") {
            setPushStatus("denied");
          } else {
            setPushStatus(
              permission === "granted" &&
                preferences.marketingNotificationsEnabled === true &&
                currentBrowserIsTarget
                ? "active"
                : "ready"
            );
          }
        }
      } catch {
        if (!cancelled) {
          setPushStatus(
            permission === "unsupported"
              ? "unsupported"
              : permission === "denied"
                ? "denied"
                : "ready"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEmailVerified, isMember, user?.uid]);

  const marketRows = useMemo(() => {
    const market = goldData?.market || {};
    const previous = goldData?.previousMarket || {};

    return [
      {
        label: "순금 (24K)",
        short: "24K",
        purity: "GOLD 999.9",
        metal: "pure",
        dark: true,
        sellKey: "pureGoldSellPerDon",
        sell: market.pureGoldSellPerDon,
        buy: market.pureGoldBuyPerDon,
        previousSell: previous.pureGoldSellPerDon,
      },
      {
        label: "18K",
        short: "18K",
        purity: "GOLD 75.0%",
        metal: "18k",
        dark: false,
        sellKey: "gold18kSellPerDon",
        sell: market.gold18kSellPerDon,
        buy: market.gold18kBuyPerDon,
        previousSell: previous.gold18kSellPerDon,
      },
      {
        label: "14K",
        short: "14K",
        purity: "GOLD 58.5%",
        metal: "14k",
        dark: false,
        sellKey: "gold14kSellPerDon",
        sell: market.gold14kSellPerDon,
        buy: market.gold14kBuyPerDon,
        previousSell: previous.gold14kSellPerDon,
      },
    ];
  }, [goldData]);

  const pureRow = marketRows[0];
  const heroChange = changeInfo(pureRow?.sell, pureRow?.previousSell);
  const referenceDate = formatDateKey(
    goldData?.sourceDate || getKoreaTodayDateKey()
  );
  const pagePriceAvailable =
    !configLoading && goldEnabled && !goldLoading && !!goldData;

  const enableGoldPricePush = async () => {
    if (!isMember) {
      navigate(registerPath, {
        state: {
          from: "/gold-price",
          intent: "gold-price-notification",
        },
      });
      return;
    }

    if (!isEmailVerified) {
      navigate("/verify-email?continueUrl=%2Fgold-price", {
        state: { from: "/gold-price" },
      });
      return;
    }

    if (!marketingAccepted && !consentChecked) {
      setMessage(
        "금시세 알림을 받으려면 광고성 정보 수신동의(선택)를 확인해 주세요."
      );
      return;
    }

    const permission = getNotificationPermission();

    if (permission === "unsupported") {
      setPushStatus("unsupported");
      return;
    }

    if (permission === "denied") {
      setPushStatus("denied");
      setMessage(
        "브라우저 설정에서 한국골드마켓 알림 권한을 허용한 뒤 다시 시도해 주세요."
      );
      return;
    }

    setPushStatus("enabling");
    setMessage("");

    try {
      const token = await registerForPush(user.uid);

      if (!token) {
        const currentPermission = getNotificationPermission();

        if (currentPermission === "denied") {
          setPushStatus("denied");
          setMessage(
            "알림 권한이 차단되어 있습니다. 브라우저 사이트 설정에서 알림을 허용해 주세요."
          );
        } else {
          setPushStatus("error");
          setMessage(
            "이 기기에서 푸시 알림을 등록하지 못했습니다. 브라우저 알림 지원 여부를 확인해 주세요."
          );
        }
        return;
      }

      const saved = await saveMarketingNotificationConsent(user.uid, true);

      const target = await saveMarketingPushTarget(
        user.uid,
        token,
        currentBrowserName
      );

      setMarketingAccepted(saved.marketingAccepted === true);
      setMarketingNotificationsEnabled(
        saved.marketingNotificationsEnabled === true
      );
      setMarketingFcmBrowser(
        target.marketingFcmBrowser || currentBrowserName
      );
      setConsentChecked(true);

      setPushStatus("active");
      setMessage(
        `${currentBrowserName}에서 금시세·소식·혜택 알림을 받도록 설정했습니다.`
      );
    } catch (error) {
      console.error("[GoldPrice] push enable failed:", error);
      setPushStatus("error");
      setMessage(error?.message || "알림 설정 중 오류가 발생했습니다.");
    }
  };

  const notificationActive =
    pushStatus === "active" ||
    (isEmailVerified &&
      marketingAccepted &&
      marketingNotificationsEnabled);

  return (
    <Page>
      <Shell>
        <Hero>
          <HeroCard>
            <HeroCopy>
              <Eyebrow>TODAY&apos;S GOLD · KOREA GOLD MARKET</Eyebrow>
              <HeroTitle>오늘의 금시세</HeroTitle>
              <HeroLead>
                오늘의 금시세를 확인하고, 주요 변동은 알림으로 받아보세요.
              </HeroLead>

              <HeroPriceBlock>
                <PriceLabel>순금(24K) 내가 살 때 · 1돈(3.75g)</PriceLabel>
                <HeroPrice>
                  <HeroPriceValue>
                    {pagePriceAvailable ? formatWon(pureRow?.sell) : "-"}
                  </HeroPriceValue>
                  <Won>원</Won>
                </HeroPrice>

                <ChangeLine $direction={heroChange?.direction}>
                  <span>
                    {pagePriceAvailable
                      ? changeText(heroChange)
                      : configLoading || goldLoading
                        ? "시세 확인 중"
                        : "관리자 공개 후 표시"}
                  </span>
                  <Source>기준일 {referenceDate} · VAT 포함</Source>
                </ChangeLine>
              </HeroPriceBlock>
            </HeroCopy>

            <GoldVisual aria-hidden>
              <GoldBar>
                <BarInner>
                  <strong>KGM</strong>
                  <span>
                    FINE GOLD
                    <br />
                    999.9
                    <br />
                    3.75g
                  </span>
                </BarInner>
              </GoldBar>
            </GoldVisual>
          </HeroCard>
        </Hero>

        <Section aria-labelledby="live-gold-price-title">
          <SectionHead>
            <div>
              <SectionKicker>LIVE PRICE</SectionKicker>
              <SectionTitle id="live-gold-price-title">
                지금 금시세
              </SectionTitle>
            </div>
            <SectionNote>
              1돈(3.75g) 기준 · 내가 살 때 VAT 포함 · 단위 원
            </SectionNote>
          </SectionHead>

          <PriceGrid>
            {marketRows.map((row) => {
              const sellChange = changeInfo(row.sell, row.previousSell);
              const showProductText =
                row.sellKey === "gold14kSellPerDon" &&
                !display14kSellPrice;

              return (
                <PriceCard key={row.short}>
                  <MetalHead
                    $metal={row.metal}
                    $dark={row.dark}
                  >
                    <MetalBadge $dark={row.dark}>{row.short}</MetalBadge>
                    <div>
                      <MetalName>{row.label}</MetalName>
                      <MetalPurity>{row.purity}</MetalPurity>
                    </div>
                  </MetalHead>

                  <CardBody>
                    <CardMetric>
                      <span>살 때</span>
                      <strong>
                        {!pagePriceAvailable
                          ? "-"
                          : showProductText
                            ? "제품 시세 적용"
                            : formatWon(row.sell)}
                      </strong>
                    </CardMetric>
                    <CardMetric $right>
                      <span>팔 때</span>
                      <strong>
                        {pagePriceAvailable ? formatWon(row.buy) : "-"}
                      </strong>
                    </CardMetric>
                  </CardBody>

                  <CardChange $direction={sellChange?.direction}>
                    {pagePriceAvailable && !showProductText
                      ? `전일 대비 ${changeText(sellChange)}`
                      : showProductText
                        ? "14K 제품은 공임을 별도 확인합니다."
                        : "시세 확인 중"}
                  </CardChange>
                </PriceCard>
              );
            })}
          </PriceGrid>

          <MobilePriceMatrix aria-label="모바일 금시세 요약">
            <MatrixCell $top $first $head />
            {marketRows.map((row) => (
              <MatrixCell
                key={`head-${row.short}`}
                $top
                $head
                $metal={row.metal}
              >
                <strong>{row.short}</strong>
                <small>{row.short === "24K" ? "순금" : row.label}</small>
              </MatrixCell>
            ))}

            <MatrixCell $first $label>살 때</MatrixCell>
            {marketRows.map((row) => {
              const showProductText =
                row.sellKey === "gold14kSellPerDon" &&
                !display14kSellPrice;
              return (
                <MatrixCell key={`sell-${row.short}`}>
                  <strong>
                    {!pagePriceAvailable
                      ? "-"
                      : showProductText
                        ? "제품 시세"
                        : formatWon(row.sell)}
                  </strong>
                </MatrixCell>
              );
            })}

            <MatrixCell $first $label>팔 때</MatrixCell>
            {marketRows.map((row) => (
              <MatrixCell key={`buy-${row.short}`}>
                <strong>
                  {pagePriceAvailable ? formatWon(row.buy) : "-"}
                </strong>
              </MatrixCell>
            ))}

            <MatrixCell $first $label>전일</MatrixCell>
            {marketRows.map((row) => {
              const sellChange = changeInfo(row.sell, row.previousSell);
              const showProductText =
                row.sellKey === "gold14kSellPerDon" &&
                !display14kSellPrice;
              return (
                <MatrixCell key={`change-${row.short}`}>
                  <MatrixChange $direction={sellChange?.direction}>
                    {pagePriceAvailable && !showProductText
                      ? compactChangeText(sellChange)
                      : showProductText
                        ? "제품별"
                        : "-"}
                  </MatrixChange>
                </MatrixCell>
              );
            })}
          </MobilePriceMatrix>
        </Section>

        <Section aria-labelledby="gold-price-alert-title">
          <AlertCard>
            <div>
              <SectionKicker>GOLD ALERT</SectionKicker>
              <AlertTitle id="gold-price-alert-title">
                금시세, 이제 <em>알림으로</em> 받아보세요.
              </AlertTitle>
              <AlertText>
                매번 검색하지 않아도 됩니다. 주요 시세 변동과
                한국골드마켓의 혜택을 현재 기기로 알려드립니다.
              </AlertText>

              <AlertBullets>
                <AlertBullet>
                  <BellRing size={15} aria-hidden />
                  주요 금시세 변동 알림
                </AlertBullet>
                <AlertBullet>
                  <CheckCircle2 size={15} aria-hidden />
                  금시세 확인은 회원가입 없이
                </AlertBullet>
                <AlertBullet>
                  <ShieldCheck size={15} aria-hidden />
                  알림 설정 시 순금 0.01g 추가 혜택
                </AlertBullet>
              </AlertBullets>

              <MobileAlertPreview aria-label="금시세 알림 예시">
                <div className="icon">
                  <BellRing size={15} aria-hidden />
                </div>
                <div>
                  <strong>한국골드마켓 · 금시세 업데이트</strong>
                  <span>주요 시세 변동을 현재 기기로 알려드립니다.</span>
                </div>
                <b>
                  {pagePriceAvailable
                    ? `${formatWon(pureRow?.sell)}원`
                    : "확인 중"}
                </b>
              </MobileAlertPreview>

              <ActionArea>
                {pushStatus === "guest" ? (
                  <>
                    <MainButton
                      as={Link}
                      to={registerPath}
                      state={{
                        from: "/gold-price",
                        intent: "gold-price-notification",
                      }}
                    >
                      회원가입하고 순금 0.01g 받기
                      <ArrowRight size={18} aria-hidden />
                    </MainButton>

                    <SecondaryLink
                      to="/login?from=gold-price"
                      state={loginState}
                    >
                      <LogIn size={15} aria-hidden />
                      이미 회원이라면 로그인
                    </SecondaryLink>
                  </>
                ) : notificationActive ? (
                  <>
                    <MainButton type="button" disabled>
                      <CheckCircle2 size={18} aria-hidden />
                      금시세 알림을 받고 있습니다
                    </MainButton>
                    <Status>
                      {message ||
                        (marketingFcmBrowser
                          ? `${marketingFcmBrowser}에서 금시세 알림을 받고 있습니다.`
                          : "금시세 알림이 켜져 있습니다.")}
                    </Status>
                    <SecondaryLink to="/settings">
                      알림 설정 관리
                    </SecondaryLink>
                  </>
                ) : (
                  <>
                    {isEmailVerified && (
                      <ConsentBox>
                        {marketingAccepted ? (
                          <ConsentAccepted>
                            <CheckCircle2 size={16} aria-hidden />
                            <span>
                              광고성 정보 수신동의가 확인되어 있습니다.
                              {marketingNotificationsEnabled
                                ? marketingFcmBrowser
                                  ? ` 현재 ${marketingFcmBrowser}로 알림을 받고 있습니다.`
                                  : " 대표 수신 브라우저를 선택해 주세요."
                                : " 아래 버튼을 누르면 금시세·소식·혜택 알림을 다시 활성화할 수 있습니다."}
                            </span>
                          </ConsentAccepted>
                        ) : (
                          <ConsentLabel>
                            <input
                              type="checkbox"
                              checked={consentChecked}
                              onChange={(event) =>
                                setConsentChecked(event.target.checked)
                              }
                            />
                            <span>
                              <strong>금시세 알림 받기</strong>
                              <small>
                                주요 시세 변동·혜택 알림 · 광고성 정보
                                수신동의(선택)
                              </small>
                            </span>
                          </ConsentLabel>
                        )}
                      </ConsentBox>
                    )}

                    <MainButton
                      type="button"
                      onClick={enableGoldPricePush}
                      disabled={
                        pushStatus === "checking" ||
                        pushStatus === "enabling"
                      }
                    >
                      <BellRing size={18} aria-hidden />
                      {pushStatus === "checking"
                        ? "알림 상태 확인 중…"
                        : pushStatus === "enabling"
                          ? "알림 설정 중…"
                          : !isEmailVerified
                            ? "이메일 인증 후 금시세 알림 받기"
                            : "금시세 알림 받고 순금 0.01g 더 받기"}
                    </MainButton>

                    {pushStatus === "denied" && (
                      <Status $error>
                        알림이 차단되어 있습니다. 브라우저의 사이트
                        설정에서 알림 권한을 허용해 주세요.
                      </Status>
                    )}

                    {pushStatus === "unsupported" && (
                      <Status $error>
                        현재 브라우저에서는 웹 푸시 알림을 사용할 수
                        없습니다.
                      </Status>
                    )}

                    {(pushStatus === "error" || message) &&
                      pushStatus !== "denied" && (
                        <Status $error={pushStatus === "error"}>
                          {message}
                        </Status>
                      )}
                  </>
                )}
              </ActionArea>
            </div>

            <Phone aria-label="금시세 알림 미리보기">
              <PhoneTime>11:35</PhoneTime>
              <PhoneDate>한국골드마켓 알림 미리보기</PhoneDate>
              <PushPreview>
                <PushHead>
                  <PushIcon>
                    <BellRing size={14} aria-hidden />
                  </PushIcon>
                  한국골드마켓
                </PushHead>
                <PushBody>
                  금시세가 업데이트되었습니다.
                  <strong>
                    순금(24K){" "}
                    {pagePriceAvailable
                      ? `${formatWon(pureRow?.sell)}원`
                      : "시세 확인 중"}
                  </strong>
                </PushBody>
              </PushPreview>
            </Phone>
          </AlertCard>
        </Section>

        <Section aria-labelledby="gold-benefit-title">
          <RewardCard>
            <RewardTop>
              <div>
                <SectionKicker>MEMBER BENEFIT</SectionKicker>
                <RewardTitle id="gold-benefit-title">
                  퀵퀴즈 참여하고 <span>최대 순금 0.03g 받기</span>
                </RewardTitle>
                <RewardLead>
                  회원가입 + 퀵퀴즈 + 금시세 알림까지 참여하면
                  최대 순금 0.03g 혜택을 받을 수 있습니다.
                </RewardLead>
              </div>

              <QuizButton to="/quiz/gold-bonus">
                퀵퀴즈 참여하기
                <ArrowRight size={15} aria-hidden />
              </QuizButton>
            </RewardTop>

            <RewardSteps>
              <RewardStep>
                <small>01</small>
                <strong>회원가입</strong>
                <span>순금 0.01g</span>
              </RewardStep>
              <RewardStep>
                <small>02</small>
                <strong>퀵퀴즈 풀기</strong>
                <span>+ 순금 0.01g</span>
              </RewardStep>
              <RewardStep>
                <small>03</small>
                <strong>금시세 알림</strong>
                <span>
                  {notificationActive
                    ? "알림 수신 중"
                    : "+ 순금 0.01g"}
                </span>
              </RewardStep>
            </RewardSteps>
          </RewardCard>

        </Section>

        <Section aria-label="GOLD TO GOLD 안내">
          <CrossLink to="/gold-exchange" aria-label="GOLD TO GOLD 하러가기">
            <div>
              <span className="gold-kicker">GOLD TO GOLD</span>
              <strong>쓰지 않는 금, 다시 가치로.</strong>
              <p>
                한쪽만 남은 귀걸이 · 끊어진 목걸이 · 오래 보관한 돌반지까지.
                보유한 금을 확인하고 999.9 골드바로 이어보세요.
              </p>
              <span className="gold-action">
                999.9 골드바로 가치 저장하기
              </span>
            </div>
            <ArrowRight size={22} aria-hidden />
          </CrossLink>

          <Footnote>
            금시세는 시장 상황에 따라 변경될 수 있으며, 실제 거래
            시점의 시세와 다를 수 있습니다.
          </Footnote>
        </Section>
      </Shell>
    </Page>
  );
}
