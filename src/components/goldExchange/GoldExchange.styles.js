import styled, { keyframes, css } from "styled-components";

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 14px 0 30px;
  background: transparent;
  min-height: calc(100svh - 180px);

  @media (max-width: 640px) {
    padding: 7px 0 20px;
  }
`;

export const FlowHeader = styled.header`
  position: relative;
  width: 100%;
  max-width: 1160px;
  margin-bottom: 8px;
  padding: ${({ $compact }) => ($compact ? "14px 18px" : "clamp(18px, 3vw, 25px)")};
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 78%, transparent);
  border-radius: ${({ $compact }) => ($compact ? "16px" : "20px")};
  background:
    radial-gradient(circle at 93% 8%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, transparent) 0, transparent 30%),
    ${({ theme }) => theme.gradients.primary};
  box-shadow: 0 10px 26px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 11%, transparent);

  &::after {
    content: "G";
    position: absolute;
    right: -10px;
    bottom: -46px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 7%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: ${({ $compact }) => ($compact ? "7rem" : "8rem")};
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    padding: ${({ $compact }) => ($compact ? "11px 12px" : "15px 14px 13px")};
    border-radius: 18px;
  }
`;

export const PageEyebrow = styled.p`
  position: relative;
  z-index: 1;
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .63rem;
  font-weight: 950;
  letter-spacing: .15em;
`;

export const PageTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: ${({ $compact }) => ($compact ? "clamp(1.25rem, 2.5vw, 1.6rem)" : "clamp(1.55rem, 3.5vw, 2.2rem)")};
  line-height: 1.12;
  letter-spacing: -.045em;
  word-break: keep-all;
`;

export const PageLead = styled.p`
  position: relative;
  z-index: 1;
  max-width: 700px;
  margin: 7px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: .76rem;
  line-height: 1.55;
  word-break: keep-all;
  display: ${({ $compact }) => ($compact ? "none" : "block")};

  @media (max-width: 640px) {
    margin-top: 5px;
    font-size: .7rem;
    line-height: 1.48;
  }
`;

export const RebookNotice = styled.div`
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 13px 0 0;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 22%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 7%, transparent);
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: .78rem;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

export const FlowTrack = styled.ol`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin: 10px 0 0;
  padding: 5px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 12%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 5%, transparent);
  list-style: none;

  @media (max-width: 620px) {
    gap: 4px;
    margin-top: 9px;
  }
`;

export const FlowItem = styled.li`
  min-width: 0;
  padding: 7px 6px;
  border: 0;
  border-radius: 10px;
  background: ${({ $active, $done, theme }) =>
    $active
      ? theme.colors.goldLight
      : $done
        ? `color-mix(in srgb, ${theme.colors.goldLight} 19%, transparent)`
        : "transparent"};
  color: ${({ $active, $done, theme }) =>
    $active
      ? theme.colors.primary
      : $done
        ? theme.colors.goldLight
        : `color-mix(in srgb, ${theme.on.primary} 58%, transparent)`};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .63rem;
  font-weight: 900;
  text-align: center;
  white-space: nowrap;

  @media (max-width: 620px) {
    padding: 9px 3px;
    font-size: .69rem;
    letter-spacing: -.035em;
  }
`;

export const InfoCard = styled.div`
  padding: 13px 14px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, ${({ theme }) => theme.colors.border});
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 58%, white),
    ${({ theme }) => theme.colors.surface}
  );
  line-height: 1.5;
`;

export const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 1160px;
  margin-bottom: 10px;
  padding: clamp(16px, 3vw, 23px);
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 24px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 18px;
    width: 54px;
    height: 3px;
    border-radius: 0 0 999px 999px;
    background: ${({ theme }) => theme.colors.secondary};
    pointer-events: none;
  }

  @media (max-width: 640px) {
    padding: 14px 13px;
    border-radius: 18px;
  }
`;

export const StartChoiceGrid = styled.div`
  width: 100%;
  max-width: 1160px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin-bottom: 8px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const StartChoice = styled.button`
  min-height: 108px;
  padding: 15px;
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.secondary : theme.colors.border};
  border-radius: 14px;
  background: ${({ $active, theme }) =>
    $active ? theme.semantic.badgeGoldBg : theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  text-align: left;
  cursor: ${({ $static }) => ($static ? "default" : "pointer")};
  box-shadow: 0 7px 18px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.gold};
    outline-offset: 2px;
  }

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .8rem;
    font-weight: 900;
    letter-spacing: .01em;
  }
  strong {
    display: block;
    margin-top: 4px;
    font-size: 1rem;
    line-height: 1.35;
  }
  span {
    display: block;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .86rem;
    line-height: 1.45;
  }
`;

export const ModeSwitch = styled.button`
  width: 100%;
  margin-top: 12px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .72rem;
  font-weight: 900;
  text-align: center;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
`;

export const ExchangeOutcome = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin: 12px 0 16px;
  padding: 15px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 30%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: linear-gradient(135deg, ${({ theme }) => theme.semantic.badgeGoldBg}, ${({ theme }) => theme.colors.surface});

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .62rem;
    font-weight: 950;
    letter-spacing: .08em;
  }
  strong {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.05rem, 3vw, 1.32rem);
    line-height: 1.28;
  }
  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .76rem;
    line-height: 1.45;
  }

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) 112px;
    gap: 8px;
    padding: 11px;
    margin: 9px 0 10px;
    ${({ $native }) => $native && `
      p { display: none; }
      > :last-child { display: grid; }
    `}
  }
`;

/** Step 2: give the user's estimated pure-gold weight visual priority. */
export const ExchangePureGoldTotal = styled.div`
  margin: 12px 0 14px;
  padding: 17px 19px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 37%, transparent);
  border-radius: 17px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};

  .pure-gold-label {
    display: block;
    font-size: .89rem;
    font-weight: 850;
  }
  .pure-gold-amount {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 13px;
    row-gap: 1px;
    margin: 6px 0;
    font-variant-numeric: tabular-nums;
  }
  .pure-gold-amount strong {
    font-size: clamp(1.9rem, 6vw, 2.55rem);
    line-height: 1.12;
    font-weight: 950;
    letter-spacing: -.035em;
  }
  .pure-gold-amount span {
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: clamp(1.06rem, 3.7vw, 1.3rem);
    font-weight: 900;
    white-space: nowrap;
  }
  small {
    display: block;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 76%, transparent);
    font-size: .78rem;
    line-height: 1.5;
  }
  @media (max-width: 520px) {
    padding: 14px 15px;
  }
`;

export const ExchangeDecisionSummary = styled.div`
  display: grid;
  grid-template-columns: ${({ $twoColumn }) => $twoColumn ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))"};
  gap: 8px;
  margin: 0 0 10px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;

    & > :last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
`;

export const ExchangeDecisionFact = styled.div`
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.surface};

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.4;
  }
  strong {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.05rem;
    line-height: 1.35;
    word-break: keep-all;
  }
  em {
    display: inline;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .85em;
    font-style: normal;
    font-weight: 800;
    white-space: nowrap;
  }
  @media (max-width: 520px) {
    padding: 10px 11px;
    span { font-size: .78rem; }
  }
`;

export const MiniGoldBar = styled.div`
  min-width: 124px;
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.secondaryDark} 44%, transparent);
  border-radius: 9px;
  background:
    linear-gradient(115deg, rgba(255,255,255,.65), transparent 33%, rgba(255,245,194,.37) 57%, transparent 74%),
    linear-gradient(145deg, #c59838, #ffe7a1 35%, #ddaa48 74%, #ac7724);
  color: #432c0b;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8), inset -3px -5px 8px rgba(118,78,21,.24), 0 5px 0 #a97524, 0 10px 22px rgba(126,88,23,.2);

  small { color: rgba(23,18,10,.68); font-size: 0.62rem; letter-spacing: .11em; }
  b { display: block; margin-top: 3px; font-size: .9rem; }
  em { display: block; margin-top: 2px; font-family: ${({ theme }) => theme.fonts.numeric}; font-size: .7rem; font-style: normal; font-weight: 900; }
  @media (max-width: 520px) {
    min-width: 0;
    padding: 9px 6px;
    small { font-size: .52rem; letter-spacing: 0; }
    b { font-size: .7rem; }
  }
  @media (max-width: 350px) { small { display: none; } b { font-size: .61rem; } em { font-size: .57rem; } }
`;

export const Title = styled.h2`
  margin: 0 0 10px;
  text-align: left;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.15rem, 3vw, 1.38rem);
  line-height: 1.28;
  letter-spacing: -.025em;
`;

export const SubTitle = styled.h3`
  margin: 17px 0 10px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1rem;
  letter-spacing: -.015em;
`;

export const FormGroup = styled.div`
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
`;

export const Label = styled.label`
  margin-bottom: 5px;
  font-size: .86rem;
  font-weight: 850;
  color: ${({ theme }) => theme.colors.primary};
`;

export const HelpText = styled.small`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .8rem;
  line-height: 1.5;
`;

export const ConsentBox = styled.div`
  margin: 16px 0;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const ConsentRow = styled.label`
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 10px;
  align-items: start;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 750;
  line-height: 1.5;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    margin: 2px 0 0;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const ConsentDetails = styled.p`
  margin: 10px 0 0 30px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;
  line-height: 1.55;
`;

export const ConsentLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: underline;
  text-underline-offset: 2px;
`;

export const PrivacyModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.56);
`;

export const PrivacyModal = styled.div`
  width: min(920px, 100%);
  height: min(82svh, 820px);
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

export const PrivacyModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const PrivacyModalTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

export const PrivacyCloseButton = styled.button`
  flex: 0 0 auto;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;
`;

export const PrivacyFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: 0;
  background: ${({ theme }) => theme.colors.surface};
`;

export const Input = styled.input`
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  font-size: .96rem;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 26%, transparent);
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

export const Select = styled.select`
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  font-size: .96rem;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 26%, transparent);
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

export const Button = styled.button`
  width: 100%;
  min-height: 46px;
  padding: 11px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: .98rem;
  font-weight: 900;
  cursor: pointer;
  transition: filter .18s ease, transform .12s ease;

  &:hover { filter: brightness(1.03); transform: translateY(-1px); }
  &:disabled {
    background: ${({ theme }) => theme.colors.disabled};
    border-color: transparent;
    cursor: not-allowed;
  }
`;

export const OutlineButton = styled(Button)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  border-color: ${({ theme }) => theme.colors.borderStrong};
`;

export const GhostButton = styled(Button)`
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const SmallButton = styled(Button)`
  width: auto;
  min-height: 36px;
  padding: 7px 10px;
  border-radius: 10px;
  font-size: .84rem;
`;

export const RemoveButton = styled(SmallButton)`
  background: ${({ theme }) => theme.colors.error};
  &:hover { filter: brightness(1.03); }
  margin-left: auto;
`;

export const Inline = styled.div`
  display: flex; gap: 10px; align-items: center;
`;

export const SectionSeparator = styled.div`
  height: 1px; background: ${({ theme }) => theme.colors.dividerSubtle}; margin: 14px 0;
`;

export const ErrorText = styled.p`
  font-size: 1.05rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.error};
  margin: 4px 0 12px;
`;

export const TableWrap = styled.div`
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td { padding: 12px 14px; text-align: left; }
  thead th {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    font-weight: 900;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  tbody td { border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; }
  tbody tr:first-child td { border-top: none; }
  tfoot td { font-weight: 900; background: ${({ theme }) => theme.colors.surfaceAlt}; }
`;

/* 세그먼트(그램/돈 탭) */
export const Seg = styled.div`
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  width: 100%;
  max-width: 320px;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;
export const SegBtn = styled.button`
  border: 0;
  padding: 9px 11px;
  border-radius: 9px;
  font-weight: 900;
  cursor: pointer;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.goldLight : theme.colors.textSecondary)};
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.xs : "none")};
`;

/* 추천 하이라이트/스타일 */
export const aiPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gm-gold) 30%, transparent); }
  60%  { box-shadow: 0 0 0 12px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;
export const AIBadge = styled.span`
  display: inline-flex; align-items: center; gap: 6px; flex: 0 1 auto;
  max-width: 100%; white-space: normal; overflow-wrap: anywhere;
  font-size: .7rem; line-height: 1.3; font-weight: 900;
  padding: 4px 8px; border-radius: 9999px;
  color: ${({ theme }) => theme.on.primary};
  background: ${({ theme }) => theme.gradients.primary};
  border: 1px solid ${({ theme }) => theme.colors.secondary}66;
  @media (prefers-reduced-motion: no-preference) {
    animation: ${aiPulse} 2.8s ease-in-out infinite;
  }
`;

/* Denoms */
export const DenomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
  @media (max-width: 520px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;
export const DenomTile = styled.button`
  position: relative;
  border: 2px solid ${({ $active, $recommended, theme }) =>
    $active ? theme.colors.gold : $recommended ? theme.colors.primary : theme.colors.border};
  background:
    ${({ $active, $recommended, theme }) =>
      $active
        ? theme.colors.goldLight
        : $recommended
        ? theme.gradients.recommendation
        : "transparent"};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text)};
  border-radius: 12px;
  min-height: 75px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 4px;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease, transform .06s ease;
  &:hover {
    border-color: ${({ $recommended, theme }) =>
      $recommended ? theme.colors.primary : theme.colors.gold};
    box-shadow: 0 0 0 2px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);
    transform: translateY(-1px);
  }
  ${({ $recommended }) =>
    $recommended &&
    css`
      &::after{
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: 12px;
        background: ${({ theme }) => theme.gradients.recommendation};
        z-index: -1;
        filter: blur(8px);
      }
    `}
`;

/** Phase 4A: premium gold-bar choices, purely presentational. */
export const PremiumDenomTile = styled(DenomTile)`
  isolation: isolate;
  overflow: hidden;
  min-height: 191px;
  border-radius: 17px;
  padding: 12px 12px 13px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 6px;
  background: ${({ $active, theme }) => $active
    ? `linear-gradient(150deg, ${theme.semantic.badgeGoldBg}, ${theme.colors.surface} 75%)`
    : theme.colors.surface};
  border: 1.5px solid ${({ $active, $recommended, theme }) => $active
    ? theme.colors.secondaryDark
    : $recommended ? theme.colors.secondary : theme.colors.border};
  box-shadow: ${({ $active }) => $active
    ? "0 7px 19px rgba(133, 95, 30, .14), inset 0 1px 0 rgba(255,255,255,.88)"
    : "0 2px 9px rgba(27,25,22,.035)"};
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;

  &::after { display: none; }
  &:hover { transform: translateY(-2px); }
  &:focus-visible { outline: 3px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 3px; }
  &:disabled { opacity: .45; cursor: not-allowed; }
  > .denom-flags {
    min-height: 23px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px;
  }
  > .denom-flags > .selected-chip {
    font-size: .67rem;
    font-weight: 900;
    border: 1px solid ${({ theme }) => theme.colors.secondaryDark};
    border-radius: 999px;
    padding: 2px 7px;
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
  }
  > .denom-visual {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 86px;
    width: 100%;
    min-height: 79px;
    padding: 7px 0;
    overflow: hidden;
    pointer-events: none;
  }
  > .denom-visual::before {
    content: "";
    position: absolute;
    width: 75%;
    height: 23%;
    bottom: 2px;
    left: 12.5%;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(120,84,19,.19), transparent 70%);
    filter: blur(5px);
  }
  .denom-ingot {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    width: var(--bar-visual-width, 75%);
    height: 72px;
    flex-shrink: 0;
    border-radius: 10px / 7px;
    transform: perspective(420px) rotateX(10deg);
    background:
      linear-gradient(120deg, rgba(255,255,255,.76) 0%, transparent 27%, rgba(255,251,219,.6) 45%, transparent 59%),
      linear-gradient(143deg, #c29330 0%, #f7d888 18%, #ffe7a3 42%, #c18e29 78%, #9c6b19 100%);
    border: 1px solid rgba(139,97,27,.75);
    box-shadow:
      inset 0 2px 2px rgba(255,255,255,.74),
      inset -4px -5px 9px rgba(120,78,17,.23),
      inset 3px 0 7px rgba(255,251,219,.4),
      0 4px 0 #9b691f,
      0 8px 12px rgba(88,62,24,.19);
    color: #59390c;
    text-shadow: 0 1px rgba(255,251,217,.73);
    font-family: ${({ theme }) => theme.fonts.numeric};
  }
  .denom-ingot::after {
    content: "";
    position: absolute;
    inset: 5px 6px;
    border: 1px solid rgba(120,82,20,.29);
    border-radius: 6px;
    pointer-events: none;
  }
  .denom-ingot small { font-size: .56rem; font-weight: 850; letter-spacing: .13em; }
  .denom-ingot b { font-size: .9rem; line-height: 1.1; font-weight: 950; }
  .denom-ingot em { font-size: .6rem; font-weight: 900; font-style: normal; }
  .denom-name {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.08rem;
    font-weight: 950;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
  }
  .denom-weight {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .73rem;
    line-height: 1.35;
  }
  .denom-topup {
    display: block;
    margin-top: 1px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .72rem;
    font-weight: 800;
    line-height: 1.36;
  }
  ${AIBadge} { animation: none; font-size: .64rem; }
  @media (max-width: 520px) {
    min-height: 178px;
    padding: 9px;
    gap: 4px;
    .denom-ingot { height: 64px; }
    .denom-ingot b { font-size: .8rem; }
    .denom-visual { min-height: 67px; }
    .denom-name { font-size: 1rem; }
    .denom-weight { font-size: .68rem; }
  }
  @media (prefers-reduced-motion: reduce) { transition: none; &:hover { transform: none; } }
`;

/** Pricing is deliberately secondary to the selected gold-bar result; never hidden. */
export const ExchangeFeeNote = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 9px 12px;
  margin: 0 0 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .78rem;
  line-height: 1.5;
  span { font-weight: 800; }
  small { font-weight: 650; }
  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .87rem;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
`;

/* 스텝 마크 */
export const StepCenter = styled.div` display: flex; justify-content: center; `;
export const StepMark = styled.div`
  display: inline-block;
  margin: 0 auto 8px;
  padding: 5px 11px;
  border: 1px solid ${({ theme }) => theme.colors.gold};
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .78rem;
  font-weight: 900;
  border-radius: 10px;
  text-align: center;
  letter-spacing: .25px;
`;



export const EstimateBoundary = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 9px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 18%, transparent);
  border-radius: 11px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 6%, transparent);
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 78%, transparent);
  font-size: .78rem;
  font-weight: 750;
  line-height: 1.45;
  text-align: center;
  word-break: keep-all;
`;

export const ReservationSummary = styled.div`
  margin: 0 0 16px;
  padding: 15px 16px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: linear-gradient(135deg, ${({ theme }) => theme.semantic.badgeGoldBg}, ${({ theme }) => theme.colors.surface});

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .73rem;
    font-weight: 950;
    letter-spacing: .06em;
  }
  strong {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
    line-height: 1.4;
  }
  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.5;
  }
`;

export const FeeSummary = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin: 10px 0 15px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  small {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .68rem;
  }
  strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 1rem;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const FeeLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  font-size: .72rem;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
`;

export const PendingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin: 0 0 10px;
  padding: 6px 9px;
  border-radius: 999px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .7rem;
  font-weight: 950;
`;

/* Phase 4-C: booking summary and confirmation. Presentation only. */
export const ReservationKeySummary = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 11px;

  > div {
    min-width: 0;
    padding: 12px 14px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.surface};
  }
  span {
    display: block;
    font-size: .73rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 750;
    line-height: 1.5;
  }
  b {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(.9rem, 2.4vw, 1.05rem);
    font-weight: 950;
    font-variant-numeric: tabular-nums;
    line-height: 1.4;
    word-break: keep-all;
  }
  @media (max-width: 390px) { gap: 7px; > div { padding: 10px; } }
`;

export const ReservationFeeLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 10px 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .79rem;
  line-height: 1.5;

  b {
    font-size: .86rem;
    font-weight: 850;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text};
  }
  em { font-style: normal; opacity: .8; }
`;

export const ReservationScheduleStatus = styled.div`
  margin: 4px 0 13px;
  padding: 13px 15px;
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.colors.secondary : theme.colors.border};
  border-radius: 14px;
  background: ${({ $selected, theme }) => $selected ? theme.semantic.badgeGoldBg : theme.colors.surfaceAlt};
  span {
    display: block;
    margin-bottom: 3px;
    font-size: .7rem;
    font-weight: 850;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  strong {
    display: block;
    font-size: clamp(.95rem, 3vw, 1.12rem);
    font-weight: 950;
    color: ${({ theme }) => theme.colors.primary};
    font-variant-numeric: tabular-nums;
    line-height: 1.4;
  }
  small {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .73rem;
    line-height: 1.5;
  }
`;

export const ReservationNextSteps = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  padding: 0;
  margin: 14px 0 16px;
  list-style: none;
  li {
    display: grid;
    align-content: start;
    min-width: 0;
    padding: 12px 13px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 13px;
    background: ${({ theme }) => theme.colors.surface};
  }
  span {
    font-size: .66rem;
    font-weight: 950;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
  strong {
    margin-top: 4px;
    font-size: .83rem;
    color: ${({ theme }) => theme.colors.primary};
    line-height: 1.3;
  }
  small {
    margin-top: 3px;
    font-size: .71rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.5;
  }
  @media (max-width: 650px) { grid-template-columns: 1fr; li { padding: 11px 13px; } }
`;

export const StoreVisitDetails = styled.details`
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  summary {
    cursor: pointer;
    font-size: .84rem;
    font-weight: 900;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.primary};
  }
  summary:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 3px; }
  &[open] summary { margin-bottom: 13px; }
`;

/* Phase 4-D: MEMBER GOLD is a separate member benefit, not physical MY GOLD.
   Presentation-only, accessible on compact Android and web layouts. */
export const MemberGoldPanel = styled.section`
  min-width: 0;
  display: grid;
  gap: 12px;
  padding: clamp(13px, 3vw, 18px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  .member-gold-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 9px 16px;
  }
  .member-gold-header > div { min-width: 0; }
  .member-gold-header small {
    display: block;
    margin-bottom: 3px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .68rem;
    font-weight: 900;
    letter-spacing: .09em;
  }
  .member-gold-header strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.03rem;
    font-weight: 950;
  }
  .member-gold-header p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .8rem;
    line-height: 1.55;
    word-break: keep-all;
  }
  .member-gold-detail {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 8px 10px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .79rem;
    font-weight: 850;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .member-gold-detail:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 3px;
  }
`;

export const MemberGoldAmounts = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  > div {
    min-width: 0;
    padding: 12px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.surface};
  }
  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .73rem;
    line-height: 1.4;
  }
  b {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(.95rem, 2.8vw, 1.14rem);
    font-weight: 950;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  @media (max-width: 360px) { gap: 6px; > div { padding: 10px; } }
`;

export const MemberGoldSelection = styled.label`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 12px 14px;
  border: 1.5px solid ${({ $selected, theme }) => $selected ? theme.colors.secondary : theme.colors.borderStrong};
  border-radius: 13px;
  background: ${({ $selected, theme }) => $selected ? theme.semantic.badgeGoldBg : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease;
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 3px;
  }
  input {
    width: 22px;
    height: 22px;
    margin: 0;
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
  b { display: block; font-weight: 900; font-size: .85rem; line-height: 1.45; word-break: keep-all; }
  small { display: block; margin-top: 3px; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .74rem; line-height: 1.45; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const MemberGoldStatusNote = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ $selected, theme }) => $selected ? theme.semantic.badgeGoldBg : theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .79rem;
  line-height: 1.55;
  word-break: keep-all;
`;

export const MemberGoldReceipt = styled.div`
  min-width: 0;
  margin-top: 14px;
  padding: clamp(13px, 3vw, 18px);
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 15px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  strong { display: block; font-size: .94rem; line-height: 1.5; }
  p { margin: 8px 0 0; font-size: .82rem; line-height: 1.55; }
  .member-gold-code-label { margin-top: 14px; font-size: .73rem; font-weight: 900; }
  .member-gold-code {
    display: block;
    width: fit-content;
    max-width: 100%;
    margin: 6px 0 8px;
    padding: 9px 15px;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: 10px;
    background: ${({ theme }) => theme.colors.surface};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1.35rem, 6.4vw, 2rem);
    font-weight: 950;
    letter-spacing: .14em;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  small { display: block; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .75rem; line-height: 1.5; }
`;
