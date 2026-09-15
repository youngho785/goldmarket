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
  max-width: 960px;
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
    padding: ${({ $compact }) => ($compact ? "12px 13px" : "15px 14px 13px")};
    border-radius: 20px;
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
    padding: 8px 3px;
    font-size: 0.62rem;
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
  max-width: 960px;
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
  max-width: 960px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin-bottom: 8px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const StartChoice = styled.button`
  min-height: 66px;
  padding: 10px 12px;
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.secondary : theme.colors.border};
  border-radius: 14px;
  background: ${({ $active, theme }) =>
    $active ? theme.semantic.badgeGoldBg : theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  text-align: left;
  cursor: ${({ $static }) => ($static ? "default" : "pointer")};
  box-shadow: 0 7px 18px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .6rem;
    font-weight: 950;
    letter-spacing: .08em;
  }
  strong {
    display: block;
    margin-top: 3px;
    font-size: .84rem;
    line-height: 1.25;
  }
  span {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .65rem;
    line-height: 1.35;
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
    grid-template-columns: 1fr;
  }
`;

export const MiniGoldBar = styled.div`
  min-width: 124px;
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.secondaryDark} 44%, transparent);
  border-radius: 9px;
  background: ${({ theme }) => theme.gradients.gold};
  color: #17120a;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 8px 20px rgba(126,88,23,.18);

  small { color: rgba(23,18,10,.68); font-size: 0.62rem; letter-spacing: .11em; }
  b { display: block; margin-top: 3px; font-size: .9rem; }
  em { display: block; margin-top: 2px; font-family: ${({ theme }) => theme.fonts.numeric}; font-size: .7rem; font-style: normal; font-weight: 900; }
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
  font-size: .75rem;
  line-height: 1.42;
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
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .75rem; font-weight: 900;
  padding: 4px 8px; border-radius: 9999px;
  color: ${({ theme }) => theme.on.primary};
  background: ${({ theme }) => theme.gradients.primary};
  border: 1px solid ${({ theme }) => theme.colors.secondary}66;
  animation: ${aiPulse} 2.8s ease-in-out infinite;
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
  border-radius: 0;
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
        border-radius: 0;
        background: ${({ theme }) => theme.gradients.recommendation};
        z-index: -1;
        filter: blur(8px);
      }
    `}
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

