# KGM 통합개편 0~10 적용·배포 가이드

## 1. 적용 전

현재 `C:\goldmarket`에서 작업 중인 변경이 있다면 먼저 커밋하거나 별도 백업하세요.

권장:

```powershell
Set-Location C:\goldmarket
git status
git add -A
git commit -m "backup before kgm integrated redesign 0-10"
```

Git을 사용하지 않아도 패치의 `APPLY_KGM_PATCH.ps1`가 변경 대상 파일을 별도 백업한 뒤 덮어씁니다.

## 2. 패치 적용

패치 ZIP을 원하는 폴더에 압축 해제한 뒤 PowerShell에서:

```powershell
Set-Location <압축해제한_패치폴더>
.\APPLY_KGM_PATCH.ps1 -ProjectPath C:\goldmarket
```

업로드된 2026-10-01 14:30 기준본과 변경 대상 파일의 해시가 다르면 스크립트가 중단됩니다. 그 이후 로컬 수정이 있고 의도적으로 덮어쓸 때만 `-Force`를 사용하세요.

## 3. 로컬 검증

기존 `node_modules`가 정상이라면:

```powershell
Set-Location C:\goldmarket
npm run test:seo-guides
npm run test:analytics
npm run test:ux-upgrade
npm run test:ui-safety
npm run build
```

의존성이 없거나 꼬였으면 먼저:

```powershell
npm ci
```

Functions:

```powershell
npm --prefix functions ci
npm --prefix functions run build
```

## 4. 반드시 브라우저에서 확인할 화면

- `/` : 계산 → MY GOLD CTA
- `/my-gold` : 비회원 첫 화면에 가짜 금이 자동으로 들어오지 않는지
- `/register` → 이메일 인증 → `/welcome` : MY GOLD가 혜택보다 먼저인지
- `/gold-value` : 계산 후 MY GOLD 연결
- `/my-gold/alerts` : MEMBER GOLD가 MY GOLD 가치에 합산되지 않는지
- `/gold-to-gold`, `/gold-exchange` : 기존 계산/예약 흐름 정상인지
- `/stores` : 부산 직접 운영 문구
- `/guide/18k-10g-value` 등 신규 가이드

## 5. 웹 배포

로컬 빌드가 통과한 뒤:

```powershell
firebase deploy --only hosting
```

이번 패치는 Functions의 MY GOLD 목표알림 로직도 바뀌므로 웹만 배포해서는 0/7단계가 완전히 적용되지 않습니다.

## 6. 변경된 Functions 배포

Functions 빌드가 통과한 뒤 최소 배포 대상:

```powershell
firebase deploy --only functions:saveMyGoldAlertGoals,functions:checkMyGoldAlertGoals
```

`checkMyGoldAlertGoals`는 스케줄 함수이므로 배포 후 Firebase Console에서 정상 상태를 확인하세요.

## 7. Android 앱 반영

웹/Functions 검증 후:

```powershell
Set-Location C:\goldmarket
npm run android:prepare
```

그 다음 Android Studio 또는 기존 Gradle 절차로 테스트 앱을 설치해 다음을 확인하세요.

- 앱 첫 화면이 MY GOLD 우선인지
- 하단 메뉴가 `홈 / MY GOLD / 금 추가 / 알림 / MY`인지
- 금 추가가 정상 동작하는지
- MY GOLD 목표 알림 저장이 정상인지
- GOLD TO GOLD/예약 이동이 정상인지

Play Store 등록은 D-U-N-S/개발자 계정 준비가 끝난 뒤 현재 앱 버전을 새 AAB로 올리면 됩니다.

## 8. 배포 후 확인

- Google/Naver에서 새 페이지 색인은 즉시 반영되지 않습니다.
- `https://www.koreagoldmarket.com/sitemap.xml`에 신규 가이드가 포함됐는지 확인하세요.
- Analytics에서 신규 퍼널 이벤트가 유입되는지 DebugView/실시간 보고서로 확인하세요.
- 기존 회원의 MEMBER GOLD, 예약, 교환내역이 그대로 보이는지 실제 테스트 계정으로 확인하세요.

## 롤백

`APPLY_KGM_PATCH.ps1` 실행 시 출력되는 백업 폴더에 기존 변경 대상 파일이 보관됩니다. 문제가 생기면 해당 파일을 `C:\goldmarket`의 동일 경로로 되돌리거나 Git 커밋으로 복구하세요.
