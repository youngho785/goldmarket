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
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  font-size: ${({ theme }) => theme.typography.body};
  line-height: 1;
  font-weight: 600;
  color: #fff;

  /* variant 해석 (variant 또는 $variant 중 존재하는 값 사용) */
  background: ${({ theme, variant, $variant }) => {
    const v = variant ?? $variant;
    if (v === "secondary") return theme.colors?.secondary || "#6b7280";
    if (v === "danger" || v === "delete") return theme.colors?.danger || "#e74c3c";
    return theme.colors?.primary || "#2563eb";
  }};

  border: none;
  border-radius: ${({ theme }) => theme.radii?.default || "8px"};
  cursor: pointer;
  transition: filter .15s ease, transform .02s ease;

  &:hover { filter: brightness(0.98); }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
