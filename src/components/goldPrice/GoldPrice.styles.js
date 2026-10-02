import styled from "styled-components";
import LivingGoldCompanion from "@/components/common/LivingGoldCompanion";
import { Link } from "react-router-dom";
import { livingGoldGlint, livingGoldReveal } from "@/styles/livingGoldMotion";

export const Page = styled.div`
  --gold: #c8922f;
  --gold-bright: #e4b758;
  --gold-soft: #f6ead3;
  --ink: #0c1116;
  --ink-soft: #171d23;
  --cream: #faf8f4;
  --line: rgba(12, 17, 22, 0.1);

  width: 100%;
  padding: 0 0 clamp(30px, 5vw, 52px);

  @media (max-width: 760px) {
    padding-bottom: 10px;
  }

  color: ${({ theme }) => theme.colors.text};
  background:
    radial-gradient(circle at 85% 4%, rgba(228, 183, 88, 0.12), transparent 28rem),
    linear-gradient(180deg, #ffffff 0%, var(--cream) 72%, #ffffff 100%);
`;

export const Shell = styled.div`
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;

  @media (max-width: 680px) {
    width: calc(100% - 20px);
  }
`;

export const Hero = styled.section`
  padding: clamp(12px, 2.2vw, 20px) 0 8px;
`;

export const HeroCard = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(260px, 0.92fr);
  min-height: 204px;
  overflow: hidden;
  border: 1px solid rgba(213, 164, 67, 0.28);
  border-radius: 22px;
  background:
    radial-gradient(circle at 82% 18%, rgba(212, 159, 53, 0.15), transparent 24rem),
    linear-gradient(135deg, #080b0e 0%, #10161b 55%, #07090b 100%);
  box-shadow: 0 18px 42px rgba(7, 10, 13, 0.13);

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
    min-height: 190px;
    border-radius: 20px;
  }
`;

export const HeroCopy = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(18px, 2.6vw, 26px);

  @media (max-width: 760px) {
    min-height: 190px;
    justify-content: flex-start;
    padding: 15px 82px 14px 14px;
  }
`;

export const Eyebrow = styled.div`
  margin-bottom: 7px;
  color: var(--gold-bright);
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.16em;

  @media (max-width: 760px) {
    margin-bottom: 6px;
    font-size: 0.62rem;
    letter-spacing: 0.13em;
  }
`;

export const HeroTitle = styled.h1`
  margin: 0;
  color: #fff;
  font-size: clamp(1.6rem, 3.05vw, 2.3rem);
  font-weight: 900;
  line-height: 1.03;
  letter-spacing: -0.055em;
  word-break: keep-all;

  @media (max-width: 760px) {
    font-size: 1.42rem;
    line-height: 1.04;
  }
`;

export const HeroLead = styled.p`
  margin: 7px 0 0;
  max-width: 520px;
  color: rgba(255, 255, 255, 0.68);
  font-size: clamp(0.8rem, 1.35vw, 0.92rem);
  line-height: 1.55;
  word-break: keep-all;

  @media (max-width: 760px) {
    margin-top: 5px;
    max-width: 100%;
    font-size: 0.66rem;
    line-height: 1.45;
  }
`;

export const HeroPriceBlock = styled.div`
  margin-top: clamp(11px, 1.7vw, 16px);

  @media (max-width: 760px) {
    margin-top: 10px;
  }
`;

export const PriceLabel = styled.div`
  color: rgba(255, 255, 255, 0.72);
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
  color: #f2c45f;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(2.15rem, 5.1vw, 3.7rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.055em;

  @media (max-width: 760px) {
    font-size: clamp(1.95rem, 9.6vw, 2.55rem);
  }
  animation: ${livingGoldReveal} 620ms cubic-bezier(.2,.8,.2,1) 120ms both;
`;

export const Won = styled.span`
  color: #f2c45f;
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
    margin-top: 7px;
    max-width: 100%;
    font-size: 0.63rem;
    line-height: 1.35;
  }
`;

export const Source = styled.span`
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.72rem;
  font-weight: 700;

  b {
    display: inline-flex;
    align-items: center;
    margin-left: 2px;
    padding: 2px 6px;
    border: 1px solid rgba(242, 196, 95, 0.28);
    border-radius: 999px;
    background: rgba(242, 196, 95, 0.1);
    color: #f2c45f;
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
  position: relative;
  z-index: 1;
  pointer-events: none;
  display: grid;
  place-items: center;
  min-height: 204px;
  padding: 18px;
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
  }
`;


export const PriceGoldMark = styled(LivingGoldCompanion)`
  position: absolute;
  z-index: 6;
  top: 18px;
  right: clamp(112px, 19%, 184px);
  opacity: 0.96;
  pointer-events: auto;
  touch-action: manipulation;

  @media (max-width: 760px) {
    top: 10px;
    right: 10px;
    opacity: 1;
  }
`;

export const GoldBar = styled.div`
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: clamp(122px, 17vw, 162px);
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

  &::before {
    content: "";
    position: absolute;
    z-index: 2;
    top: -30%;
    bottom: -30%;
    left: -42%;
    width: 22%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.78), transparent);
    filter: blur(1px);
    animation: ${livingGoldGlint} 4.8s ease-in-out 900ms infinite;
    pointer-events: none;
  }

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

export const Section = styled.section`
  padding: clamp(19px, 3vw, 29px) 0 0;

  @media (max-width: 760px) {
    padding-top: 18px;
  }
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
    font-size: 0.62rem;
  }
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

