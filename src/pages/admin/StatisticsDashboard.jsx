import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

/**
 * 변경 요약
 * - chart.js/react-chartjs-2를 정적 import하지 않고, useEffect에서 동적 import
 * - 차트 컴포넌트를 상태로 보관(setBarComp) 후 렌더
 * - 차트 라이브러리가 아직 로드되지 않아도, 숫자 통계는 먼저 보여줌
 */

export default function StatisticsDashboard() {
  // 통계 데이터
  const [productChartData, setProductChartData] = useState(null);
  const [transactionCount, setTransactionCount] = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 차트 라이브러리(react-chartjs-2의 Bar 컴포넌트) 동적 로딩 상태
  const [BarComp, setBarComp] = useState(null);
  const [chartLibLoading, setChartLibLoading] = useState(true);

  // 1) 통계 데이터 수집 (기존 로직 유지)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const productSnapshot = await getDocs(collection(db, "products"));
        const products = productSnapshot.docs.map((d) => d.data());

        const categoryCount = products.reduce((acc, product) => {
          const category = product?.category || "기타";
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        const labels = Object.keys(categoryCount);
        const counts = labels.map((label) => categoryCount[label]);

        if (!mounted) return;
        setProductChartData({
          labels,
          datasets: [
            {
              label: "상품 등록 건수",
              data: counts,
              backgroundColor: "rgba(75, 192, 192, 0.6)",
            },
          ],
        });

        const transactionSnapshot = await getDocs(collection(db, "transactions"));
        const userSnapshot = await getDocs(collection(db, "users"));

        if (!mounted) return;
        setTransactionCount(transactionSnapshot.size);
        setUserCount(userSnapshot.size);
      } catch (error) {
        console.error("통계 데이터 불러오기 오류:", error);
      } finally {
        if (mounted) setStatsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 2) 차트 라이브러리 지연 로딩 (chart.js/auto + react-chartjs-2)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // chart.js/auto 는 필요한 요소를 자동 등록
        await import("chart.js/auto");
        const rc2 = await import("react-chartjs-2");
        if (!mounted) return;
        setBarComp(() => rc2.Bar);
      } catch (e) {
        console.error("차트 라이브러리 로딩 실패:", e);
      } finally {
        if (mounted) setChartLibLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 차트 옵션 메모
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "상품 통계 (카테고리별)" },
      },
    }),
    []
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>플랫폼 통계</h2>

      {/* 숫자 통계는 먼저 보여줌 */}
      <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <div>
          <h3>총 거래 건수</h3>
          <p>{statsLoading || transactionCount == null ? "불러오는 중…" : `${transactionCount} 건`}</p>
        </div>
        <div>
          <h3>총 사용자 수</h3>
          <p>{statsLoading || userCount == null ? "불러오는 중…" : `${userCount} 명`}</p>
        </div>
      </div>

      {/* 카테고리별 상품 막대차트 */}
      <div
        style={{
          marginTop: 24,
          height: 400,
          maxWidth: 640,
          marginInline: "auto",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 12,
        }}
      >
        {statsLoading ? (
          <p>통계 데이터를 불러오는 중...</p>
        ) : !productChartData ? (
          <p>데이터가 없습니다.</p>
        ) : chartLibLoading || !BarComp ? (
          <p>차트 라이브러리를 로딩 중...</p>
        ) : (
          <BarComp data={productChartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
