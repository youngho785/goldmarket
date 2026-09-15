// functions/eslint.config.js
// ESM flat config for ESLint v9 + TypeScript
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // 공통 ignore(설정 파일 자체도 제외)
  {
    ignores: [
      "node_modules/**",
      "lib/**",
      ".firebase/**",
      "coverage/**",
      "dist/**",
      "eslint.config.*"
    ],
  },

  // JavaScript 파일
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2021, Intl: "readonly" },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      // 필요 시 CJS 허용하려면 다음 줄을 켜도 됩니다:
      // "@typescript-eslint/no-require-imports": "off",
    },
  },

  // TypeScript 권장 설정
  ...tseslint.configs.recommended,

  // TypeScript 추가 튜닝
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2021, Intl: "readonly" },
      parserOptions: {
        project: false, // 타입체크 비활성(속도↑). 필요하면 tsconfig 지정.
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // 급한 배포 땐 off/warn로 완화 가능
      // "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
