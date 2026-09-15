# App Check rollout policy

한국골드마켓의 App Check는 기존 Firebase Auth, Firestore/Storage Security Rules,
서버 권한 검사를 대체하지 않고 추가 방어층으로 사용합니다.

## 현재 코드 기준

- Web/PWA는 `VITE_FIREBASE_APPCHECK_SITE_KEY`가 있을 때 Firebase Web App Check
  reCAPTCHA v3 provider를 초기화합니다.
- 로컬 개발용 debug token은 Vite DEV 모드에서만 사용하도록 되어 있습니다.
- Callable Cloud Functions는 모두 공통 `ENFORCE_APP_CHECK` 설정을 연결하고 있습니다.
- `ENFORCE_APP_CHECK`의 기본 운영 예시는 `false`입니다.
- Capacitor Android 프로젝트에는 현재 Play Integrity 기반 native App Check provider가
  포함되어 있지 않습니다.

## 중요한 운영 원칙

Android native provider를 준비하지 않은 상태에서 Callable Functions 또는
Firestore/Storage의 App Check 강제 적용을 먼저 켜면 Android 앱의 정상 요청이
차단될 수 있습니다.

따라서 App Check는 다음 순서로 전환합니다.

1. Web/PWA App Check 사이트 키를 설정하고 실제 운영 요청이 App Check 검증됨으로
   집계되는지 Firebase Console의 App Check 지표에서 확인합니다.
2. Android 앱에 Play Integrity 또는 검증된 native App Check provider를 연결하고,
   실제 Android 요청도 검증됨으로 집계되는지 확인합니다.
3. 로컬/테스트용 debug token이 운영 빌드에 포함되지 않았는지 확인합니다.
4. Callable Functions의 `ENFORCE_APP_CHECK=true`를 설정한 상태로 Functions를
   재배포하고 핵심 사용자/관리자 callable을 실제 기기에서 smoke test 합니다.
5. 마지막으로 Firebase Console에서 Firestore/Storage 등 필요한 제품의 App Check
   enforcement를 순차적으로 활성화합니다.
6. 활성화 직후 오류율과 App Check 지표를 확인하고 웹/PWA/Android 핵심 흐름을
   다시 시험합니다.

## 점검 명령

정적 정책 검사:

    npm run test:app-check

로컬 설정 상태 검사(키/토큰 값 자체는 출력하지 않음):

    npm run app-check:status

App Check enforcement를 변경하기 전에는 두 명령과 기존 전체 품질 검사를 먼저
통과시킵니다.
