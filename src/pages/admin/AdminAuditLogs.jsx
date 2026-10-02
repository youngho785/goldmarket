import React, { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import styled from "styled-components";
import { db } from "../../firebase/firebase";

const Page = styled.section`display: grid; gap: 16px;`;
const Header = styled.header`
  h2 { margin: 0 0 6px; }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const List = styled.div`display: grid; gap: 10px;`;
const Item = styled.article`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(160px, .7fr) minmax(260px, 1.5fr) minmax(150px, .65fr);
  gap: 14px;
  align-items: start;
  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;
const Code = styled.code`font-size: .8rem; overflow-wrap: anywhere;`;
const Badge = styled.span`
  display: inline-block;
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-weight: 800;
  margin-bottom: 6px;
`;
const Detail = styled.div`
  display: grid;
  gap: 7px;
  line-height: 1.5;
  small { color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const JsonBlock = styled.pre`
  margin: 4px 0 0;
  padding: 9px 10px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: .76rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;
const ErrorNotice = styled.p`
  margin: 0;
  padding: 11px 13px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;

const actionLabel = {
  exchange_status_changed: "교환 상태 변경",
  exchange_schedule_rescheduled: "고객 일정 변경",
  exchange_canceled: "예약 취소",
  exchange_bonus_changed: "적립 순금 변경",
  user_role_changed: "회원 권한 변경",
  user_disabled: "회원 계정 정지",
  user_enabled: "회원 계정 복구",
  manual_notification_sent: "관리자 알림 발송",
};

const roleLabel = {
  user: "회원",
  admin: "관리자",
  superAdmin: "최고관리자",
};

const formatDate = (value) => value?.toDate?.().toLocaleString("ko-KR") || "처리 중";

function pretty(value) {
  return JSON.stringify(value || {}, null, 2);
}

function fallbackPayload(item) {
  const omitted = new Set(["id", "action", "actorUid", "createdAt"]);
  return Object.fromEntries(
    Object.entries(item || {}).filter(([key]) => !omitted.has(key))
  );
}

function AuditDetail({ item }) {
  if (item.action?.startsWith("exchange_")) {
    return (
      <Detail>
        <div><strong>교환번호</strong> <Code>{item.groupId || item.exchangeId || "확인 불가"}</Code></div>
        <small>변경 전</small>
        <JsonBlock>{pretty(item.before)}</JsonBlock>
        <small>변경 후</small>
        <JsonBlock>{pretty(item.after)}</JsonBlock>
      </Detail>
    );
  }

  if (item.action === "user_role_changed") {
    return (
      <Detail>
        <div><strong>대상 회원</strong> <Code>{item.targetUid || "확인 불가"}</Code></div>
        <div>
          <strong>권한</strong>{" "}
          {roleLabel[item.previousRole] || item.previousRole || "확인 불가"}
          {" → "}
          {roleLabel[item.nextRole] || item.nextRole || "확인 불가"}
        </div>
      </Detail>
    );
  }

  if (item.action === "user_disabled" || item.action === "user_enabled") {
    return (
      <Detail>
        <div><strong>대상 회원</strong> <Code>{item.targetUid || "확인 불가"}</Code></div>
        <div><strong>처리 결과</strong> {item.action === "user_disabled" ? "계정 정지" : "계정 복구"}</div>
      </Detail>
    );
  }

  if (item.action === "manual_notification_sent") {
    return (
      <Detail>
        <div><strong>발송 배치</strong> <Code>{item.batchId || "확인 불가"}</Code></div>
        <div><strong>대상 유형</strong> {item.targetType || "확인 불가"}</div>
        <div><strong>알림 종류</strong> {item.category || "확인 불가"}</div>
        <div><strong>생성 대상</strong> {Number(item.recipientCount || 0).toLocaleString("ko-KR")}명</div>
      </Detail>
    );
  }

  return (
    <Detail>
      <small>기록 상세</small>
      <JsonBlock>{pretty(fallbackPayload(item))}</JsonBlock>
    </Detail>
  );
}

export default function AdminAuditLogs() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const request = query(
      collection(db, "adminAuditLogs"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    return onSnapshot(
      request,
      (snapshot) => {
        setItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        setError("");
      },
      (nextError) => setError(nextError?.message || "감사 로그를 불러오지 못했습니다.")
    );
  }, []);

  return (
    <Page>
      <Header>
        <h2>관리자 감사 로그</h2>
        <p>금교환·회원 권한·계정 상태·관리자 알림 변경 기록을 최근 100건까지 확인합니다.</p>
      </Header>
      {error && <ErrorNotice role="alert">{error}</ErrorNotice>}
      <List>
        {items.length === 0 && !error && <p>기록된 변경이 없습니다.</p>}
        {items.map((item) => (
          <Item key={item.id}>
            <div>
              <Badge>{actionLabel[item.action] || item.action || "기타 변경"}</Badge>
              <div>{formatDate(item.createdAt)}</div>
            </div>
            <AuditDetail item={item} />
            <div>
              <strong>처리자</strong><br />
              <Code>{item.actorUid || "system"}</Code>
            </div>
          </Item>
        ))}
      </List>
    </Page>
  );
}
