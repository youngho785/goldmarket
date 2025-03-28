// src/pages/StatisticsDashboard.js
import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function StatisticsDashboard() {
  const [productChartData, setProductChartData] = useState(null);
  const [transactionCount, setTransactionCount] = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // 상품 통계: "products" 컬렉션에서 카테고리별 등록 건수 집계
        const productSnapshot = await getDocs(collection(db, "products"));
        const products = productSnapshot.docs.map(doc => doc.data());
        const categoryCount = products.reduce((acc, product) => {
          const category = product.category || "기타";
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});
        const labels = Object.keys(categoryCount);
        const counts = labels.map(label => categoryCount[label]);
        setProductChartData({
          labels,
          datasets: [
            {
              label: "상품 등록 건수",
              data: counts,
              backgroundColor: "rgba(75, 192, 192, 0.6)"
            }
          ]
        });

        // 거래 건수: "transactions" 컬렉션의 전체 문서 수
        const transactionSnapshot = await getDocs(collection(db, "transactions"));
        setTransactionCount(transactionSnapshot.size);

        // 사용자 수: "users" 컬렉션의 전체 문서 수
        const userSnapshot = await getDocs(collection(db, "users"));
        setUserCount(userSnapshot.size);
      } catch (error) {
        console.error("통계 데이터 불러오기 오류:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <p>통계 데이터를 불러오는 중...</p>;
  if (!productChartData) return <p>데이터가 없습니다.</p>;

  // Chart.js 옵션 설정: responsive & maintainAspectRatio: false
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "상품 통계 (카테고리별)",
      },
    },
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>플랫폼 통계</h2>
      
      <div style={{ marginTop: "20px", height: "400px", maxWidth: "600px", margin: "0 auto" }}>
        <Bar data={productChartData} options={options} />
      </div>
      
      <div style={{ marginTop: "20px" }}>
        <h3>총 거래 건수</h3>
        <p>{transactionCount} 건</p>
      </div>
      
      <div style={{ marginTop: "20px" }}>
        <h3>총 사용자 수</h3>
        <p>{userCount} 명</p>
      </div>
    </div>
  );
}
