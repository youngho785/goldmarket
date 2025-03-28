// src/theme.js
export const theme = {
  colors: {
    primary: "#007bff",
    secondary: "#6c757d",
    background: "#ffffff",
    text: "#343a40",
    white: "#ffffff",
  },
  fonts: {
    main: "Arial, sans-serif",
    secondary: "'Inter', sans-serif",
  },
  spacing: (factor) => `${8 * factor}px`, // 함수 형태
};
