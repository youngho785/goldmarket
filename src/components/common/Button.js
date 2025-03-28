// src/components/common/Button.js
import styled from "styled-components";

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  font-size: 16px;
  font-weight: bold;
  padding: 12px 20px;
  border-radius: 6px;
  transition: all 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.accent};
  }
`;

export default Button;
