//src/components/common/ScrollRestoration.js
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'

  // 브라우저 기본 복원 기능 끄기 (충돌 방지)
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  // 이동할 때 스크롤 복원/초기화
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    // layout이 그려진 뒤 복원되도록 rAF로 한 틱 미루기
    const restore = () => {
      if (navType === "POP") {
        // 뒤/앞으로 가기일 때만 저장된 위치 복원
        const saved = sessionStorage.getItem(`scroll:${location.key}`);
        if (saved != null) {
          const y = parseInt(saved, 10) || 0;
          window.scrollTo(0, y);
          return;
        }
      }
      // 새 페이지 진입(PUSH/REPLACE) 등은 항상 맨 위로
      window.scrollTo(0, 0);
    };

    // 두 번의 rAF로 레이아웃/이미지 로딩 등과의 타이밍 이슈 완화
    let id2;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(restore);
    });

    return () => {
      cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, [location, navType]);

  // 스크롤할 때 현재 위치 저장
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onScroll = () => {
      sessionStorage.setItem(`scroll:${location.key}`, String(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.key]);

  return null;
}
