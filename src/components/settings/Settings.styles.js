// src/components/settings/Settings.styles.js
import styled from "styled-components";
import { Link } from "react-router-dom";

export const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 7px 0 22px;
  color: ${({ theme }) => theme.colors.text};
`;

export const PageHeader = styled.div`
  position: relative;
  margin-bottom: 10px;
  padding: clamp(21px, 4vw, 30px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 78%, transparent);
  border-radius: 22px;
  background:
    radial-gradient(circle at 92% 8%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, transparent) 0, transparent 31%),
    ${({ theme }) => theme.gradients.primary};
  box-shadow: 0 12px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);

  &::before {
    content: none;
    position: relative;
    z-index: 1;
    display: block;
    margin-bottom: 7px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: .61rem;
    font-weight: 950;
    letter-spacing: .14em;
  }

  &::after {
    content: "G";
    position: absolute;
    right: -8px;
    bottom: -34px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 7%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 7.4rem;
    font-weight: 950;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 560px) {
    padding: 17px 15px 15px;
    border-radius: 19px;
  }
`;

export const Title = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(1.55rem, 4vw, 2.15rem);
  line-height: 1.14;
  letter-spacing: -.04em;

  &::after {
    display: none;
  }
`;

export const Intro = styled.p`
  position: relative;
  z-index: 1;
  margin: 8px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 68%, transparent);
  font-size: .76rem;
  line-height: 1.5;
`;

export const Section = styled.section`
  margin-bottom: 10px;
  padding: clamp(16px, 3.6vw, 22px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  @media (max-width: 560px) {
    padding: 14px 13px;
    border-radius: 18px;
  }
`;

export const SectionTitle = styled.h2`
  margin: 0 0 5px;
  font-size: clamp(1.05rem, 3vw, 1.28rem);
  color: ${({ theme }) => theme.colors.primary};
  letter-spacing: -.02em;
`;

export const SectionDescription = styled.p`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .78rem;
  line-height: 1.45;
`;

export const Rows = styled.div`
  display: grid;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

export const RowText = styled.span`
  display: grid;
  gap: 2px;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .9rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .75rem;
    line-height: 1.4;
  }

  em {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: .72rem;
    line-height: 1.4;
    font-style: normal;
  }
`;

export const Switch = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 92px;
  height: 34px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const SwitchOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.goldLight : theme.colors.textSecondary};
  font-size: .7rem;
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
`;

export const Notice = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 9px;
  padding: 10px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .78rem;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 9px 13px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  svg {
    width: 17px;
    height: 17px;
  }
`;

export const OutlineButton = styled(Button)`
  border-color: ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
`;

export const DangerButton = styled(Button)`
  border-color: ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => theme.colors.error};
`;

export const StatusGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin: 12px 0 0;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const StatusItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 9px 10px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  dt {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .74rem;
  }

  dd {
    margin: 0;
  }
`;

export const Status = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ $tone, theme }) =>
    $tone === "ok"
      ? theme.semantic.alertSuccessBg
      : $tone === "error"
        ? theme.semantic.alertErrorBg
        : theme.semantic.alertWarningBg};
  color: ${({ $tone, theme }) =>
    $tone === "ok"
      ? theme.semantic.alertSuccessText
      : $tone === "error"
        ? theme.semantic.alertErrorText
        : theme.semantic.alertWarningText};
  font-size: .75rem;
  font-weight: 850;
  white-space: nowrap;
`;

export const AdvancedDetails = styled.details`
  margin-top: 12px;
  padding: 0 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};

  summary {
    padding: 12px 0;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .79rem;
    font-weight: 850;
  }
`;

export const AdvancedGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 14px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const AdvancedItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  dt {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .76rem;
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: .78rem;
    font-weight: 800;
    text-align: right;
  }
`;

export const Message = styled.p`
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  color: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorText : theme.semantic.alertSuccessText};
  background: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorBg : theme.semantic.alertSuccessBg};
  line-height: 1.55;
`;

export const Form = styled.form`
  display: grid;
  gap: 14px;
`;

export const FormGroup = styled.div`
  display: grid;
  gap: 7px;
`;

export const Label = styled.label`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 750;
`;

export const Input = styled.input`
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: .96rem;

  &:focus {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 25%, transparent);
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

export const LinkList = styled.div`
  display: grid;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const SettingLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-size: .88rem;
  font-weight: 800;

  svg {
    width: 17px;
    height: 17px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

export const Help = styled.div`
  display: grid;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  ol {
    display: grid;
    gap: 5px;
    margin: 0;
    padding-left: 20px;
  }
`;

export const DangerNote = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.65;
`;

export const NotificationSummary = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, ${({ theme }) => theme.colors.border});
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 48%, white),
    ${({ theme }) => theme.colors.surface}
  );

  > div {
    display: grid;
    gap: 4px;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .92rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .79rem;
    line-height: 1.5;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const TroubleshootDetails = styled.details`
  margin-top: 10px;
  padding: 0 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};

  > summary {
    position: relative;
    padding: 11px 24px 11px 0;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .82rem;
    font-weight: 850;
    list-style: none;
  }

  > summary::-webkit-details-marker {
    display: none;
  }

  > summary::after {
    content: "›";
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 1.2rem;
    transition: transform .16s ease;
  }

  &[open] > summary::after {
    transform: translateY(-50%) rotate(90deg);
  }
`;

export const SettingDetails = styled.details`
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  > summary {
    position: relative;
    display: grid;
    gap: 4px;
    padding: 13px 28px 13px 0;
    cursor: pointer;
    list-style: none;
  }

  > summary::-webkit-details-marker {
    display: none;
  }

  > summary strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: .96rem;
  }

  > summary small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.5;
  }

  > summary::after {
    content: "›";
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 1.25rem;
    transition: transform .16s ease;
  }

  &[open] > summary::after {
    transform: translateY(-50%) rotate(90deg);
  }
`;

export const DetailsBody = styled.div`
  display: grid;
  gap: 11px;
  padding: 2px 0 14px;
`;

export const DangerDetails = styled(SettingDetails)`
  > summary strong {
    color: ${({ theme }) => theme.colors.error};
  }
`;
