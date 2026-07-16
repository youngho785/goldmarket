// src/components/common/Input.js
import styled from "styled-components";

export const Input = styled.input`
  padding: ${({ theme }) => theme.spacing(1)};
  font-size: ${({ theme }) => theme.typography.body};
  border: 1px solid #ccc;
  border-radius: ${({ theme }) => theme.radii.small};
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;
