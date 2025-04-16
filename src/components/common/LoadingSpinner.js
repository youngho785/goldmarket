// src/components/common/LoadingSpinner.js
import React from "react";
import styled, { keyframes } from "styled-components";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  border: 8px solid #f3f3f3; /* Light grey */
  border-top: 8px solid ${({ theme }) => theme.colors.primary || "#3498db"}; /* Primary 색상 */
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: ${spin} 1s linear infinite;
  margin: 100px auto;
`;

const LoadingSpinner = () => {
  return <Spinner />;
};

export default LoadingSpinner;
