import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }

  html, body, #root { min-height: 100%; }
  html {
    scroll-behavior: smooth;
    overflow-x: hidden;
    font-size: 100%;
    color-scheme: light;
    background: ${({ theme }) => theme.colors.background};
  }
  html[data-theme='dark'] { color-scheme: dark; }

  body {
    min-width: 320px;
    min-height: 100%;
    overflow-x: hidden;
    font-family: ${({ theme }) => theme.fonts.body};
    background:
      linear-gradient(rgba(13, 32, 52, .022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(13, 32, 52, .022) 1px, transparent 1px),
      ${({ theme }) => theme.gradients.page};
    background-size: 32px 32px, 32px 32px, auto;
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.7;
    letter-spacing: -0.012em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body:not(.chat-mode) {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
  body.chat-mode { padding-top: 0; padding-bottom: 0; }

  #root {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    isolation: isolate;
  }

  img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }
  button, input, select, textarea { font: inherit; }
  ul, ol { list-style: none; padding: 0; }
  address { font-style: normal; }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.heading};
    color: ${({ theme }) => theme.colors.text};
    margin: 0 0 ${({ theme }) => theme.spacing(2)};
    line-height: 1.28;
    letter-spacing: -0.045em;
    text-wrap: balance;
    word-break: keep-all;
  }
  h1 { font-size: ${({ theme }) => theme.typography.h1}; font-weight: 700; }
  h2 { font-size: ${({ theme }) => theme.typography.h2}; font-weight: 700; }
  h3 { font-size: ${({ theme }) => theme.typography.h3}; font-weight: 700; }

  p { margin: 0 0 ${({ theme }) => theme.spacing(2)}; }
  strong, b { font-weight: 780; }
  small { color: ${({ theme }) => theme.colors.textSecondary}; }

  a {
    color: ${({ theme }) => theme.semantic.linkColor};
    text-decoration: none;
    text-underline-offset: 3px;
    transition: color ${({ theme }) => theme.transitions.fast}, opacity .15s ease;
  }
  a:hover { color: ${({ theme }) => theme.semantic.linkHoverColor}; }
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focus.outline};
    outline-offset: 4px;
    border-radius: 2px;
  }

  button {
    min-height: 44px;
    padding: 10px 17px;
    border: 1px solid transparent;
    border-radius: ${({ theme }) => theme.radii.small};
    background: ${({ theme }) => theme.gradients.primary};
    color: ${({ theme }) => theme.on.primary};
    font-weight: 780;
    cursor: pointer;
    box-shadow: ${({ theme }) => theme.shadows.xs};
    transition:
      transform ${({ theme }) => theme.transitions.fast},
      box-shadow ${({ theme }) => theme.transitions.base},
      border-color ${({ theme }) => theme.transitions.fast},
      filter ${({ theme }) => theme.transitions.fast},
      opacity ${({ theme }) => theme.transitions.fast};
  }
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.hover};
    filter: brightness(.98);
  }
  button:active:not(:disabled) { transform: translateY(0); box-shadow: ${({ theme }) => theme.shadows.xs}; }
  button:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.focus.ring}; }
  button:disabled { opacity: ${({ theme }) => theme.opacity.disabled}; cursor: not-allowed; transform: none; }

  input, select, textarea {
    width: 100%;
    min-height: 48px;
    padding: 11px 13px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radii.small};
    background: ${({ theme }) => theme.colors.elevated};
    color: ${({ theme }) => theme.colors.text};
    box-shadow: inset 0 1px 1px rgba(13, 32, 52, .025);
    transition:
      border-color ${({ theme }) => theme.transitions.fast},
      box-shadow ${({ theme }) => theme.transitions.fast},
      background-color ${({ theme }) => theme.transitions.fast};
  }
  textarea { min-height: 112px; resize: vertical; }
  input::placeholder, textarea::placeholder { color: ${({ theme }) => theme.colors.textLight}; }
  input:hover:not(:disabled), select:hover:not(:disabled), textarea:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: ${({ theme }) => theme.focus.outline};
    box-shadow: ${({ theme }) => theme.focus.ring};
  }
  input:disabled, select:disabled, textarea:disabled {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.textLight};
    cursor: not-allowed;
  }

  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  th {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 780;
  }
  th, td { padding: 12px 14px; border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; }
  hr { border: 0; border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; }

  ::selection { background: ${({ theme }) => theme.colors.goldLight}; color: ${({ theme }) => theme.colors.text}; }

  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: ${({ theme }) => theme.colors.surfaceAlt}; }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border: 2px solid ${({ theme }) => theme.colors.surfaceAlt};
    border-radius: ${({ theme }) => theme.radii.pill};
  }

  body[data-hide-bottom-nav='1'] nav[role='navigation'][aria-label='하단 네비게이션'] {
    transform: translateY(110%);
    pointer-events: none;
  }
  body[data-hide-top-nav='1'] header[role='banner'] {
    transform: translateY(-110%);
    pointer-events: none;
  }

  .skip-link {
    position: fixed;
    top: max(8px, env(safe-area-inset-top, 0px));
    left: 12px;
    transform: translateY(-180%);
    padding: 10px 14px;
    background: ${({ theme }) => theme.colors.text};
    color: ${({ theme }) => theme.colors.surface};
    z-index: 10000;
    font-weight: 800;
    box-shadow: ${({ theme }) => theme.shadows.hover};
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
  .skip-link:focus-visible, .skip-link:focus {
    transform: translateY(0);
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
  }

  @media (max-width: 768px) {
    html { font-size: 93.75%; }
    body {
      line-height: 1.62;
      background-size: 24px 24px, 24px 24px, auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }

  @media (prefers-contrast: more) {
    button, input, select, textarea { border-width: 2px; }
    .skip-link { outline: 2px solid currentColor; outline-offset: 2px; }
  }
`;

export default GlobalStyle;
