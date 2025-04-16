// src/components/ScrollRestoration.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    // 페이지 로드 시 저장된 스크롤 위치를 가져와서 복원합니다.
    const savedPosition = sessionStorage.getItem(location.key);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }

    const handleScroll = () => {
      // 스크롤 이벤트가 발생할 때마다 현재 스크롤 위치를 저장합니다.
      sessionStorage.setItem(location.key, window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location]);

  return null;
}
