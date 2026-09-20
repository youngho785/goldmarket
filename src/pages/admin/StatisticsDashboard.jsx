import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import styled from "styled-components";
import { db } from "../../firebase/firebase";

const Page = styled.section`display: grid; gap: 18px;`;
const Header = styled.header`
  h2 { margin: 0 0 6px; }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const Scope = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .86rem;
  line-height: 1.55;
`;
const ErrorNotice = styled.p`
  margin: 0;
  padding: 11px 13px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 980px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;
const Card = styled.article`
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  strong { display: block; font-size: 1.8rem; margin-top: 8px; }
  small { display: block; margin-top: 6px; color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.45; }
`;
const StatusList = styled.div`
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  display: grid;
  gap: 10px;
  h3 { margin: 0 0 4px; }
  div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
    padding-bottom: 9px;
  }
  div:last-child { border-bottom: 0; padding-bottom: 0; }
`;

const labels = {
  requested: "예약 대기",
  scheduled: "방문 확정",
  in_progress: "교환 진행",
  completed: "교환 완료",
  canceled: "취소",
  rejected: "거절",
};

function normalizeStatus(value) {
  const status = String(value || "requested");
  return status === "교환중" ? "in_progress" : status;
}

const formatCount = (value) => Number(value || 0).toLocaleString("ko-KR");

export default function StatisticsDashboard() {
  const [groups, setGroups] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const request = query(
      collection(db, "goldExchangeGroups"),
      orderBy("updatedAt", "desc"),
      limit(1000)
    );

    const unsubscribe = onSnapshot(
      request,
      (snapshot) => {
        setGroups(snapshot.docs.map((entry) => entry.data()));
        setError("");
      },
      (snapshotError) => {
        console.warn("금교환 통계 실시간 조회 실패", snapshotError);
        setError("금교환 통계를 불러오지 못했습니다. 권한과 네트워크 상태를 확인해 주세요.");
      }
    );

    getCountFromServer(collection(db, "users"))
      .then((snapshot) => setUserCount(snapshot.data().count))
      .catch((countError) => {
        console.warn("회원 수 집계 실패", countError);
        setError((current) => current || "회원 수 집계를 불러오지 못했습니다.");
      });

    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const byStatus = {};
    let totalEstimatedG = 0;

    groups.forEach((group) => {
      const status = normalizeStatus(group.repStatus);
      byStatus[status] = (byStatus[status] || 0) + 1;
      totalEstimatedG += Number(group.totalG || 0);
    });

    const completed = byStatus.completed || 0;
    const canceled = byStatus.canceled || 0;
    const rejected = byStatus.rejected || 0;
    const terminalCount = completed + canceled + rejected;
    const activeCount =
      (byStatus.requested || 0) +
      (byStatus.scheduled || 0) +
      (byStatus.in_progress || 0);

    return {
      byStatus,
      totalEstimatedG,
      activeCount,
      terminalCount,
      completionRate: terminalCount ? (completed / terminalCount) * 100 : 0,
    };
  }, [groups]);

  return (
    <Page>
      <Header>
        <h2>금교환 통계</h2>
        <p>운영 판단에 필요한 최근 금교환 흐름과 전체 회원 수를 확인합니다.</p>
      </Header>

      <Scope>
        금교환 수치는 최근 업데이트 기준 최대 1,000건의 표본입니다. 따라서 아래 “분석 대상” 수치는
        서비스 전체 누적 건수와 다를 수 있습니다. 완료율은 완료·취소·거절처럼 결과가 확정된 건만 분모로 계산합니다.
      </Scope>
      {error && <ErrorNotice role="alert">{error}</ErrorNotice>}

      <Grid>
        <Card>
          분석 대상 금교환
          <strong>{formatCount(groups.length)}건</strong>
          <small>최근 업데이트 최대 1,000건</small>
        </Card>
        <Card>
          현재 진행 중
          <strong>{formatCount(stats.activeCount)}건</strong>
          <small>예약 대기·방문 확정·교환 진행</small>
        </Card>
        <Card>
          종결 건 완료율
          <strong>{stats.completionRate.toFixed(1)}%</strong>
          <small>완료 {formatCount(stats.byStatus.completed)} / 종결 {formatCount(stats.terminalCount)}</small>
        </Card>
        <Card>
          전체 회원
          <strong>{formatCount(userCount)}명</strong>
          <small>Firestore 회원 문서 집계</small>
        </Card>
      </Grid>

      <Grid>
        <Card>
          분석 대상 예상 순금 합계
          <strong>{stats.totalEstimatedG.toFixed(2)}g</strong>
          <small>실측 확정량이 아닌 그룹 요약의 예상 순금량 합계</small>
        </Card>
      </Grid>

      <StatusList>
        <h3>상태별 건수</h3>
        {Object.entries(labels).map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>{formatCount(stats.byStatus[key] || 0)}건</strong>
          </div>
        ))}
      </StatusList>
    </Page>
  );
}
