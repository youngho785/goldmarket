// src/styles/GlobalStyle.js
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  /* Reset */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body, #root { height: 100%; }

  html { scroll-behavior: smooth; font-size: 100%; }

  body {
    min-height: 100%;
    font-family: ${({ theme }) => theme.fonts?.body || "system-ui"}, sans-serif;
    background-color: ${({ theme }) => theme.colors?.background || "#fff"};
    color: ${({ theme }) => theme.colors?.text || "#111"};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* (채팅 외 페이지) 안전영역 패딩 */
  body:not(.chat-mode) {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* 채팅 페이지: 바디 패딩 제거 → 컴포넌트가 직접 처리 */
  body.chat-mode { padding-top: 0; padding-bottom: 0; }

  #root { min-height: 100%; display: flex; flex-direction: column; }

  img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }
  ul, ol { list-style: none; }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts?.heading || "inherit"}, sans-serif;
    color: ${({ theme }) => theme.colors?.text || "#111"};
    margin-bottom: ${({ theme }) => (theme.spacing ? theme.spacing(2) : "16px")};
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  h1 { font-weight: 800; }
  h2 { font-weight: 700; }
  h3 { font-weight: 600; }

  p { margin-bottom: ${({ theme }) => (theme.spacing ? theme.spacing(2) : "16px")}; }

  a {
    color: ${({ theme }) => theme.colors?.link || "#0d6efd"};
    text-decoration: none;
    text-underline-offset: 3px;
    transition: color .2s ease, text-decoration-color .2s ease, opacity .2s ease;
  }

  button {
    font-family: inherit;
    padding: 8px 12px;
    background: ${({ theme }) => theme.semantic?.buttonBg || theme.colors?.primary || "#111"};
    color: ${({ theme }) => theme.colors?.buttonText || "#fff"};
    border: 1px solid ${({ theme }) => theme.colors?.border || "#e5e7eb"};
    border-radius: ${({ theme }) => theme.radii?.default || "10px"};
    cursor: pointer;
    transition: background-color .2s ease, box-shadow .2s ease, transform .12s ease, opacity .2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,.06);
  }
  button:hover:not(:disabled),
  button:focus-visible:not(:disabled) {
    background-color: ${({ theme }) => theme.semantic?.buttonHoverBg || theme.colors?.primaryDark || "#222"};
    outline: none;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0,0,0,.12), 0 0 0 3px rgba(0,123,184,.18);
  }
  button:active:not(:disabled) { transform: translateY(0); }
  button:disabled { opacity: .6; cursor: not-allowed; }

  input, select, textarea {
    font-family: inherit;
    padding: 8px;
    border: 1px solid ${({ theme }) => theme.colors?.border || "#e5e7eb"};
    border-radius: ${({ theme }) => theme.radii?.small || "8px"};
    background-color: ${({ theme }) => theme.colors?.surface || "#fff"};
    color: ${({ theme }) => theme.colors?.text || "#111"};
    transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
    width: 100%;
  }
  input::placeholder, textarea::placeholder { color: ${({ theme }) => theme.colors?.textLight || "#999"}; }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.primary || "#0aa8e8"};
    box-shadow:
      0 1px 2px rgba(0,0,0,.06),
      0 0 0 3px rgba(0,168,232,.18);
  }

  ::selection {
    background-color: ${({ theme }) => theme.colors?.primary || "#0aa8e8"};
    color: ${({ theme }) => theme.colors?.buttonText || "#fff"};
  }

  @media (max-width: 768px) { html { font-size: 87.5%; } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: ${({ theme }) => theme.colors?.surface || "#fff"}; }
  ::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.colors?.border || "#ddd"}; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }

  /* ───────── Hidden nav helpers for chat ───────── */

  /* 하단 네비게이션 숨김 (예: <nav role="navigation" aria-label="하단 네비게이션">) */
  body[data-hide-bottom-nav='1']
  nav[role="navigation"][aria-label="하단 네비게이션"] {
    transform: translateY(100%);
    transition: transform .2s ease;
    pointer-events: none;
  }

  /* 상단 네비게이션/헤더 숨김 (예: <header role="banner">) */
  body[data-hide-top-nav='1']
  header[role="banner"] {
    transform: translateY(-100%);
    transition: transform .2s ease;
    pointer-events: none;
  }

  /* ───────── Accessibility: Skip Link ───────── */
  .skip-link {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 0px);
    left: 8px;
    transform: translateY(-200%);
    padding: 8px 12px;
    border-radius: 8px;
    background: ${({ theme }) => theme.colors?.text || "#111"};
    color: ${({ theme }) => theme.colors?.background || "#fff"};
    z-index: 10000; /* 헤더/모달보다 위 */
    font-weight: 800;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(0,0,0,.15);
    transition: transform .15s ease;
  }
  .skip-link:focus-visible,
  .skip-link:focus {
    transform: translateY(8px);
    outline: 2px solid ${({ theme }) => theme.colors?.background || "#fff"};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .skip-link { transition: none; }
  }

  @media (prefers-contrast: more) {
    .skip-link {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
  }
`;

export default GlobalStyle;
