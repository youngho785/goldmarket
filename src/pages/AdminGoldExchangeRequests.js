// src/pages/AdminGoldExchangeRequests.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import styled from "styled-components";

const RequestList = styled.ul`
  list-style: none;
  padding: 0;
`;

const RequestItem = styled.li`
  border: 1px solid #ddd;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
`;

const Button = styled.button`
  margin-right: 10px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: #0056b3;
  }
`;

const PreviewImage = styled.img`
  margin-top: 10px;
  max-width: 200px;
  max-height: 150px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

export default function AdminGoldExchangeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "goldExchanges"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // "접수" 버튼을 눌렀을 때 상태를 "교환중"으로 업데이트하는 함수
  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const requestRef = doc(db, "goldExchanges", requestId);
      await updateDoc(requestRef, { status: newStatus });
      alert(`요청이 ${newStatus} 상태로 업데이트되었습니다.`);
    } catch (error) {
      alert("상태 업데이트 실패: " + error.message);
    }
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>금 교환 요청 관리</h1>
      {requests.length === 0 ? (
        <p>교환 요청이 없습니다.</p>
      ) : (
        <RequestList>
          {requests.map((req) => (
            <RequestItem key={req.id}>
              <p>
                <strong>ID:</strong> {req.id}
              </p>
              <p>
                <strong>사용자 ID:</strong> {req.userId}
              </p>
              <p>
                <strong>제품 종류:</strong> {req.goldType}
              </p>
              <p>
                <strong>입력 수량:</strong> {req.quantity} g
              </p>
              <p>
                <strong>최종 순수 금 중량:</strong>{" "}
                {req.finalWeight
                  ? req.finalWeight.toFixed(2)
                  : req.exchangeWeight
                  ? req.exchangeWeight.toFixed(2)
                  : "미입력"}{" "}
                g
              </p>
              <p>
                <strong>교환 유형:</strong> {req.exchangeType}
              </p>
              {req.name && (
                <>
                  <p>
                    <strong>성명:</strong> {req.name}
                  </p>
                  <p>
                    <strong>주소:</strong> {req.address || "미제공"}
                  </p>
                  <p>
                    <strong>전화번호:</strong> {req.phone || "미제공"}
                  </p>
                  <p>
                    <strong>이메일:</strong> {req.email || "미제공"}
                  </p>
                </>
              )}
              {req.stampImageUrl ? (
                <>
                  <p>
                    <strong>각인 사진:</strong>
                  </p>
                  {/* 클릭하면 새 탭에서 원본 이미지 표시 */}
                  <a href={req.stampImageUrl} target="_blank" rel="noopener noreferrer">
                    <PreviewImage src={req.stampImageUrl} alt="각인 사진" />
                  </a>
                </>
              ) : (
                <p>각인 사진: 없음</p>
              )}
              <p>
                <strong>상태:</strong> {req.status}
              </p>
              <p>
                <strong>제출 시각:</strong>{" "}
                {req.createdAt ? req.createdAt.toDate().toLocaleString() : "알 수 없음"}
              </p>
              <div style={{ marginTop: "10px" }}>
                <Button onClick={() => handleUpdateStatus(req.id, "교환중")}>
                  접수
                </Button>
                <Button onClick={() => handleUpdateStatus(req.id, "rejected")}>
                  거절
                </Button>
              </div>
            </RequestItem>
          ))}
        </RequestList>
      )}
    </div>
  );
}
