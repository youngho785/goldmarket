# 한국골드마켓 1~4차 통합 개선 내역

기준일: 2026-08-20

## 1차 — 긴급 정리

### 완료확인서 신규 생성 중단
- `functions/src/audit.ts`의 완료 시 `exchangeConfirmations` 자동 생성 로직 제거
- `functions/scripts/backfill-confirmations.mjs` 제거
- `functions/package.json`의 백필 명령 제거
- Firestore Rules의 완료확인서 사용자 읽기 규칙 제거
- 완료확인서 전용 Rules 테스트 제거
- 기존 과거 문서는 자동 삭제하지 않음
- 계정 탈퇴 시 과거 문서 개인정보 익명화 정리 코드는 유지

### FCM 토큰 계정 교차 방지
- `bindPushToken` Callable 추가
- 같은 FCM 토큰이 다른 계정에 연결되어 있으면 기존 계정에서 제거하고 현재 로그인 계정으로 이전
- Web/Android Native 토큰 모두 같은 서버 소유권 규칙 사용
- 단순 로그아웃만으로는 토큰을 없애지 않아 로그아웃 상태 예약 알림 정책은 유지

### 개인정보/문서 정리
- 금교환 예약 개인정보 항목에서 이메일 제거
- README와 레거시/스테이징/검토 문서를 현재 서비스 구조에 맞게 정리

## 2차 — 서버 안정화/보안

### 예약 상태 전환 서버 강제
허용 상태 전환:
- `requested -> scheduled | canceled | rejected`
- `scheduled -> in_progress | canceled`
- `in_progress -> completed | canceled`
- `rejected -> requested`
- `completed`, `canceled`는 종료 상태

일정 변경은 기존 전용 `rescheduleGoldExchangeGroup`을 사용하고, 변경 후 `requested`에서 관리자 재확정을 받습니다.

### 닉네임 원자 선점
- `checkNicknameAvailability` Callable 추가
- 가입 최종 단계는 서버 `claimNickname` 트랜잭션으로 선점
- 가입 전 중복 확인과 실제 가입 사이의 경쟁 조건 방지
- 닉네임 인덱스/프로필 직접 클라이언트 쓰기 차단

### Firestore Rules 축소
- `appConfig` 공개 읽기를 `goldRates`, `reservedSlots`, `bookingAvailability`로 한정
- `profiles`는 본인/관리자만 읽기
- `users`는 클라이언트가 수정 가능한 필드 allow-list 적용

## 3차 — Android/정리

### Android Push 아이콘
- `@drawable/ic_stat_goldmarket` 상태바용 단색 아이콘 추가
- AndroidManifest 기본 FCM notification icon 지정
- Functions Native Android payload에도 아이콘 지정
- 웹 badge 아이콘을 실제 96x96 단색 PNG로 교체

### Android 동기화
프로젝트 루트에 다음 명령 추가:

```powershell
npm run android:prepare
```

내부 동작:

```text
npm run build
npx cap sync android
```

### 죽은 코드 제거
현재 import graph에서 사용되지 않는 것으로 확인된 이전 Route/계산기/LedSign/구형 hook/util 파일 제거.

## 4차 — 운영 기능/테스트

### 예약 휴무·시간 마감 관리
관리자 금교환 화면에서 날짜별로:
- 하루 전체 예약 마감
- 특정 시간대만 마감
- 사유 기록
- 마감 해제

가능합니다.

저장 위치:
`appConfig/bookingAvailability`

고객 신규 예약과 일정 변경 화면에서 즉시 반영되고, 서버 Functions에서도 다시 검증하므로 오래된 클라이언트가 우회할 수 없습니다.

주의: 이미 확정된 기존 예약은 휴무 설정만으로 자동 취소되지 않습니다. 관리자가 해당 예약을 별도로 처리해야 합니다.

### 자동 테스트
- 예약 상태 전환 policy 테스트 추가
- 휴무/시간 차단 policy 테스트 추가
- Rules 테스트에서 공개 appConfig 범위, profiles 접근, users 임의 필드 차단 검증 추가
- GitHub Actions quality workflow에 policy 테스트 포함

### 관리자 오늘 예약 개선
- 오늘 예약의 확인 대기/확정/진행 건수 표시
- 일정 변경 확인 대기 건수 별도 표시
- 신규 예약은 `예약 확정`, 일정 변경은 `변경 예약 확정`으로 버튼/표시 구분

## 배포 전 로컬 검증

프로젝트 루트:

```powershell
npm run build
```

Functions:

```powershell
cd functions
npm run build
npm run test:policy
cd ..
```

Rules 테스트(로컬 Firebase Emulator 사용 가능 시):

```powershell
npm run test:rules
```

## Firebase 배포

이번 변경은 Hosting, Functions, Firestore Rules를 모두 포함합니다.

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT="60"
firebase deploy --only "hosting,functions,firestore:rules" --project goldmarket-0
```

## Android 앱 반영

웹/Functions/Rules 배포와 별도로 Android 앱 화면을 최신 소스로 맞추려면:

```powershell
npm run android:prepare
```

이후 Android Studio에서 APK/AAB를 빌드합니다.
