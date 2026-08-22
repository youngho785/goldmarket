한국골드마켓 1~4차 통합 개선 — 적용 방법
기준일: 2026-08-20

1) 이 ZIP 내부의 파일을 C:\goldmarket에 경로 그대로 덮어씁니다.
2) DELETE_THESE_FILES.txt에 적힌 구형 파일을 삭제합니다.
3) 오래된 Functions 컴파일 산출물을 제거하고 다시 빌드합니다.

PowerShell:
  cd C:\goldmarket
  npm run build

  cd functions
  npm run clean
  npm run build
  npm run test:policy
  cd ..

가능하면 Rules 테스트:
  npm run test:rules

모두 성공한 뒤 배포:
  $env:FUNCTIONS_DISCOVERY_TIMEOUT="60"
  firebase deploy --only "hosting,functions,firestore:rules" --project goldmarket-0

Android 앱도 최신 화면으로 다시 만들 때:
  npm run android:prepare
그 후 Android Studio에서 APK/AAB 빌드.

중요:
- functions/lib는 소스가 아니라 빌드 산출물입니다. `npm run clean` 후 `npm run build`로 반드시 재생성합니다.
- android/app/src/main/assets/public도 생성 산출물입니다. `npm run android:prepare`가 현재 웹 소스로 다시 만듭니다.
- 기존 Firestore의 과거 exchangeConfirmations 문서는 이 패치가 자동 삭제하지 않습니다.
