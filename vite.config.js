// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      // React + Babel(styled-components 최적화)
      react({
        babel: {
          plugins: [
            [
              'babel-plugin-styled-components',
              {
                displayName: !isProd,              // dev에서 보기 좋은 class명
                fileName: !isProd,                 // dev에서 파일명 주석
                minify: isProd,                    // prod에서 CSS 축소
                pure: isProd,                      // dead-code 제거 힌트
                transpileTemplateLiterals: isProd, // 템플릿 리터럴 변환
                ssr: false                         // CSR이면 false
              }
            ]
          ]
        }
      })
    ],

    // SPA 기준 루트 경로(Firebase Hosting면 '/')
    base: '/',

    // import '@/...' 단축 경로 + react 중복 번들 방지
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      dedupe: ['react', 'react-dom'], // 동일 패키지 중복 로딩 방지
    },

    server: {
      host: true,
      port: 5173,
      strictPort: false,
      open: false,
    },

    preview: {
      host: true,
      port: 4173,
    },

    // ✅ .js 파일 안 JSX 파싱
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
    },

    // 개발 시 의존성 사전 번들
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'styled-components',
        'date-fns',
        'react-content-loader',
        'chart.js',
        'react-chartjs-2',
        'react-datepicker',
        'lucide-react',
      ],
    },

    build: {
      outDir: 'dist',
      target: 'es2020',
      sourcemap: false,            // 필요시 true
      chunkSizeWarningLimit: 1024, // 1MB
      rollupOptions: {
        output: {
          // 무거운 라이브러리 분리
          manualChunks: {
            firebase: [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/storage',
            ],
            charts: ['chart.js', 'react-chartjs-2'],
            datefns: ['date-fns'],
            ui: ['react-content-loader', 'react-datepicker', 'lucide-react'],
          },
        },
      },
    },
  };
});
