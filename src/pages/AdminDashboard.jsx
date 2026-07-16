// src/pages/AdminDashboard.js
import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styled from "styled-components";
import usePendingGoldExchangeCount from "../hooks/usePendingGoldExchangeCount";
import { db } from "../firebase/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";

const Container = styled.div`
  padding: 2rem;
`;
const Title = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 1rem;
`;
const Menu = styled.nav`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`;
const Tab = styled(NavLink)`
  position: relative;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &.active {
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const Badge = styled.span`
  margin-left: 4px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-weight: bold;
  line-height: 1;
`;

export default function AdminDashboard() {
  const pendingGoldExchangeCount = usePendingGoldExchangeCount();

  // ▶ 답변대기 문의 수
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const coll = collection(db, "board");
        const q = query(
          coll,
          where("category", "==", "inquiry"),
          where("status", "==", "open")
        );
        const agg = await getCountFromServer(q);
        if (!cancelled) setPendingInquiryCount(agg.data().count || 0);
      } catch (e) {
        // 집계 실패 시 배지 표시 없이 넘어갑니다(UX 저하 방지)
        if (!cancelled) setPendingInquiryCount(0);
        // 콘솔에만 남겨 슬랙/로그수집 등과 연계 가능
        console.warn("[AdminDashboard] pending inquiry count failed:", e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container>
      <Title>관리자 대시보드</Title>
      <Menu>
        {/* 중첩 라우트 상대 경로 사용 */}
        <Tab to="." end>개요</Tab>

        <Tab to="gold-exchange">
          금 교환 요청
          {pendingGoldExchangeCount > 0 && <Badge>{pendingGoldExchangeCount}</Badge>}
        </Tab>

        {/* ✅ 추가: 문의 관리 (답변대기 배지 표시) */}
        <Tab to="board/inquiries">
          문의 관리
          {pendingInquiryCount > 0 && <Badge>{pendingInquiryCount}</Badge>}
        </Tab>

        <Tab to="statistics">통계 보기</Tab>
      </Menu>

      <Outlet />
    </Container>
  );
}
