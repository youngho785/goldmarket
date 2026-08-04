// src/pages/admin/OverviewDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { db, callSetUserRole } from "../../firebase/firebase";
import { collection, updateDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAuthContext } from "../../context/AuthContext";
import styled from "styled-components";

const Container = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;
const Section = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: clamp(18px, 3vw, 26px);
`;
const SectionTitle = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text};
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
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 12px;
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
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  background: ${({ theme, $variant }) =>
    $variant === "approve"
      ? theme.colors.success
      : $variant === "reject"
      ? theme.colors.error
      : theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  &:hover {
    opacity: 0.9;
  }
`;
const Select = styled.select`
  padding: 0.4rem 0.8rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const StatusCard = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;
const Stat = styled.div`
  flex: 1 1 200px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.hover};
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
  box-shadow: none;
  min-height: auto;
  &:hover {
    text-decoration: underline;
    background: transparent;
    transform: none;
    box-shadow: none;
  }
`;

export default function OverviewDashboard() {
  const { user, isSuperAdmin } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const topRef = useRef(null);
  const productsRef = useRef(null);
  const reportsRef = useRef(null);
  const reviewsRef = useRef(null);
  const usersRef = useRef(null);

  useEffect(() => {
    // 모든 상품을 구독해 공개/비공개 상태를 관리합니다.
    const unsubProducts = onSnapshot(
      collection(db, "products"),
      snapshot => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds || 0) * 1000;
          const bTime = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds || 0) * 1000;
          return bTime - aTime;
        });
        setProducts(list);
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
    if (!approved && !window.confirm("이 상품의 공개를 취소하시겠습니까?")) return;
    setUpdatingProductId(productId);
    try {
      await updateDoc(doc(db, "products", productId), {
        approved,
        moderationStatus: approved ? "approved" : "rejected",
        moderatedAt: serverTimestamp(),
        moderatedBy: user?.uid || null,
      });
    } catch (error) {
      console.error("상품 공개 상태 변경 실패:", error);
      window.alert("상품 공개 상태를 변경하지 못했습니다.");
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    if (!isSuperAdmin) {
      window.alert("최고 관리자만 역할을 변경할 수 있습니다.");
      return;
    }
    if (userId === user?.uid) {
      window.alert("현재 로그인한 계정의 역할은 변경할 수 없습니다.");
      return;
    }
    try {
      await callSetUserRole(userId, newRole);
    } catch (error) {
      console.error("사용자 역할 변경 실패:", error);
      window.alert(error?.message || "사용자 역할을 변경하지 못했습니다.");
    }
  };

  if (loading) return <p>로딩 중…</p>;

  const publicProductCount = products.filter(product => product.approved === true).length;

  return (
    <Container ref={topRef}>
      <Section>
        <SectionTitle>개요 통계</SectionTitle>
        <StatusCard>
          <Stat onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <StatNumber>{publicProductCount} / {products.length}</StatNumber>
            공개 상품 / 전체 상품
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
        <SectionTitle>상품 공개 관리</SectionTitle>
        <List>
          {products.length === 0 ? (<p>등록된 상품이 없습니다.</p>) : (
            products.map(p => {
              const isPublic = p.approved === true;
              return (
              <ListItem key={p.id}>
                <Info>
                  <div><strong>{p.title}</strong></div>
                  <div>{p.category || "카테고리 없음"}</div>
                  <div>상태: {isPublic ? "공개 중" : "공개 중지"}</div>
                </Info>
                <Buttons>
                  <Button
                    $variant={isPublic ? "reject" : "approve"}
                    onClick={() => updateApprovalStatus(p.id, !isPublic)}
                    disabled={updatingProductId === p.id}
                  >
                    {updatingProductId === p.id
                      ? "변경 중…"
                      : isPublic ? "공개 취소" : "다시 공개"}
                  </Button>
                </Buttons>
              </ListItem>
              );
            })
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
                <Buttons>
                  <Button
                    $variant="reject"
                    onClick={() => updateApprovalStatus(r.productId, false)}
                    disabled={!r.productId || updatingProductId === r.productId}
                  >
                    {updatingProductId === r.productId ? "변경 중…" : "상품 공개 취소"}
                  </Button>
                </Buttons>
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
                <Select
                  defaultValue={u.role || "user"}
                  onChange={e => handleUserRoleChange(u.id, e.target.value)}
                  disabled={!isSuperAdmin || u.id === user?.uid}
                  title={isSuperAdmin ? "사용자 역할 변경" : "최고 관리자만 역할을 변경할 수 있습니다."}
                >
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
