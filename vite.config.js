// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { Buffer } from 'node:buffer';
import ogSocialCardBase64 from './src/assets/ogSocialCard.js';
import goldVerificationImage from './src/assets/goldVerificationImage.js';

const emitBrandAssets = {
  name: 'emit-koreagoldmarket-brand-assets',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'og.jpg',
      source: Buffer.from(ogSocialCardBase64, 'base64'),
    });
    this.emitFile({
      type: 'asset',
      fileName: 'gold-verification.jpg',
      source: Buffer.from(
        goldVerificationImage.replace(/^data:image\/jpeg;base64,/, ''),
        'base64'
      ),
    });
  },
};

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
      }),
      emitBrandAssets,
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
      // Android/Gradle build report HTML까지 엔트리로 스캔하지 않도록
      // 실제 Vite 앱 엔트리만 대상으로 제한합니다.
      entries: ['index.html'],
      // dependency scanner는 top-level esbuild 옵션과 별도로 동작하므로
      // src/*.js 안의 JSX도 JSX로 해석하도록 명시합니다.
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
      include: [
        'react',
        'react-dom',
        'styled-components',
        'date-fns',
        'react-content-loader',
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
            datefns: ['date-fns'],
            ui: ['react-content-loader', 'react-datepicker', 'lucide-react'],
          },
        },
      },
    },
  };
});
