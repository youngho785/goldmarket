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

```powershell
npm run lint
npm run build
npm --prefix functions run lint
npm --prefix functions run typecheck
npm --prefix functions run test:policy
npm run test:rules
```

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

웹 화면 변경을 Android 앱에 포함하려면 다음 명령으로 빌드와 Capacitor 동기화를 한 번에 실행합니다.

```powershell
npm run android:prepare
```

그 후 Android Studio에서 APK/AAB를 빌드합니다.

## 배포

루트와 Functions 빌드를 먼저 확인합니다.

```powershell
npm run build
cd functions
npm run build
cd ..
```

전체 배포:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT="60"
firebase deploy --only "hosting,functions,firestore:rules" --project goldmarket-0
```

Rules만 변경했을 때도 반드시 `firestore:rules`를 배포해야 합니다.

## 운영 주의

- 완료확인서(`exchangeConfirmations`) 신규 생성 기능은 사용하지 않습니다.
- FCM 토큰은 로그아웃만으로 삭제하지 않지만, 다른 계정이 같은 기기에 로그인하면 서버가 토큰 소유권을 새 계정으로 이전합니다.
- 예약 슬롯과 예약 가능일은 클라이언트 직접 쓰기를 허용하지 않습니다.
