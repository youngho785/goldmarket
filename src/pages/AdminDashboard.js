// src/pages/AdminDashboard.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export default function AdminDashboard() {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 상품 데이터 불러오기
        const productSnapshot = await getDocs(collection(db, "products"));
        const productList = productSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // 승인되지 않은 상품 필터링 (approved 필드가 false이거나 존재하지 않으면)
        const pending = productList.filter((product) => !product.approved);
        setPendingProducts(pending);

        // 신고된 상품 데이터 불러오기 (reports 컬렉션)
        const reportSnapshot = await getDocs(collection(db, "reports"));
        const reportList = reportSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(reportList);

        // 거래 평가 내역 불러오기 (transactionReviews 컬렉션)
        const reviewSnapshot = await getDocs(collection(db, "transactionReviews"));
        const reviewList = reviewSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReviews(reviewList);

        // 사용자 데이터 불러오기 (users 컬렉션)
        const userSnapshot = await getDocs(collection(db, "users"));
        const userList = userSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
      } catch (error) {
        console.error("데이터 불러오기 오류:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 승인 대기 상품 업데이트 함수
  const updateApprovalStatus = async (productId, approved) => {
    try {
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, { approved });
      alert(`상품이 ${approved ? "승인" : "거절"}되었습니다.`);
      setPendingProducts((prev) => prev.filter((product) => product.id !== productId));
    } catch (error) {
      console.error("승인 상태 업데이트 실패:", error);
    }
  };

  // 사용자 역할 업데이트 함수
  const handleUserRoleChange = async (userId, newRole) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      alert("사용자 역할이 업데이트되었습니다.");
      // 필요시 상태 갱신 로직 추가 가능
    } catch (error) {
      console.error("사용자 역할 업데이트 실패:", error);
    }
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>관리자 대시보드</h1>

      {/* 승인 대기 상품 섹션 */}
      <section style={{ marginBottom: "30px" }}>
        <h2>승인 대기 상품 목록</h2>
        {pendingProducts.length === 0 ? (
          <p>승인 대기 상품이 없습니다.</p>
        ) : (
          <ul>
            {pendingProducts.map((product) => (
              <li key={product.id} style={{ marginBottom: "10px" }}>
                <strong>{product.title}</strong> - {product.category || "카테고리 없음"}
                <div style={{ marginTop: "5px" }}>
                  <button
                    onClick={() => updateApprovalStatus(product.id, true)}
                    style={{ marginRight: "10px" }}
                  >
                    승인
                  </button>
                  <button onClick={() => updateApprovalStatus(product.id, false)}>
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 신고된 상품 관리 섹션 */}
      <section style={{ marginBottom: "30px" }}>
        <h2>신고된 상품 관리</h2>
        {reports.length === 0 ? (
          <p>신고된 상품이 없습니다.</p>
        ) : (
          <ul>
            {reports.map((report) => (
              <li key={report.id}>
                상품 ID: {report.productId} / 신고 이유: {report.reason} / 신고자: {report.reportedBy}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 거래 평가 내역 섹션 */}
      <section style={{ marginBottom: "30px" }}>
        <h2>거래 평가 내역</h2>
        {reviews.length === 0 ? (
          <p>등록된 평가 내역이 없습니다.</p>
        ) : (
          <ul>
            {reviews.map((review) => (
              <li key={review.id}>
                평점: {review.rating}점, 댓글: {review.comment}, 등록일: {review.date}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 사용자 목록 및 역할 관리 섹션 */}
      <section style={{ marginBottom: "30px" }}>
        <h2>사용자 목록 및 역할 관리</h2>
        {users.length === 0 ? (
          <p>등록된 사용자가 없습니다.</p>
        ) : (
          <ul>
            {users.map((userItem) => (
              <li key={userItem.id} style={{ marginBottom: "10px" }}>
                {userItem.name || "이름 없음"} - {userItem.email} - 역할: {userItem.role || "user"}
                <select
                  defaultValue={userItem.role || "user"}
                  onChange={(e) =>
                    handleUserRoleChange(userItem.id, e.target.value)
                  }
                  style={{ marginLeft: "10px" }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
