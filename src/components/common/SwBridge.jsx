//src/components/common/SwBridge.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SwBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const onMessage = (event) => {
      const { type, data } = event.data || {};
      if (type === "OPEN_URL" && data?.url) {
        try {
          const u = new URL(data.url, window.location.origin);
          // SPA 라우팅: 페이지 리로드 없이 이동
          navigate(u.pathname + u.search + u.hash);
        } catch {
          // URL 파싱 실패 시 풀 리다이렉트
          window.location.href = data.url;
        }
      }

      // 선택: 푸시로 온 데이터로 UI 갱신/토스트 띄우기 등
      // if (type === "PUSH_MESSAGE") { ... }
      // if (type === "PUSH_SUBSCRIPTION_CHANGED") { ... }
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onMessage);
    }
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", onMessage);
      }
    };
  }, [navigate]);

  return null;
}
