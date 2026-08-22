import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { db } from "../../firebase/firebase";

const Page = styled.section`display: grid; gap: 20px;`;
const Intro = styled.header`
  h2 { margin: 0 0 6px; }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;
  @media (max-width: 980px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;
const Card = styled(Link)`
  padding: 18px; border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface}; border-radius: 16px;
  color: ${({ theme }) => theme.colors.text}; text-decoration: none;
  box-shadow: ${({ theme }) => theme.shadows.card};
  strong { display: block; font-size: 1.8rem; margin-bottom: 5px; }
  span { color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const Section = styled.section`
  padding: 18px; border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface}; border-radius: 16px;
  h3 { margin: 0 0 14px; }
`;
const Row = styled(Link)`
  display: grid; grid-template-columns: 1fr auto auto; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.text}; text-decoration: none;
  &:last-child { border-bottom: 0; }
  @media (max-width: 620px) { grid-template-columns: 1fr; gap: 4px; }
`;
const Badge = styled.span`
  width: fit-content; padding: 4px 8px; border-radius: 999px;
  background: ${({ theme }) => theme.semantic.alertInfoBg};
  color: ${({ theme }) => theme.semantic.alertInfoText}; font-weight: 800;
`;
const STATUS_LABEL = {
  requested: "접수 대기",
  scheduled: "예약 승인",
  in_progress: "진행 중",
  completed: "완료",
  rejected: "거절",
  canceled: "취소",
};

export default function OverviewDashboard() {
  const [groups, setGroups] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [openSupportCount, setOpenSupportCount] = useState(0);

  useEffect(() => {
    const groupsRequest = query(
      collection(db, "goldExchangeGroups"),
      orderBy("updatedAt", "desc"),
      limit(30)
    );
    const unsubscribe = onSnapshot(groupsRequest, (snapshot) => {
      setGroups(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    Promise.all([
      getCountFromServer(collection(db, "users")),
      getCountFromServer(
        query(collection(db, "supportTickets"), where("status", "==", "open"))
      ),
    ]).then(([users, support]) => {
      setUserCount(users.data().count);
      setOpenSupportCount(support.data().count);
    }).catch((error) => console.warn("관리자 개요 집계 실패", error));

    return unsubscribe;
  }, []);

  const counts = useMemo(() => {
    const result = { requested: 0, active: 0, completed: 0 };
    groups.forEach((group) => {
      const status = String(group.repStatus || "requested");
      if (status === "requested") result.requested += 1;
      if (["scheduled", "in_progress"].includes(status)) result.active += 1;
      if (status === "completed") result.completed += 1;
    });
    return result;
  }, [groups]);

  return (
    <Page>
      <Intro>
        <h2>금교환 운영 개요</h2>
        <p>신규 요청과 오늘 처리해야 할 교환을 먼저 확인하세요.</p>
      </Intro>
      <Grid>
        <Card to="gold-exchange?status=requested"><strong>{counts.requested}</strong><span>신규 요청</span></Card>
        <Card to="gold-exchange?status=active"><strong>{counts.active}</strong><span>예약·진행 중</span></Card>
        <Card to="support"><strong>{openSupportCount}</strong><span>답변 대기 문의</span></Card>
        <Card to="members"><strong>{userCount}</strong><span>전체 회원</span></Card>
      </Grid>
      <Section>
        <h3>최근 금교환 요청</h3>
        {groups.length === 0 && <p>금교환 요청이 없습니다.</p>}
        {groups.slice(0, 10).map((group) => (
          <Row key={group.id} to={`gold-exchange?groupId=${group.id}`}>
            <div><strong>{group.visitDate || "일정 미정"} {group.visitTime || ""}</strong><br /><small>{group.id}</small></div>
            <span>{Number(group.totalG || 0).toFixed(2)}g</span>
            <Badge>{STATUS_LABEL[group.repStatus] || group.repStatus || "접수 대기"}</Badge>
          </Row>
        ))}
      </Section>
    </Page>
  );
}
