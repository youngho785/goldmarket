// src/components/common/Input.js
import styled from "styled-components";

export const Input = styled.input`
  min-height: 46px;
  padding: 10px 13px;
  font-size: ${({ theme }) => theme.typography.body};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  &:focus { border-color: ${({ theme }) => theme.focus.outline}; box-shadow: ${({ theme }) => theme.focus.ring}; outline: none; }
`;
