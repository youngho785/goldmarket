// src/pages/VerifyEmail.js
import React, { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [info, setInfo] = useState(
    `인증 메일을 ${state?.email || "등록하신 이메일"} 로 보냈습니다.`
  );
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setInfo("인증 메일을 다시 보냈습니다. 메일함을 확인해 주세요.");
      } else {
        setInfo("로그인이 필요합니다. 다시 로그인해 주세요.");
        navigate("/login");
      }
    } catch {
      setInfo("메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>이메일 인증 필요</h1>
      <p>{info}</p>
      <button onClick={handleResend} disabled={loading}>
        {loading ? "전송 중…" : "메일 다시 보내기"}
      </button>
      <p>
        이미 인증하셨다면{" "}
        <button onClick={() => navigate("/login")}>로그인 페이지로 이동</button>
      </p>
    </div>
  );
}
