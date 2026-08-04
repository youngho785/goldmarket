// src/components/common/Card.js
import styled from "styled-components";

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: clamp(18px, 3vw, 28px);
  transition: border-color ${({ theme }) => theme.transitions?.base}, box-shadow ${({ theme }) => theme.transitions?.base}, transform ${({ theme }) => theme.transitions?.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: ${({ theme }) => theme.shadows.hover};
  }
`;
