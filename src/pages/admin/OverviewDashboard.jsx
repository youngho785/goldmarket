// src/pages/admin/OverviewDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { db } from "../../firebase/firebase";
import { collection, updateDoc, doc, onSnapshot, where, query } from "firebase/firestore";
import styled from "styled-components";

const Container = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;
const Section = styled.section`
  background: ${({ theme }) => theme.colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
`;
const SectionTitle = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.25rem;
`;
const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;
const ListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 6px;
`;
const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;
const Buttons = styled.div`
  display: flex;
  gap: 0.5rem;
`;
const Button = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  background: ${({ theme, $variant }) =>
    $variant === "approve"
      ? theme.colors.success
      : $variant === "reject"
      ? theme.colors.error
      : theme.colors.primary};
  color: #fff;
  &:hover {
    opacity: 0.9;
  }
`;
const Select = styled.select`
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  border: 1px solid #ddd;
`;
const StatusCard = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;
const Stat = styled.div`
  flex: 1 1 200px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  &:hover {
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }
`;
const StatNumber = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;
const BackButton = styled.button`
  margin-top: 1rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: bold;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

export default function OverviewDashboard() {
  console.log("▶️ Rendering OverviewDashboard");
  const [pendingProducts, setPendingProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const topRef = useRef(null);
  const productsRef = useRef(null);
  const reportsRef = useRef(null);
  const reviewsRef = useRef(null);
  const usersRef = useRef(null);

  useEffect(() => {
    // 승인 대기 상품만 실시간 구독
    const unsubProducts = onSnapshot(
      query(collection(db, "products"), where("approved", "==", false)),
      snapshot => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPendingProducts(list);
      }
    );

    // 이하 기존과 동일(필요 시 추후 getCountFromServer로 변경 가능)
    const unsubReports = onSnapshot(collection(db, "reports"), snapshot => {
      setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubReviews = onSnapshot(collection(db, "transactionReviews"), snapshot => {
      setReviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), snapshot => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubProducts(); unsubReports(); unsubReviews(); unsubUsers();
    };
  }, []);

  const updateApprovalStatus = async (productId, approved) => {
    await updateDoc(doc(db, "products", productId), { approved });
  };

  const handleUserRoleChange = async (userId, newRole) => {
    await updateDoc(doc(db, "users", userId), { role: newRole });
  };

  if (loading) return <p>로딩 중…</p>;

  return (
    <Container ref={topRef}>
      <Section>
        <SectionTitle>개요 통계</SectionTitle>
        <StatusCard>
          <Stat onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <StatNumber>{pendingProducts.length}</StatNumber>
            승인 대기 상품
          </Stat>
          <Stat onClick={() => reportsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <StatNumber>{reports.length}</StatNumber>
            신고된 상품
          </Stat>
          <Stat onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <StatNumber>{reviews.length}</StatNumber>
            평가 내역
          </Stat>
          <Stat onClick={() => usersRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <StatNumber>{users.length}</StatNumber>
            총 사용자
          </Stat>
        </StatusCard>
      </Section>

      <Section ref={productsRef}>
        <SectionTitle>승인 대기 상품 목록</SectionTitle>
        <List>
          {pendingProducts.length === 0 ? (<p>승인 대기 상품이 없습니다.</p>) : (
            pendingProducts.map(p => (
              <ListItem key={p.id}>
                <Info>
                  <div><strong>{p.title}</strong></div>
                  <div>{p.category || "카테고리 없음"}</div>
                </Info>
                <Buttons>
                  <Button $variant="approve" onClick={() => updateApprovalStatus(p.id, true)}>승인</Button>
                  <Button $variant="reject" onClick={() => updateApprovalStatus(p.id, false)}>거절</Button>
                </Buttons>
              </ListItem>
            ))
          )}
        </List>
        <BackButton onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}>개요로 돌아가기</BackButton>
      </Section>

      <Section ref={reportsRef}>
        <SectionTitle>신고된 상품 관리</SectionTitle>
        <List>
          {reports.length === 0 ? (<p>신고된 상품이 없습니다.</p>) : (
            reports.map(r => (
              <ListItem key={r.id}>
                <Info>
                  <div>상품 ID: {r.productId}</div>
                  <div>이유: {r.reason}</div>
                  <div>신고자: {r.reportedBy}</div>
                </Info>
              </ListItem>
            ))
          )}
        </List>
        <BackButton onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}>개요로 돌아가기</BackButton>
      </Section>

      <Section ref={reviewsRef}>
        <SectionTitle>거래 평가 내역</SectionTitle>
        <List>
          {reviews.length === 0 ? (<p>등록된 평가 내역이 없습니다.</p>) : (
            reviews.map(r => (
              <ListItem key={r.id}>
                <Info>
                  <div>평점: {r.rating}점</div>
                  <div>댓글: {r.comment}</div>
                  <div>날짜: {r.date}</div>
                </Info>
              </ListItem>
            ))
          )}
        </List>
        <BackButton onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}>개요로 돌아가기</BackButton>
      </Section>

      <Section ref={usersRef}>
        <SectionTitle>사용자 목록 및 역할 관리</SectionTitle>
        <List>
          {users.length === 0 ? (<p>등록된 사용자가 없습니다.</p>) : (
            users.map(u => (
              <ListItem key={u.id}>
                <Info>
                  <div>{u.name || "이름 없음"}</div>
                  <div>{u.email}</div>
                </Info>
                <Select defaultValue={u.role || "user"} onChange={e => handleUserRoleChange(u.id, e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </Select>
              </ListItem>
            ))
          )}
        </List>
        <BackButton onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}>개요로 돌아가기</BackButton>
      </Section>
    </Container>
  );
}
