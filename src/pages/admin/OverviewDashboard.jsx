import React, { useEffect, useState } from "react";
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
import { getAdminMyGoldOverview } from "@/services/adminManagementService";

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
  h3 { margin: 0 0 6px; }
  > p { margin: 0 0 14px; color: ${({ theme }) => theme.colors.textSecondary}; }
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
  교환중: "진행 중",
  completed: "완료",
  rejected: "거절",
  canceled: "취소",
};

const emptyMyGoldStats = {
  userCount: 0,
  vaultUserCount: 0,
  vaultItemCount: 0,
  vaultUsageRate: 0,
  bonusHolderCount: 0,
  bonusBalanceG: 0,
};

export default function OverviewDashboard() {
  const [groups, setGroups] = useState([]);
  const [operationCounts, setOperationCounts] = useState({ requested: 0, active: 0 });
  const [openSupportCount, setOpenSupportCount] = useState(0);
  const [myGoldStats, setMyGoldStats] = useState(emptyMyGoldStats);

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
      getCountFromServer(
        query(collection(db, "goldExchangeGroups"), where("repStatus", "==", "requested"))
      ),
      getCountFromServer(
        query(
          collection(db, "goldExchangeGroups"),
          where("repStatus", "in", ["scheduled", "in_progress", "교환중"])
        )
      ),
      getCountFromServer(
        query(collection(db, "supportTickets"), where("status", "==", "open"))
      ),
    ]).then(([requested, active, support]) => {
      setOperationCounts({
        requested: Number(requested.data().count || 0),
        active: Number(active.data().count || 0),
      });
      setOpenSupportCount(Number(support.data().count || 0));
    }).catch((error) => console.warn("관리자 운영 집계 실패", error));

    getAdminMyGoldOverview()
      .then((goldStats) => {
        setMyGoldStats({ ...emptyMyGoldStats, ...(goldStats || {}) });
      })
      .catch((error) => console.warn("나의 금고 관리자 집계 실패", error));

    return unsubscribe;
  }, []);

  return (
    <Page>
      <Intro>
        <h2>운영 개요</h2>
        <p>금교환 처리와 회원·나의 금고 이용 현황을 한눈에 확인합니다.</p>
      </Intro>

      <Grid>
        <Card to="gold-exchange?status=requested"><strong>{operationCounts.requested}</strong><span>신규 금교환 요청</span></Card>
        <Card to="gold-exchange?status=active"><strong>{operationCounts.active}</strong><span>예약·진행 중</span></Card>
        <Card to="support"><strong>{openSupportCount}</strong><span>답변 대기 문의</span></Card>
        <Card to="members"><strong>{Number(myGoldStats.userCount || 0).toLocaleString("ko-KR")}</strong><span>전체 회원</span></Card>
      </Grid>

      <Section>
        <h3>회원·나의 금고</h3>
        <p>개인 금제품의 종류·중량·메모는 표시하지 않고 이용 현황만 집계합니다.</p>
        <Grid>
          <Card to="members"><strong>{Number(myGoldStats.vaultUserCount || 0).toLocaleString("ko-KR")}</strong><span>나의 금 등록 회원</span></Card>
          <Card to="members"><strong>{Number(myGoldStats.vaultItemCount || 0).toLocaleString("ko-KR")}</strong><span>등록된 나의 금</span></Card>
          <Card to="members"><strong>{Number(myGoldStats.vaultUsageRate || 0).toFixed(1)}%</strong><span>나의 금 등록률</span></Card>
          <Card to="members"><strong>순금 {Number(myGoldStats.bonusBalanceG || 0).toFixed(3)}g</strong><span>회원 적립 순금 총 잔액 · 보유 {Number(myGoldStats.bonusHolderCount || 0).toLocaleString("ko-KR")}명</span></Card>
        </Grid>
      </Section>

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
