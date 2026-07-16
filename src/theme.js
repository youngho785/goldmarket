// src/theme.js
//
// Calm Neo — White / Azure Blue primary / Mint accent
// - 배경: 완전 화이트(집중 ↑)
// - 주색: 애저 블루 (신뢰·또렷함) / 다크는 톤다운 블루
// - 보조: 민트·시안(상쾌) 과유불급 방지로 포인트만
// - 퍼플은 ‘틴트/배지’ 정도에만 아주 미세 사용

const base = {
  fonts: {
    heading:
      "'Inter', system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans KR', sans-serif",
    body:
      "'Noto Sans KR', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },

  spacing: (factor) => `${8 * factor}px`,

  radii: { small: "8px", default: "14px", large: "22px", pill: "999px" },

  shadows: {
    card: "0 4px 14px rgba(17, 25, 40, 0.06)",
    hover: "0 10px 24px rgba(17, 25, 40, 0.10)",
    lg: "0 18px 40px rgba(17, 25, 40, 0.14)",
  },

  focus: {
    outline: "#1E40AF",
    ring: "0 0 0 3px rgba(30,64,175,0.28)", // 블루 포커스링
  },

  opacity: { disabled: 0.55, overlay: 0.42 },

  typography: {
    h1: "32px",
    h2: "24px",
    h3: "18px",
    body: "16px",
    small: "14px",
  },
};

/* ───────────── LIGHT: Calm Neo ───────────── */
export const theme = {
  ...base,

  colors: {
    // Brand (메인: 애저 블루)
    primary: "#2D6AE3",      // Azure Blue
    primaryDark: "#1E40AF",  // Deep Azure for hover/active

    // Secondary (살짝의 민트/티얼)
    secondary: "#0EA5A4",    // Teal-500 (딥 민트)

    // Status (톤 차분)
    info: "#64748B",         // Slate
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#EF4444",

    // Neutrals
    background: "#FFFFFF",   // ← 기본 바탕 화이트
    surface: "#F8FAFC",      // 아주 옅은 쿨그레이/블루
    surfaceAlt: "#F5F7FB",

    // Text
    text: "#111827",         // Gray-900 (순블랙보다 눈에 덜 피곤)
    textSecondary: "#6B7280",
    textLight: "#9AA4B2",

    // Lines
    border: "#E5EAF1",
    dividerSubtle: "#EEF2F8",

    // Links (메인 블루와 통일)
    link: "#2563EB",
    linkHover: "#1D4ED8",

    // Accents (포인트만 소량 사용)
    accentMint: "#06B6D4",   // Cyan-500
    accentCoral: "#FB7185",  // Soft Coral

    // Alerts (기본)
    alertBg: "#EF4444",
    alertText: "#FFFFFF",

    // Buttons
    buttonText: "#070707ff",
  },

  // 그라디언트는 블루→시안으로 은은하게
  gradients: {
    primary: "linear-gradient(135deg, #2D6AE3 0%, #06B6D4 100%)",
    success: "linear-gradient(135deg, #0EA5A4, #16A34A)",
    mintGlow: "linear-gradient(135deg, #CFFAFE, #E0EAFF)", // 아주 연한 글로우
  },

  // 배경 위 텍스트 대비
  on: {
    primary: "#FFFFFF",
    primaryDark: "#FFFFFF",
    success: "#FFFFFF",
    warning: "#111827",
    error: "#FFFFFF",
    surface: "#111827",
    background: "#111827",
  },

  // Semantic tokens
  semantic: {
    // Buttons
    buttonBg: "#2D6AE3",
    buttonHoverBg: "#1E40AF",
    buttonAltBg: "#EDF2FF",  // 틴트 버튼(약한 강조)
    buttonAltText: "#111827",

    // Links
    linkColor: "#2563EB",
    linkHoverColor: "#1D4ED8",

    // Chips / Badges (퍼플은 아주 옅은 틴트로만)
    badgeInfoBg: "#EEF2FF",   // Pale Blue/Lilac tint
    badgeInfoText: "#1E40AF",

    // Alerts (배경형)
    alertErrorBg: "#FEE2E2",
    alertErrorText: "#7F1D1D",
    alertWarningBg: "#FEF3C7",
    alertWarningText: "#78350F",
    alertSuccessBg: "#DCFCE7",
    alertSuccessText: "#14532D",

    subtleLine: "#EEF2F8",
    subtleTint: "#F8FAFC",
  },

  transitions: { fast: "120ms ease", base: "200ms ease", slow: "320ms ease" },
};

/* ───────────── DARK: Calm Neo Night ─────────────
   다크도 ‘차분한 블루’ 톤으로 눈부심 최소화 */
export const darkTheme = {
  ...base,

  colors: {
    primary: "#79A8FF",       // 톤다운 애저
    primaryDark: "#5D85E6",

    secondary: "#34D399",     // 민트 톤다운

    info: "#94A3B8",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",

    background: "#0B1220",
    surface: "#0F172A",
    surfaceAlt: "#0B1526",

    text: "#E5E7EB",
    textSecondary: "#A1A7B3",
    textLight: "#8A94A6",

    border: "#1E2633",
    dividerSubtle: "#16202C",

    link: "#93C5FD",
    linkHover: "#BFDBFE",

    accentMint: "#67E8F9",
    accentCoral: "#FDA4AF",

    alertBg: "#F87171",
    alertText: "#0B1220",
    buttonText: "#0B1220",
  },

  gradients: {
    primary: "linear-gradient(135deg, #5D85E6, #67E8F9)",
    success: "linear-gradient(135deg, #34D399, #22C55E)",
    mintGlow: "linear-gradient(135deg, #0F172A, #111827)", // 어두운 글로우
  },

  on: {
    primary: "#0B1220",
    primaryDark: "#0B1220",
    success: "#0B1220",
    warning: "#0B1220",
    error: "#0B1220",
    surface: "#E5E7EB",
    background: "#E5E7EB",
  },

  semantic: {
    buttonBg: "#5D85E6",
    buttonHoverBg: "#79A8FF",
    buttonAltBg: "#111827",
    buttonAltText: "#E5E7EB",

    linkColor: "#93C5FD",
    linkHoverColor: "#BFDBFE",

    badgeInfoBg: "#152034",
    badgeInfoText: "#BFD4FF",

    alertErrorBg: "#2A1717",
    alertErrorText: "#F1D0D0",
    alertWarningBg: "#2B2213",
    alertWarningText: "#F6E7C9",
    alertSuccessBg: "#0E1F18",
    alertSuccessText: "#CFF8E4",

    subtleLine: "#16202C",
    subtleTint: "#0F172A",
  },

  transitions: { fast: "120ms ease", base: "200ms ease", slow: "320ms ease" },
};

export default theme;
