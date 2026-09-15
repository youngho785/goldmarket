# 프리마켓 데이터 안전 폐기 절차

코드와 보안 규칙에서는 프리마켓 컬렉션 접근을 차단했다. 운영 데이터는
복구 불가능한 삭제를 자동 실행하지 않으며, 아래 순서로 별도 처리한다.

## 1. 먼저 백업

Google Cloud의 Firestore 내보내기로 전체 데이터베이스를 날짜가 포함된
Cloud Storage 경로에 백업한다. 내보내기 성공과 객체 보존 정책을 확인하기
전에는 컬렉션이나 인덱스를 삭제하지 않는다.

## 2. 기존 고객 문의 복사

운영 자격 증명이 설정된 관리자 터미널에서 먼저 미리보기를 실행한다.

```powershell
npm --prefix functions run migrate:support
```

건수와 제목을 확인한 다음 실제 복사를 실행한다.

```powershell
npm --prefix functions run migrate:support -- --write
```

`supportTickets`의 문서 수와 답변 상태가 기존 문의와 일치하는지 관리자
화면에서 확인한다. 스크립트는 원본 `board` 문서를 삭제하지 않는다.

## 3. 완료확인서 기능 폐기

신규 `exchangeConfirmations` 문서를 생성하는 자동 기능과 백필 스크립트는 제거했다.
기존 운영 데이터가 이미 존재한다면 자동 삭제하지 말고, 보존 필요성과 개인정보 처리 기준을 확인한 뒤 별도 승인 절차로 정리한다.

## 4. 폐기 승인 후 삭제 가능한 대상

- `products`
- `orders`, `transactions`, `transactionReviews`
- `chats`, `chatMeta`, `chatSummaries`
- `favorites`, 상품 이미지 Storage 경로
- 이전 `board` 컬렉션(고객 문의 복사와 검증이 끝난 뒤)
- 프리마켓 전용 복합 인덱스

실제 삭제는 백업 위치, 보존기간, 담당자, 승인자를 감사 기록에 남긴 뒤
Firebase Console 또는 별도 승인된 일회성 스크립트로 수행한다.

## 5. 검색 노출 정리

이전 URL은 Firebase Hosting의 301 리디렉션으로 금교환 화면에 연결한다.
배포 후 Google Search Console에서 새 sitemap을 제출하고 이전 URL의
리디렉션 수집 상태를 확인한다. 검색결과 삭제 요청은 긴급 개인정보 노출
등 필요한 경우에만 별도로 사용한다.
