# 한국골드마켓

React 19 + Vite 7 + Firebase + Capacitor로 구성된 금교환 예약 플랫폼입니다. 현재 핵심 기능은 금교환 예상 중량 계산, 방문 예약, 예약 변경·취소·재예약, 관리자 확정/진행/완료 처리, 알림, 금시세, 문의, 회원 보너스입니다. 프리마켓/중고거래 기능은 운영 기능에 포함하지 않습니다.

## 개발 환경

- Node.js 22
- Firebase project: `goldmarket-0`
- Functions region: `asia-northeast3`
- Android: Capacitor

## 설치

```powershell
npm ci
npm --prefix functions ci
```

실제 비밀값이 들어간 `.env*`, 서비스 계정 JSON, keystore는 저장소나 공유 ZIP에 포함하지 않습니다.

## 로컬 실행

```powershell
npm run dev
```

## 품질 검사

기본 검증 순서는 다음과 같습니다.

```powershell
npm run lint
npm run build
npm run test:release
```

화면 변경이 있을 때는 변경 범위에 따라 필요한 smoke test를 추가합니다.

```powershell
npm run test:smoke
npm run test:mobile
```

	est:release가 현재 기본 release gate입니다. 과거의 	ests/e2e 구조는 사용하지 않습니다.
## 예약 상태 원칙

```text
신규 예약: requested → scheduled → in_progress → completed
일정 변경: scheduled → (reschedule callable) requested → scheduled
사용자 취소: requested/scheduled → canceled (종료)
관리자 거절: requested → rejected
거절 복구: rejected → requested
canceled/completed: 최종 상태, 복구하지 않음
```

취소된 예약에서 다시 신청할 때는 기존 예약을 되살리지 않고 새 `groupId`를 생성합니다.

## 예약 가능일 관리

관리자 `/admin/gold-exchange`에서 휴무일 또는 특정 시간 예약 마감을 설정할 수 있습니다. 고객 화면과 Functions 서버 검증이 모두 같은 `appConfig/bookingAvailability` 설정을 사용합니다.

## Android 준비

웹 화면 변경을 Android 앱에 반영할 때는 먼저 빌드와 Capacitor 동기화를 실행합니다.

```powershell
Set-Location C:\goldmarket
npm run android:prepare
```

그 후 Debug APK가 필요하면 다음과 같이 빌드합니다.

```powershell
Set-Location C:\goldmarket\android
.\gradlew.bat assembleDebug
```

Debug APK 경로:

```text
C:\goldmarket\android\app\build\outputs\apk\debug\app-debug.apk
```

Android 관련 변경은 필요한 경우 실제 기기에서도 확인합니다.
## 배포

배포 전에 관련 테스트를 완료합니다.

운영 배포는 명시적으로 확인한 뒤 실제 변경된 대상만 선택적으로 수행합니다.

프론트엔드만 변경한 경우:

```powershell
firebase deploy --only hosting --project goldmarket-0
```

Functions를 변경한 경우:

```powershell
firebase deploy --only functions --project goldmarket-0
```

Firestore Rules를 변경한 경우:

```powershell
firebase deploy --only firestore:rules --project goldmarket-0
```

Storage Rules를 변경한 경우:

```powershell
firebase deploy --only storage --project goldmarket-0
```

변경하지 않은 Functions나 Rules를 함께 배포하지 않습니다.
## 운영 주의

- 완료확인서(`exchangeConfirmations`) 신규 생성 기능은 사용하지 않습니다.
- FCM 토큰은 로그아웃만으로 삭제하지 않지만, 다른 계정이 같은 기기에 로그인하면 서버가 토큰 소유권을 새 계정으로 이전합니다.
- 예약 슬롯과 예약 가능일은 클라이언트 직접 쓰기를 허용하지 않습니다.
