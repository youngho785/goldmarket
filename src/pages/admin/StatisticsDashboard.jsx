import React, { useEffect, useMemo, useState } from "react";
import { collection, getCountFromServer, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import styled from "styled-components";
import { db } from "../../firebase/firebase";

const Page = styled.section`display: grid; gap: 18px;`;
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;
const Card = styled.article`
  padding: 20px; border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface}; border-radius: 16px;
  strong { display: block; font-size: 1.8rem; margin-top: 8px; }
`;
const StatusList = styled.div`
  padding: 20px; border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface}; border-radius: 16px;
  display: grid; gap: 10px;
  div { display: flex; justify-content: space-between; border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; padding-bottom: 9px; }
`;

const labels = {
  requested: "예약 대기",
  scheduled: "방문 확정",
  in_progress: "교환 진행",
  completed: "교환 완료",
  canceled: "취소",
  rejected: "거절",
};

export default function StatisticsDashboard() {
  const [groups, setGroups] = useState([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const request = query(
      collection(db, "goldExchangeGroups"),
      orderBy("updatedAt", "desc"),
      limit(1000)
    );
    const unsubscribe = onSnapshot(request, (snapshot) => {
      setGroups(snapshot.docs.map((entry) => entry.data()));
    });
    getCountFromServer(collection(db, "users"))
      .then((snapshot) => setUserCount(snapshot.data().count))
      .catch((error) => console.warn("회원 수 집계 실패", error));
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const byStatus = {};
    let totalEstimatedG = 0;
    groups.forEach((group) => {
      const status = String(group.repStatus || "requested");
      byStatus[status] = (byStatus[status] || 0) + 1;
      totalEstimatedG += Number(group.totalG || 0);
    });
    const completed = byStatus.completed || 0;
    return {
      byStatus,
      totalEstimatedG,
      completionRate: groups.length ? (completed / groups.length) * 100 : 0,
    };
  }, [groups]);

  return (
    <Page>
      <header><h2>금교환 통계</h2><p>최근 최대 1,000건을 기준으로 집계합니다.</p></header>
      <Grid>
        <Card>전체 금교환<strong>{groups.length}건</strong></Card>
        <Card>예상 순금 합계<strong>{stats.totalEstimatedG.toFixed(2)}g</strong></Card>
        <Card>교환 완료율<strong>{stats.completionRate.toFixed(1)}%</strong></Card>
        <Card>전체 회원<strong>{userCount}명</strong></Card>
      </Grid>
      <StatusList>
        <h3>상태별 건수</h3>
        {Object.entries(labels).map(([key, label]) => (
          <div key={key}><span>{label}</span><strong>{stats.byStatus[key] || 0}건</strong></div>
        ))}
      </StatusList>
    </Page>
  );
}
