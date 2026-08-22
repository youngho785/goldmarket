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
  grid-template-columns: minmax(160px, .7fr) minmax(240px, 1.4fr) auto;
  gap: 12px;
  align-items: center;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;
const Code = styled.code`font-size: .8rem; overflow-wrap: anywhere;`;
const Badge = styled.span`
  width: fit-content; padding: 4px 8px; border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt}; font-weight: 800;
`;

const actionLabel = {
  exchange_status_changed: "교환 상태 변경",
  exchange_schedule_rescheduled: "고객 일정 변경",
  exchange_canceled: "예약 취소",
  exchange_bonus_changed: "적립 순금 변경",
};
const formatDate = (value) => value?.toDate?.().toLocaleString("ko-KR") || "처리 중";

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
      (snapshot) => setItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
      (nextError) => setError(nextError?.message || "감사 로그를 불러오지 못했습니다.")
    );
  }, []);

  return (
    <Page>
      <Header>
        <h2>관리자 감사 로그</h2>
        <p>금교환 상태, 예약 일정, 적립 순금 변경 기록은 수정할 수 없습니다.</p>
      </Header>
      {error && <p role="alert">{error}</p>}
      <List>
        {items.length === 0 && !error && <p>기록된 변경이 없습니다.</p>}
        {items.map((item) => (
          <Item key={item.id}>
            <div>
              <Badge>{actionLabel[item.action] || item.action}</Badge>
              <div>{formatDate(item.createdAt)}</div>
            </div>
            <div>
              <strong>교환번호</strong> <Code>{item.groupId}</Code>
              <div>변경 전: {JSON.stringify(item.before || {})}</div>
              <div>변경 후: {JSON.stringify(item.after || {})}</div>
            </div>
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
