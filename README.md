# 한국골드마켓

React 19, Vite 7, Firebase로 구성된 한국골드마켓 웹 애플리케이션입니다. 상품 프리마켓, 금 교환 예약, 채팅, 알림과 관리자 기능을 포함합니다.

## 준비 사항

- Node.js 22 및 npm
- Firebase CLI와 `goldmarket-0` 프로젝트 접근 권한
- 사이트맵 및 데이터 마이그레이션용 Firebase Admin Application Default Credentials

## 설치와 로컬 실행

```powershell
npm ci
npm --prefix functions ci
npm run dev
```

루트의 `.env.local`에 필요한 `VITE_*` 값을 설정합니다. 실제 값이 들어간 `.env*` 파일은 Git에 커밋하지 않습니다.

## 검사

```powershell
npm run lint
npm --prefix functions run typecheck
npm --prefix functions run lint
```

Firestore 없이 사이트맵 생성 로직만 확인할 때는 별도 출력 폴더를 사용합니다.

```powershell
$env:SITEMAP_OFFLINE="1"
$env:SITEMAP_OUT_DIR=".\tmp\sitemap-check"
node scripts/generate-sitemap.mjs
```

실제 배포용 `npm run build`는 Firebase Admin 자격증명이 필요하며, 공개 상품이 0개이면 실수로 빈 RSS를 배포하지 않도록 실패합니다. 의도적으로 공개 상품이 없는 경우에만 `SITEMAP_ALLOW_EMPTY=1`을 지정합니다.

## 기존 상품 호환 필드 보정

상품 공개 규칙은 `approved`, `completed`, `moderationStatus`를 사용합니다. 배포 전에 먼저 드라이런 결과를 확인합니다.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\goldmarket-service-account.json"
npm run migrate:products
```

출력된 상품과 변경값을 확인한 뒤에만 실제 반영합니다.

```powershell
npm run migrate:products -- --apply
```

`approved` 필드가 없던 기존 상품은 기본 공개 상태로 보정됩니다. 이미 `approved: false`로 공개 중지된 상품은 다시 노출되지 않으며, 관리자가 상품 관리 화면에서 개별적으로 재공개할 수 있습니다.

## 권장 배포 순서

```powershell
firebase deploy --only functions
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules,storage
npm run build
firebase deploy --only hosting
```

Functions를 먼저 배포해야 후기·퀴즈·관리자 역할 변경 화면과 서버 Callable의 버전 불일치를 피할 수 있습니다. Firestore 인덱스가 생성 완료 상태가 된 것을 확인한 뒤 Rules와 Hosting을 배포하세요.

배포 전 `git status --short`에서 `.env`, ZIP, 백업 파일, `repomix-output.*`이 추적되지 않는지 확인합니다.
