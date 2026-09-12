# 한국골드마켓 스테이징·자동 테스트 운영

운영 데이터와 분리된 Firebase 프로젝트에서 규칙과 Functions를 먼저 검증한다.

## 1. 스테이징 프로젝트 만들기

1. Firebase Console에서 새 프로젝트를 만든다. 예: `goldmarket-staging`
2. 운영과 동일한 리전 `asia-northeast3`에 Firestore를 만든다.
3. Authentication에서 이메일/비밀번호, 휴대전화, SMS 다중 인증을 켠다.
4. Storage와 Cloud Messaging을 활성화한다.
5. App Check에 웹 앱을 등록하고 reCAPTCHA v3 사이트 키를 발급한다.

프로젝트 ID를 만든 다음 로컬에서 아래 명령을 실행한다.

```powershell
firebase use --add
```

표시되는 별칭에는 `staging`을 입력한다. 저장소의
`.firebaserc.example`은 형식 참고용이며 실제 프로젝트 ID로 바꿔
`.firebaserc`에 추가한다.

## 2. 스테이징 환경 변수

`.env.example`을 참고해 `.env.staging.local`을 만들고 App Check 사이트
키와 VAPID 키를 넣는다. 비밀키나 서비스 계정 JSON은 Git에 커밋하지 않는다.

Functions의 App Check 강제는 프로젝트별 환경 파일에서 단계적으로 켠다.

```text
ENFORCE_APP_CHECK=true
```

사이트 키 배포와 정상 호출 확인 전에는 이 값을 `false`로 둔다.

관리자 MFA는 다음 순서로 적용한다.

1. `VITE_REQUIRE_ADMIN_MFA=false` 상태로 관리자 보안 화면에서 등록
2. 로그아웃 후 SMS 2차 인증 로그인이 되는지 확인
3. 스테이징에서 `VITE_REQUIRE_ADMIN_MFA=true`로 빌드해 강제 정책 확인
4. 운영 관리자 전원이 등록한 뒤 운영에도 같은 값을 적용

## 3. 로컬 보안 규칙 테스트

최초 한 번 테스트 의존성을 설치한다.

```powershell
npm --prefix tests/rules install
```

그 다음 저장소 루트에서 실행한다.

```powershell
firebase emulators:exec --only firestore "npm --prefix tests/rules test"
```

## 4. 스테이징 배포 순서

```powershell
$env:SITEMAP_OFFLINE='1'
npm run build
firebase deploy --project staging --only firestore:rules,firestore:indexes,storage
firebase deploy --project staging --only functions
firebase deploy --project staging --only hosting
```

각 단계가 성공한 뒤 회원가입, 웰컴 적립, 예약 신청, 관리자 승인, 완료,
적립금 사용, 예약 상태 전환, 알림 수신, 문의 답변을 한 번씩 검증한다.

## 5. 운영 승격 기준

- 웹·Functions 빌드와 린트 통과
- Firestore 규칙 자동 테스트 통과
- 관리자 MFA 로그인 성공
- App Check 지표에서 정상 요청 확인
- 신규 예약부터 완료까지 감사 로그가 생성되며 완료확인서는 생성하지 않음
- 법률·세무 검토에서 확정한 문구와 증빙 구조 반영
