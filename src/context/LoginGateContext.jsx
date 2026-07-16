// src/context/LoginGateContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "@/context/AuthContext";

const LoginGateCtx = createContext(null);

export function LoginGateProvider({ children }) {
  const { user, isEmailVerified } = useAuthContext();

  const [isOpen, setIsOpen] = useState(false);
  const [modalProps, setModalProps] = useState({
    title: "",
    message: "",
    requireVerified: true,
  });

  // 대기 중인 액션(로그인/인증 성공 시 재실행)
  const pendingRef = useRef(null);
  // 현재 요구조건(로그인만, 인증까지 등)
  const requireVerifiedRef = useRef(true);

  const openGate = useCallback(({ title, message, requireVerified = true, intent, afterAuth }) => {
    setModalProps({ title, message, requireVerified, intent });
    requireVerifiedRef.current = !!requireVerified;
    pendingRef.current = typeof afterAuth === "function" ? afterAuth : null;
    setIsOpen(true);
  }, []);

  const closeGate = useCallback(() => {
    setIsOpen(false);
    // 주의: close만으로 pendingRef를 지우진 않음(성공/취소 케이스 구분)
  }, []);

  // ✅ 로그인/인증 상태 변화를 모니터링해서 조건 충족 시 afterAuth 1회 실행
  useEffect(() => {
    if (!isOpen) return;

    const ok =
      user && (!requireVerifiedRef.current || (requireVerifiedRef.current && isEmailVerified));

    if (ok) {
      const fn = pendingRef.current;
      pendingRef.current = null; // 1회만 실행
      setIsOpen(false);
      if (typeof fn === "function") {
        // 모달 닫힘 → 다음 틱에 실행 (UI 갱신 후 동작하도록)
        setTimeout(() => {
          try { fn(); } catch (e) { console.error("afterAuth failed:", e); }
        }, 0);
      }
    }
  }, [user, isEmailVerified, isOpen]);

  const value = {
    isOpen,
    modalProps,
    openGate,
    closeGate,
  };

  return (
    <LoginGateCtx.Provider value={value}>
      {children}
    </LoginGateCtx.Provider>
  );
}

export function useLoginGate() {
  const ctx = useContext(LoginGateCtx);
  if (!ctx) throw new Error("useLoginGate must be used within LoginGateProvider");
  return ctx;
}

/** Router 트리 안쪽(예: MainLayout 아래)에서 모달을 실제로 렌더 */
export function LoginGateMount() {
  const { isOpen, modalProps, closeGate } = useLoginGate();

  if (!isOpen) return null;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
      onClick={closeGate}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 420px)",
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,.18)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{modalProps.title || "로그인이 필요합니다"}</h2>
        <p style={{ margin: "10px 0 16px", color: "#555" }}>
          {modalProps.message || "계속하려면 로그인/회원가입 해주세요."}
        </p>

        {/* 실제 로그인/회원가입 UI로 이동하는 버튼 */}
        <div style={{ display: "grid", gap: 8 }}>
          <a
            href="/login"
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "12px 14px",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 800,
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            로그인/회원가입
          </a>
          <button
            onClick={closeGate}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              fontWeight: 700,
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
