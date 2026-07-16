// src/theme.dark.js
import { theme as base } from "./theme";

export const darkTheme = {
  ...base,
  colors: {
    ...base.colors,
    background: "#0F1214",  // near-black (웜블랙)
    surface:    "#14181B",
    text:       "#E6E8EA",
    textSecondary: "#A8B0B8",
    border:     "#262B2F",

    // 다크에 맞춘 포인트 채도/명도 조정
    primary:    "#B6934D",   // 조금 더 밝은 골드
    primaryDark:"#8C6A2F",
    link:       "#89A4BF",
    linkHover:  "#A8BED4",
  },
  on: { ...base.on, surface: "#E6E8EA", background: "#E6E8EA", primary: "#1B1B1B" },
  semantic: {
    ...base.semantic,
    buttonBg:      "#1B2127",
    buttonHoverBg: "#12161B",
    buttonAltBg:   "#B6934D",
    buttonAltText: "#1B1B1B",
  },
};
