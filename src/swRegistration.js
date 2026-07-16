// src/swRegistration.js
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  // 이미 등록되어 있으면 그걸 사용
  if (navigator.serviceWorker.controller) {
    // ready 프라미스: useFCM에서 대기용으로 사용
    if (!window.__swReadyPromise) {
      window.__swReadyPromise = navigator.serviceWorker.ready.catch(() => null);
    }
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // ready 프라미스 노출 (useFCM에서 사용)
    window.__swReadyPromise = navigator.serviceWorker.ready.catch(() => null);

    // 새 SW 대기(waiting) 감지 → 페이지가 원할 때만 업데이트
    if (reg && reg.addEventListener) {
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener("statechange", () => {
          // 필요한 경우 UI에서 “새 버전 사용” 버튼을 눌렀을 때만 교체:
          // navigator.serviceWorker.controller?.postMessage("SKIP_WAITING");
        });
      });
    }

    // SW에서 열어달라 하는 메시지 처리 (알림 클릭 폴백)
    navigator.serviceWorker.addEventListener("message", (e) => {
      const msg = e?.data || {};
      if (msg.type === "OPEN_URL") {
        const url = msg?.data?.url;
        if (typeof url === "string" && url) {
          // SPA 라우팅이 가능하면 라우터 navigate로, 아니면 전체 이동
          try {
            // 동적으로 라우터가 없는 초기 페이지에서도 동작하도록 안전하게 처리
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              // 내부 경로
              window.history.pushState({}, "", url);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          } catch {
            window.location.href = url;
          }
        }
      }
    });

    return reg;
  } catch (e) {
    console.warn("Service Worker register failed:", e);
    return null;
  }
}

// 선택: SW 강제 업데이트(사용자 액션 시)
export function skipWaiting() {
  try {
    navigator.serviceWorker.controller?.postMessage("SKIP_WAITING");
  } catch {}
}
