// src/pages/terms/Lspa.jsx
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const LBS_VERSION = "v1.0";
const LBS_EFFECTIVE_DATE = "2025-08-16";
const BRAND = "한국골드마켓";
const L_OPERATOR = {
  name: "원일귀금속",
  phone: "010-7713-3739",
  email: "lifeapproch@naver.com",
  lpoName: "나영호",
  lpoEmail: "lifeapproch@naver.com",
};

const L_Container = styled.div`
  max-width: 900px; margin: auto; padding: 40px 20px; line-height: 1.65;
  color: ${({ theme }) => theme?.colors?.text || "#333"};
`;
const L_Title = styled.h1`
  text-align: center; margin: 24px 0 8px; color: ${({ theme }) => theme?.colors?.primary || "#0f172a"};
`;
const L_Meta = styled.p`
  text-align: center; color: #6b7280; margin: 0 0 28px; font-size: .9rem;
`;
const L_Section = styled.section`
  margin-bottom: 24px;
  h2 { margin-bottom: 8px; font-size: 1.15rem; color: ${({ theme }) => theme?.colors?.primary || "#0f172a"}; }
  p { margin-bottom: 10px; }
  ul { margin: 8px 0 12px 18px; }
`;
const L_TopBar = styled.div`
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme?.colors?.surface || "rgba(255,255,255,0.92)"};
  border-bottom: 1px solid #eee; backdrop-filter: saturate(180%) blur(8px);
  -webkit-backdrop-filter: saturate(180%) blur(8px);
`;
const L_TopInner = styled.div`
  max-width: 900px; margin: 0 auto; padding: 10px 20px;
  display: flex; align-items: center; justify-content: space-between; font-size: .9rem; color: #555;
`;
const L_BackBtn = styled.button`
  padding: 8px 14px; border-radius: 9999px; border: 1px solid #ddd; background: #fff; cursor: pointer;
  &:hover { background: #fafafa; }
`;

export default function Lspa() {
  const nav = useNavigate();
  return (
    <>
      <L_TopBar role="region" aria-label="위치기반서비스 약관 상단 바">
        <L_TopInner>
          <span>위치기반서비스 이용약관 • 버전 {LBS_VERSION} • 시행 {LBS_EFFECTIVE_DATE}</span>
          <L_BackBtn onClick={() => nav(-1)} aria-label="이전으로">← 뒤로</L_BackBtn>
        </L_TopInner>
      </L_TopBar>

      <L_Container>
        <L_Title>위치기반서비스 이용약관</L_Title>
        <L_Meta>브랜드명: {BRAND} · 운영자: {L_OPERATOR.name} · 버전 {LBS_VERSION} · 시행일 {LBS_EFFECTIVE_DATE}</L_Meta>

        <L_Section>
          <h2>제1조 (목적)</h2>
          <p>{L_OPERATOR.name}(이하 “회사”)가 제공하는 위치기반서비스 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 정합니다.</p>
        </L_Section>

        <L_Section>
          <h2>제2조 (정의)</h2>
          <ul>
            <li>① “개인위치정보”란 개인의 위치를 식별할 수 있는 정보를 말합니다.</li>
            <li>② “위치기반서비스”란 위치정보를 이용하여 주변 탐색, 거래 장소 추천, 근거리 노출 등 위치 관련 기능을 제공하는 서비스를 말합니다.</li>
          </ul>
        </L_Section>

        <L_Section>
          <h2>제3조 (이용·수집 항목 및 목적)</h2>
          <ul>
            <li>① 수집 항목: 기기 위치(위도/경도), IP·단말 정보, 위치기반 검색/노출 기록</li>
            <li>② 이용 목적: 주변 매물/매장 안내, 검색/추천, 부정이용 방지 및 서비스 품질 개선</li>
          </ul>
        </L_Section>

        <L_Section>
          <h2>제4조 (동의 및 철회)</h2>
          <p>개인위치정보의 수집·이용은 사전 동의를 전제로 하며, 이용자는 단말 설정 또는 서비스 내 동의관리에서 언제든 동의를 거부·철회할 수 있습니다. 동의 거부 시 일부 기능 이용이 제한될 수 있습니다. 회사는 이용자의 동의·철회 이력을 관련 법령에 따라 보관합니다.</p>
        </L_Section>

        <L_Section>
          <h2>제5조 (보유·이용기간 및 파기)</h2>
          <p>개인위치정보는 서비스 제공에 필요한 최소 기간 동안만 이용·보유하고, 목적 달성 즉시 지체 없이 파기합니다. 다만, 「위치정보의 보호 및 이용 등에 관한 법률」에 따른 위치정보 이용·제공 사실 확인자료는 법정 기간(6개월) 보관할 수 있습니다.</p>
        </L_Section>

        <L_Section>
          <h2>제6조 (제3자 제공 및 처리위탁)</h2>
          <p>회사는 법령에 근거하거나 이용자의 별도 동의가 있는 경우를 제외하고 개인위치정보를 제3자에게 제공하지 않습니다. 위치기반 기능을 위해 필요한 범위에서 외부 서비스(지도/알림 등)를 이용할 수 있으며, 해당 내역은 개인정보처리방침의 ‘처리위탁 및 국외이전’에 고지합니다.</p>
        </L_Section>

        <L_Section>
          <h2>제7조 (이용자의 권리 및 행사 방법)</h2>
          <ul>
            <li>① 이용자는 본인에 관한 위치정보 열람·고지·정정·삭제·처리정지를 요구할 수 있습니다.</li>
            <li>② 위치정보 이용·제공 사실 확인자료의 열람 또는 통지를 요구할 수 있습니다.</li>
            <li>③ 권리행사는 고객센터(연락처 하단 기재) 또는 이메일로 요청할 수 있습니다.</li>
          </ul>
        </L_Section>

        <L_Section>
          <h2>제8조 (법정대리인의 권리)</h2>
          <p>만 14세 미만 아동의 개인위치정보는 법정대리인의 동의를 받아 수집·이용·제공하며, 법정대리인은 아동의 권리를 대리하여 행사할 수 있습니다.</p>
        </L_Section>

        <L_Section>
          <h2>제9조 (손해배상 및 면책)</h2>
          <p>회사는 고의 또는 중대한 과실이 없는 한 위치정보 서비스 제공과 관련하여 발생한 손해에 대하여 책임을 지지 않습니다. 다만 관련 법령에 따라 회사의 책임이 인정되는 경우 그 범위 내에서 배상합니다.</p>
        </L_Section>

        <L_Section>
          <h2>제10조 (분쟁의 해결)</h2>
          <p>본 약관과 관련한 분쟁은 대한민국 법령을 준거법으로 하며, 민원·분쟁은 고객센터를 통해 접수하실 수 있습니다. 분쟁이 원만히 해결되지 않는 경우 관할 법원의 판결에 따릅니다.</p>
        </L_Section>

        <L_Section>
          <h2>제11조 (개인위치정보 보호책임자 및 연락처)</h2>
          <p>개인위치정보 보호책임자: {L_OPERATOR.lpoName} · 이메일: {L_OPERATOR.lpoEmail}</p>
          <p>문의: {L_OPERATOR.phone} / {L_OPERATOR.email}</p>
        </L_Section>

        <L_Section>
          <h2>부칙</h2>
          <p><strong>시행일</strong>: {LBS_EFFECTIVE_DATE}</p>
          <p><strong>버전</strong>: {LBS_VERSION}</p>
        </L_Section>
      </L_Container>
    </>
  );
}
