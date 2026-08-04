// src/components/common/FormComponents.js
import styled from "styled-components";

export const Label = styled.label`
  font-size: .94rem;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 7px;
  display: block;
`;

export const Select = styled.select`
  min-height: 46px;
  padding: 10px 13px;
  font-size: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
`;

export const Input = styled.input`
  min-height: 46px;
  padding: 10px 13px;
  font-size: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
`;

export const TextArea = styled.textarea`
  min-height: 128px;
  padding: 12px 13px;
  font-size: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
  resize: vertical;
`;
