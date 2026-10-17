import styled from "styled-components";
import LivingGoldCompanion from "@/components/common/LivingGoldCompanion";
import { Link } from "react-router-dom";

export const Page = styled.div`
--gold:#AC8950; --gold-bright:#dcc695; --gold-soft:#F2EBDD; --ink:#29443C; --ink-soft:#355849; --cream:#FAF9F6; --line:#DFE6DF;
      width:100%; padding:12px 0 40px; color:var(--gm-text); background:transparent;
`;

export const Shell = styled.div`
width:100%; max-width:1200px; margin:0 auto;
`;

export const Hero = styled.section`
padding:0 0 20px;
`;

export const HeroCard = styled.div`
position:relative; display:grid; grid-template-columns:1.15fr .85fr; min-height:340px; overflow:hidden;
  border:1px solid #DCCCAA; border-radius:22px;
  background:linear-gradient(130deg,#F5EDDB 0%,#E8D7B5 68%,#D9C6A0 100%);
  box-shadow:0 16px 40px rgba(98,80,49,.1);
      @media(max-width:760px) { display:block; min-height:270px; }
`;

export const HeroCopy = styled.div`
position:relative; z-index:2; display:flex; flex-direction:column; justify-content:center; padding:clamp(26px,4vw,48px);
      @media(max-width:760px) { min-height:270px; padding:28px 24px; }
`;

export const Eyebrow = styled.div`
  margin-bottom: 7px;
  color: #755322;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.16em;

  @media (max-width: 760px) {
    margin-bottom: 6px;
    font-size: 0.62rem;
    letter-spacing: 0.13em;
  }
`;

export const HeroTitle = styled.h1`
margin:0; color:#29443C; font-family:inherit; font-size:clamp(28px,3vw,40px); font-weight:500; line-height:1.3; letter-spacing:-.055em;
`;

export const HeroLead = styled.p`
margin:12px 0 0; color:#46574C; font-size:13px; line-height:1.8; max-width:440px;
      @media(max-width:760px) { font-size:12px; max-width:270px; }
`;

export const HeroPriceBlock = styled.div`
  margin-top: clamp(11px, 1.7vw, 16px);

  @media (max-width: 760px) {
    margin-top: 10px;
  }
`;

export const PriceLabel = styled.div`
  color: #506253;
  font-size: 0.75rem;
  font-weight: 800;

  @media (max-width: 760px) {
    font-size: 0.6rem;
    line-height: 1.35;
  }
`;

export const HeroPrice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 9px;
  margin-top: 7px;
`;

export const HeroPriceValue = styled.strong`
color:#213C32; font-family:inherit; font-size:clamp(38px,5.5vw,62px); font-weight:500; font-variant-numeric:tabular-nums; line-height:1.15; letter-spacing:-.055em;
`;

export const Won = styled.span`
  color: #805C25;
  font-size: clamp(1.3rem, 3vw, 2rem);
  font-weight: 900;

  @media (max-width: 760px) {
    font-size: 1.15rem;
  }
`;

export const ChangeLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  margin-top: 9px;
  color: ${({ $direction }) =>
    $direction === "up"
      ? "#AF343F"
      : $direction === "down"
        ? "#2C6185"
        : "#4D5E52"};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.86rem;
  font-weight: 850;

  @media (max-width: 760px) {
    display: grid;
    gap: 4px;
    margin-top: 7px;
    max-width: 100%;
    font-size: 0.63rem;
    line-height: 1.35;
  }
`;

export const Source = styled.span`
  color: #5B685D;
  font-size: 0.72rem;
  font-weight: 700;

  b {
    display: inline-flex;
    align-items: center;
    margin-left: 2px;
    padding: 2px 6px;
    border: 1px solid rgba(122, 87, 39, 0.28);
    border-radius: 999px;
    background: rgba(255, 249, 234, .64);
    color: #694B20;
    font-size: 0.68rem;
    font-weight: 950;
    line-height: 1.2;
    letter-spacing: 0.02em;
  }

  @media (max-width: 760px) {
    font-size: 0.62rem;

    b {
      padding: 1px 5px;
      font-size: 0.62rem;
    }
  }
`;

export const GoldVisual = styled.div`
position:relative; z-index:1; min-height:100%; background:url('/images/kgm-editorial-gold.webp') center / cover;
  mask-image:linear-gradient(90deg,transparent 0%,#000 22%);-webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 22%);
  &::after {content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(232,215,181,.15),rgba(44,33,17,.12));}
      @media(max-width:760px) { display:none; }
`;


export const PriceGoldMark = styled(LivingGoldCompanion)`
display:none;
`;

export const GoldBar = styled.div`
display:none;
`;

export const BarInner = styled.div`
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
      font-size: 0.62rem;
      line-height: 1.45;
    }
  }
`;

export const WebActionStrip = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin: 8px 0 2px;

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 9px 15px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
    font-size: .88rem;
    font-weight: 800;
    text-decoration: none;
  }
  a:hover, a:focus-visible {
    border-color: ${({ theme }) => theme.colors.secondary};
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
  }
  a:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 2px; }
  @media (max-width: 680px) {
    a { flex: 1 1 135px; font-size: .84rem; }
  }
`;

export const Section = styled.section`
padding-top:24px;
`;

export const SectionHead = styled.div`
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

export const SectionKicker = styled.div`
  margin-bottom: 5px;
  color: var(--gold);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.14em;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.3rem, 2.8vw, 1.9rem);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.04em;

  @media (max-width: 760px) {
    font-size: 1.38rem;
  }
`;

export const SectionNote = styled.p`
  margin: 0;
  color: #676d72;
  font-size: 0.78rem;
  line-height: 1.55;
  word-break: keep-all;

  b {
    display: inline-flex;
    align-items: center;
    margin: 0 2px;
    padding: 2px 6px;
    border: 1px solid rgba(200, 146, 47, 0.2);
    border-radius: 999px;
    background: var(--gold-soft);
    color: #9a6918;
    font-size: 0.72rem;
    font-weight: 950;
    line-height: 1.2;
    letter-spacing: 0.02em;
  }

  @media (max-width: 760px) {
    font-size: 0.66rem;
    line-height: 1.4;

    b {
      padding: 1px 5px;
      font-size: 0.61rem;
    }
  }
`;

export const PriceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    display: none;
  }
`;

export const PriceCard = styled.article`
overflow:hidden; border:1px solid var(--gm-border); border-radius:6px; background:var(--gm-surface); box-shadow:none;
`;

export const MetalHead = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 80px;
  padding: 14px 16px;
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

export const MetalBadge = styled.div`
display:grid; place-items:center; width:46px; height:46px; border:1px solid var(--gm-border); border-radius:3px;
      background:var(--gm-surface-alt); color:var(--gm-primary); font-size:15px; font-weight:500;
`;

export const MetalName = styled.strong`
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

export const MetalPurity = styled.span`
  display: block;
  margin-top: 5px;
  opacity: 0.72;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.69rem;
  font-weight: 750;

  @media (max-width: 760px) {
    display: none;
  }
`;

export const CardBody = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const CardMetric = styled.div`
  min-width: 0;
  padding: 14px 12px;
  border-left: ${({ $right }) => ($right ? "1px solid var(--line)" : "0")};
  text-align: center;

  span {
    display: block;
    color: #676d72;
    font-size: 0.67rem;
    font-weight: 800;

    small {
      margin-left: 4px;
      color: #7d5a1e;
      font-size: 0.62rem;
      font-weight: 950;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
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
      font-size: 0.62rem;
      line-height: 1.25;

      small {
        margin-left: 2px;
        font-size: 0.62rem;
      }
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

export const CardChange = styled.div`
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
        : "#676d72"};
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


export const MobilePriceMatrix = styled.div`
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

export const MatrixCell = styled.div`
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
    font-size: 0.62rem;
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
    font-size: 0.62rem;
    font-weight: 800;
    line-height: 1.2;
    opacity: 0.72;
  }
`;

export const MatrixChange = styled.span`
  display: block;
  color: ${({ $direction }) =>
    $direction === "up"
      ? "#d63b3b"
      : $direction === "down"
        ? "#1b6fae"
        : "#676d72"};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(0.52rem, 2.4vw, 0.62rem);
  font-weight: 900;
  line-height: 1.25;
`;

export const AlertCard = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
  gap: clamp(22px, 3vw, 38px);
  align-items: center;
  overflow: hidden;
  padding: clamp(18px, 2.7vw, 24px);
  border: 1px solid rgba(199, 148, 48, 0.22);
  border-radius: 18px;
  background:
    radial-gradient(circle at 85% 40%, rgba(212, 159, 53, 0.17), transparent 20rem),
    #fff;
  box-shadow: 0 14px 40px rgba(14, 18, 22, 0.055);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 16px 14px;
    border-radius: 18px;
  }
`;

export const AlertTitle = styled.h2`
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.25rem, 2.55vw, 1.7rem);
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -0.045em;
  word-break: keep-all;

  em {
    color: var(--gold);
    font-style: normal;
  }

  @media (max-width: 760px) {
    font-size: 1.2rem;
    line-height: 1.12;
  }
`;

export const AlertText = styled.p`
  margin: 6px 0 0;
  max-width: 720px;
  color: #676d72;
  font-size: 0.75rem;
  line-height: 1.5;
  word-break: keep-all;

  @media (max-width: 760px) {
    margin-top: 8px;
    font-size: 0.76rem;
    line-height: 1.55;
  }
`;

export const AlertBullets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 10px;

  @media (max-width: 760px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 14px;
  }
`;

export const AlertBullet = styled.span`
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
    font-size: 0.62rem;
    line-height: 1.25;

    svg {
      width: 15px;
      height: 15px;
    }
  }
`;

export const ActionArea = styled.div`
  display: grid;
  gap: 7px;
  width: 100%;
  max-width: 390px;
  margin: 0 0 0 auto;

  @media (max-width: 760px) {
    max-width: none;
    margin: 0;
  }
`;

export const MainButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 42px;
  padding: 9px 14px;
  border: 1px solid var(--ink);
  border-radius: 12px;
  background: var(--ink);
  color: #fff;
  font-size: 0.84rem;
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

export const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  color: #6f531f;
  font-size: 0.8rem;
  font-weight: 850;
  text-decoration: none;
`;

export const ConsentBox = styled.div`
  display: grid;
  gap: 8px;
  padding: 13px 14px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #faf9f6;
`;

export const ConsentLabel = styled.label`
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

export const ConsentAccepted = styled.div`
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

export const Status = styled.p`
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

export const RewardCard = styled.div`
  position: relative;
  overflow: hidden;
  padding: clamp(16px, 2.6vw, 21px);
  border: 1px solid rgba(199, 148, 48, 0.22);
  border-radius: 18px;
  background:
    radial-gradient(circle at 88% 20%, rgba(228,183,88,.12), transparent 18rem),
    linear-gradient(135deg, #fffaf0, #ffffff);
  color: var(--ink);
  box-shadow: 0 10px 28px rgba(8, 11, 14, 0.055);

  @media (max-width: 760px) {
    padding: 14px 13px;
    border-radius: 16px;
  }
`;

export const RewardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 680px) {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
`;

export const RewardTitle = styled.h2`
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.2rem, 2.45vw, 1.6rem);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.045em;

  span {
    color: #f1bd55;
  }

  @media (max-width: 760px) {
    font-size: 1.12rem;
    line-height: 1.12;
  }
`;

export const RewardLead = styled.p`
  margin: 6px 0 0;
  color: #676d72;
  font-size: 0.74rem;
  line-height: 1.45;

  @media (max-width: 760px) {
    margin-top: 7px;
    font-size: 0.68rem;
    line-height: 1.45;
  }
`;

export const QuizButton = styled(Link)`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 41px;
  padding: 0 16px;
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

export const RewardSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 10px;
  color: #676d72;
  font-size: 0.74rem;
  font-weight: 750;

  span {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    white-space: nowrap;
  }

  b {
    color: #b57c1e;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-weight: 950;
  }

  i {
    color: rgba(12, 17, 22, 0.22);
    font-style: normal;
  }

  @media (max-width: 680px) {
    gap: 5px 7px;
    margin-top: 9px;
    font-size: 0.64rem;

    i { display: none; }
    span {
      padding: 4px 7px;
      border-radius: 999px;
      background: rgba(255,255,255,.72);
    }
  }
`;

export const CrossLink = styled(Link)`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  margin-top: 0;
  padding: clamp(17px, 2.8vw, 22px);
  overflow: hidden;
  border: 1px solid rgba(225, 176, 75, 0.34);
  border-radius: 16px;
  background:
    radial-gradient(circle at 90% 18%, rgba(232, 183, 78, 0.12), transparent 13rem),
    linear-gradient(135deg, #fffaf0, #ffffff);
  color: var(--ink);
  text-decoration: none;
  box-shadow: 0 9px 24px rgba(8, 11, 14, 0.055);

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
    color: var(--ink);
    font-size: clamp(1.18rem, 2.45vw, 1.5rem);
    font-weight: 950;
    line-height: 1.28;
    letter-spacing: -0.035em;
    word-break: keep-all;
  }

  p {
    max-width: 760px;
    margin: 10px 0 0;
    color: #676d72;
    font-size: clamp(0.76rem, 1.35vw, 0.86rem);
    line-height: 1.7;
    word-break: keep-all;
  }

  .gold-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    margin-top: 11px;
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

export const Footnote = styled.p`
  margin: 15px 0 0;
  color: #8a8f94;
  text-align: center;
  font-size: 0.66rem;
  line-height: 1.5;
`;


// Android/iOS 앱 금시세: 주요 숫자를 우선 배치하고 불필요한 웹 홍보 영역을 숨깁니다.
export const AppPriceList = styled.div`
  display: grid;
  gap: 10px;
`;

export const AppPriceCard = styled.article`
  overflow: hidden;
  border: 1px solid rgba(12, 17, 22, 0.11);
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(14, 18, 22, 0.035);
`;

export const AppPriceCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 9px;
  border-bottom: 1px solid rgba(12, 17, 22, 0.07);

  strong {
    color: #111820;
    font-size: 1.03rem;
    font-weight: 900;
  }

  span {
    color: #606872;
    font-size: 0.75rem;
    font-weight: 700;
    text-align: right;
  }
`;

export const AppPriceMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  > div {
    min-width: 0;
    padding: 12px 12px 14px;
  }

  > div + div {
    border-left: 1px solid rgba(12, 17, 22, 0.08);
  }

  span {
    display: block;
    color: #66707a;
    font-size: 0.72rem;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 5px;
    color: #151b21;
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1.12rem, 4.5vw, 1.43rem);
    line-height: 1.22;
    font-weight: 900;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }
`;

export const AppPriceLinks = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 9px;
  margin-top: 16px;
`;

export const AppPricePrimary = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 48px;
  padding: 12px 8px;
  border-radius: 12px;
  background: #111b24;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 900;
  text-align: center;
  text-decoration: none;

  &:hover { color: #fff; }
`;

export const AppPriceSecondary = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 8px;
  border: 1px solid rgba(13, 20, 26, 0.2);
  border-radius: 12px;
  background: #fff;
  color: #1c252d;
  font-size: 0.85rem;
  font-weight: 850;
  text-align: center;
  text-decoration: none;
`;

export const AppPriceDisclaimer = styled.p`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px 2px 12px;
  color: #656e78;
  font-size: 0.73rem;
  line-height: 1.5;

  a {
    align-self: flex-start;
    color: #76541d;
    font-weight: 850;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;
