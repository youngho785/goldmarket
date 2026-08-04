import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { fetchOrdersByUser } from "../services/orderService";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const Container = styled.div`
  padding: 8px 0 32px;
  max-width: 900px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 32px;
`;

const OrderItem = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  padding: 18px;
  margin-bottom: 16px;
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  gap: 18px;
  align-items: center;
`;

const Thumbnail = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Info = styled.div`
  flex: 1;
`;

const Status = styled.span`
  color: ${({ $completed, theme }) => ($completed ? theme.colors.success : theme.colors.warning)};
  font-weight: bold;
`;

const Button = styled.button`
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  border: 1px solid transparent;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radii.small};
  font-weight: 750;
  margin-top: 6px;
  cursor: pointer;
`;

export default function MyOrders({ role = "buyer" }) {
  const { user } = useAuthContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchOrdersByUser(user.uid, role)
      .then(setOrders)
      .catch((err) => {
        console.error("[MyOrders] 거래 내역 조회 실패:", err?.code || err?.message || err);
        setError("거래 내역을 불러오는 데 실패했습니다.");
      })
      .finally(() => setLoading(false));
  }, [user, role]);

  if (!user) return <Container>로그인이 필요합니다.</Container>;
  if (loading) return <Container>로딩 중...</Container>;
  if (error) return <Container>{error}</Container>;
  if (orders.length === 0) return <Container>거래 내역이 없습니다.</Container>;

  return (
    <Container>
      <Title>
        {role === "buyer" ? "나의 구매내역" : "나의 판매내역"}
      </Title>
      {orders.map((order) => (
        <OrderItem key={order.id}>
          {order.product?.imageUrls?.[0] ? (
            <Thumbnail src={order.product.imageUrls[0]} alt="상품 이미지" />
          ) : (
            <Thumbnail as="div">이미지 없음</Thumbnail>
          )}
          <Info>
            <div>
              <b>{order.product?.title || "상품정보 없음"}</b>
            </div>
            <div>가격: {order.price?.toLocaleString() || "N/A"}원</div>
            <div>
              상대방: {role === "buyer"
                ? order.seller?.email || order.sellerId
                : order.buyer?.email || order.buyerId}
            </div>
            <div>
              거래일: {order.createdAt?.seconds
                ? new Date(order.createdAt.seconds * 1000).toLocaleString()
                : ""}
              <Status $completed={order.completed}>
                &nbsp;[{order.completed ? "거래완료" : "진행중"}]
              </Status>
            </div>
            {/* 거래 평가 버튼 (구매자만, 미리뷰시) */}
            {role === "buyer" && order.completed && !order.reviewed && (
              <Button onClick={() => navigate(`/product/${order.productId}`)}>
                거래 평가 남기기
              </Button>
            )}
          </Info>
        </OrderItem>
      ))}
    </Container>
  );
}
