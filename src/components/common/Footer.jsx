// src/components/common/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

const BRAND = "한국골드마켓"; // 서비스명(브랜드)
const OP = {
  company: "원일귀금속", // 운영자(사업자) 상호
  rep: "나영호",
  regNo: "865-41-00244",
  mailOrderNo: "", // 통신판매업신고번호(있으면 입력)
  address: "부산광역시 부산진구 골드테마길 21(범천동)",
  contact: "lifeapproch@naver.com", // 전화 또는 이메일 중 1개
};

const link = { color: "#374151", textDecoration: "none", padding: "0 2px" };

export default function Footer() {
  const isEmail = typeof OP.contact === "string" && OP.contact.includes("@");
  const contactNode = isEmail ? (
    <a href={`mailto:${OP.contact}`} style={link}>{OP.contact}</a>
  ) : (
    <a href={`tel:${OP.contact.replace(/[^0-9+]/g, "")}`} style={link}>{OP.contact}</a>
  );

  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "#f7f7f8",
        borderTop: "1px solid #e5e7eb",
        padding: "14px 20px",
        fontSize: "12.5px",
        color: "#4b5563",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* 정책/약관 링크 */}
        <nav
          aria-label="정책 및 약관"
          style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}
        >
          <Link to="/terms" style={link}>이용약관</Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" style={link}>개인정보처리방침</Link>
          <span aria-hidden>·</span>
          <Link to="/lspa" style={link}>위치기반서비스 이용약관</Link>
          <span aria-hidden>·</span>
          <Link to="/policy" style={link}>프리마켓 운영정책</Link>
        </nav>

        {/* 중개자 고지 */}
        <div style={{ lineHeight: 1.6 }}>
          <strong style={{ color: "#111827" }}>{BRAND}</strong> 프리마켓은
          <strong> 통신판매중개</strong> 서비스로, 거래 당사자가 아닙니다.
          <br />
          단, <strong>골드바 교환</strong>은 {OP.company}이(가) 직접 제공하는 서비스입니다.
        </div>

        {/* 사업자(운영자) 최소 표기 */}
        <address
          style={{ marginTop: 6, lineHeight: 1.8, fontStyle: "normal" }}
        >
          <span><strong>운영자</strong>: {OP.company}</span> │{" "}
          <span><strong>대표자</strong>: {OP.rep}</span> │{" "}
          <span><strong>사업자등록번호</strong>: {OP.regNo}</span>
          {OP.mailOrderNo && (
            <>
              {" "}│ <span><strong>통신판매업신고번호</strong>: {OP.mailOrderNo}</span>
            </>
          )}
          <br />
          <span><strong>주소</strong>: {OP.address}</span> │{" "}
          <span><strong>연락</strong>: {contactNode}</span>
        </address>

        <div style={{ marginTop: 8, color: "#6b7280" }}>
          © {year} {BRAND}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
