// src/styles/GlobalStyle.js
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  /* 기본 리셋 */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* body 기본 스타일 */
  body {
    font-family: ${({ theme }) => theme.fonts.secondary};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }

  a {
    text-decoration: none;
    color: ${({ theme }) => theme.colors.primary};
  }

  button {
    cursor: pointer;
    font-family: inherit;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    transition: all 0.3s;
  }

  button:hover {
    opacity: 0.8;
  }
`;

export default GlobalStyle;
