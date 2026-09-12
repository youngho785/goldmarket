/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false }, // styled-components와 충돌 방지
  theme: { extend: {} },
  plugins: [],
};
