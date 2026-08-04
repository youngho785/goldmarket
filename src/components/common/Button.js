// src/components/common/Button.jsx
import styled from "styled-components";

/**
 * 공용 Button 컴포넌트
 * - DOM으로 흘러가면 경고를 유발하는 커스텀 prop(`variant`, `$variant`)을 필터링합니다.
 * - 기존 `variant`와 transient prop `$variant`를 모두 지원합니다.
 * - 지원 variants: 'primary'(default), 'secondary', 'danger' | 'delete'
 */
export const Button = styled.button.withConfig({
  shouldForwardProp: (prop, defaultValidator) =>
    prop !== "variant" && prop !== "$variant" && defaultValidator(prop),
})`
  min-height: 46px;
  padding: 11px 18px;
  font-size: ${({ theme }) => theme.typography.body};
  line-height: 1.2;
  font-weight: 750;
  color: ${({ theme, variant, $variant }) => {
    const v = variant ?? $variant;
    return v === "secondary" ? theme.semantic?.buttonAltText || theme.colors.text : theme.on?.primary || "#fff";
  }};

  /* variant 해석 (variant 또는 $variant 중 존재하는 값 사용) */
  background: ${({ theme, variant, $variant }) => {
    const v = variant ?? $variant;
    if (v === "secondary") return theme.semantic?.buttonAltBg || theme.colors?.surfaceAlt || "#eef2f6";
    if (v === "danger" || v === "delete") return theme.colors?.danger || "#e74c3c";
    return theme.gradients?.primary || theme.colors?.primary || "#1f3a5f";
  }};

  border: 1px solid ${({ theme, variant, $variant }) => {
    const v = variant ?? $variant;
    return v === "secondary" ? theme.colors?.border || "#dce3ec" : "transparent";
  }};
  border-radius: ${({ theme }) => theme.radii?.default || "8px"};
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows?.xs};
  transition: filter .15s ease, transform .15s ease, box-shadow .2s ease;

  &:hover { filter: brightness(0.98); transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows?.hover}; }
  &:active { transform: translateY(0); }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.focus?.ring}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
