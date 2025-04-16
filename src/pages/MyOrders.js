// src/pages/MyOrders.js
import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { fetchOrdersByUser } from "../services/OrderService";
import styled from "styled-components";

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const OrderItem = styled.div`
  border: 1px solid #eee;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
`;

export default function MyOrders({ role }) {
  const { user } = useAuthContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await fetchOrdersByUser(user.uid, role);
        setOrders(data);
      } catch (err) {
        setError("거래 내역을 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchOrders();
  }, [user, role]);

  if (loading) return <Container>로딩 중...</Container>;
  if (error) return <Container>{error}</Container>;
  if (orders.length === 0) return <Container>거래 내역이 없습니다.</Container>;

  return (
    <Container>
      <h2>내 거래 내역</h2>
      {orders.map((order) => (
        <OrderItem key={order.id}>
          <p>상품 ID: {order.productId}</p>
          <p>거래 상태: {order.status}</p>
          <p>거래 생성: {new Date(order.createdAt?.seconds * 1000).toLocaleString()}</p>
          {/* 추가 정보 표시 */}
        </OrderItem>
      ))}
    </Container>
  );
}
