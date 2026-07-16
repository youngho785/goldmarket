// src/pages/terms/Terms.jsx
// ==============================================
import React from "react";
import styled from "styled-components";
import { useNavigate, Link } from "react-router-dom";

const TERMS_VERSION = "v1.1";
const TERMS_EFFECTIVE_DATE = "2025-08-16";

const OPERATOR = {
  brand: "한국골드마켓",
  company: "원일귀금속",
  rep: "나영호",
  regNo: "865-41-00244",
  mailOrderNo: "미기재",
  address: "부산광역시 부산진구 골드테마길 21(범천동)",
  phone: "010-7713-3739",
  email: "lifeapproch@naver.com",
};

const T_Container = styled.div`
  max-width: 800px; margin: auto; padding: 40px 20px; line-height: 1.65;
  color: ${({ theme }) => theme?.colors?.text || "#333"};
`;
const StickyBarRoot = styled.div`
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme?.colors?.surface || "rgba(255,255,255,0.92)"};
  backdrop-filter: saturate(180%) blur(8px); -webkit-backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid #eee;
`;
const StickyBarInner = styled.div`
  max-width: 800px; margin: 0 auto; padding: 10px 20px;
  display: flex; justify-content: space-between; align-items: center; font-size: .9rem; color: #555;
`;
const BackBtn = styled.button`
  padding: 8px 12px; border-radius: 9999px; border: 1px solid #ddd; background: #fff; cursor: pointer;
  &:hover { background: #fafafa; }
`;
const Title = styled.h1`
  text-align: center; margin: 24px 0 8px; color: ${({ theme }) => theme?.colors?.primary || "#0f172a"};
`;
const Meta = styled.p`
  text-align: center; color: #6b7280; margin: 0 0 28px; font-size: .9rem;
`;
const Section = styled.section`
  margin-bottom: 24px;
  h2 { margin-bottom: 8px; font-size: 1.15rem; color: ${({ theme }) => theme?.colors?.primary || "#0f172a"}; }
  p { margin-bottom: 12px; }
  ul { margin: 6px 0 12px 18px; }
`;
const Notice = styled.div`
  background: #fffcf3; border: 1px solid #f0e1a6; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;
  color: #6b4e16; font-size: .96rem;
`;

export function Terms() {
  const navigate = useNavigate();
  return (
    <>
      <StickyBarRoot role="region" aria-label="약관 상단 바">
        <StickyBarInner>
          <span>{OPERATOR.brand} 이용약관 • 버전 {TERMS_VERSION} • 시행 {TERMS_EFFECTIVE_DATE}</span>
          <BackBtn onClick={() => navigate(-1)} aria-label="이전으로">← 뒤로</BackBtn>
        </StickyBarInner>
      </StickyBarRoot>

      <T_Container>
        <Title>이용약관</Title>
        <Meta>
          브랜드명: {OPERATOR.brand} · 운영자: {OPERATOR.company} · 버전 {TERMS_VERSION} · 시행일 {TERMS_EFFECTIVE_DATE}
        </Meta>

        <Notice>
          <strong>중개자 고지:</strong> {OPERATOR.brand}(이하 “회사”)는 개인 간 거래를 위한 <strong>통신판매중개자</strong>이며,
          프리마켓에서 이루어지는 매매의 <strong>당사자</strong>가 아닙니다.
        </Notice>

        <Section>
          <h2>제1조 (목적)</h2>
          <p>본 약관은 회사가 제공하는 서비스(웹·앱 포함)의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 규정합니다.</p>
        </Section>

        <Section>
          <h2>제2조 (정의)</h2>
          <p>① “프리마켓”이란 이용자 간에 상품(금·귀금속 포함)의 정보를 등록하고 채팅 등을 통해 직거래할 수 있도록 제공되는 중개형 서비스를 의미합니다.</p>
          <p>② “골드바 교환”이란 이용자가 보유한 금을 감정하여 지정 규격 골드바로 교환하는 예약형 서비스를 말합니다.</p>
          <p>③ “회원”이란 회사에 개인정보를 제공하여 회원등록을 하고 지속적으로 서비스를 이용할 수 있는 자를 말합니다.</p>
        </Section>

        <Section>
          <h2>제3조 (약관의 게시 및 개정)</h2>
          <p>① 회사는 본 약관을 서비스 초기화면 또는 설정 메뉴 등에 게시합니다.</p>
          <p>② 회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여 적용일자 7일 전(불리한 변경은 30일 전)부터 공지합니다.</p>
          <p>③ 이용자가 변경 적용일까지 명시적으로 거부하지 않거나 서비스를 계속 이용하면 개정 약관에 동의한 것으로 봅니다.</p>
        </Section>

        <Section>
          <h2>제4조 (계정의 생성 및 관리)</h2>
          <p>① 회원가입은 만 14세 이상 개인 또는 적법한 권한을 가진 법인이 할 수 있습니다.</p>
          <p>② 회원은 계정 정보를 안전하게 관리할 책임이 있으며, 제3자에게 양도·대여할 수 없습니다.</p>
          <p>③ 회사는 장기 미접속 계정을 휴면 처리할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제5조 (서비스의 제공 및 변경)</h2>
          <p>① 회사는 다음 각 호의 서비스를 제공합니다.</p>
          <ul>
            <li>1. 프리마켓 등록·검색·채팅 등 중개 서비스</li>
            <li>2. 골드바 교환 예약/감정/정산 서비스</li>
            <li>3. 마이페이지, 즐겨찾기, 알림 등 부가 기능</li>
          </ul>
          <p>② 서비스의 내용·방식은 회사 정책과 기술적 필요에 따라 변경될 수 있으며, 중요한 변경은 제3조에 따라 공지합니다.</p>
          <p>③ 회사는 거래의 안전을 보증하지 않으며, 거래 당사자 간 확인·검증 책임은 각 당사자에게 있습니다.</p>
        </Section>

        <Section>
          <h2>제6조 (골드바 교환 예약 및 감정)</h2>
          <p>① <strong>감정 기준</strong>: 회사는 정해진 절차에 따라 순도·중량을 측정하고 정산합니다.</p>
          <p>② <strong>정산 및 결제</strong>: 이용자는 규격에 따른 공임 등 부대비용을 부담하며, 부족/초과분은 교환 전 고지 후 조정합니다.</p>
          <p>③ <strong>청약철회 제한</strong>: 귀금속 특성상 감정 완료 후 맞교환에 해당하는 경우 청약철회가 제한될 수 있습니다. 다만 회사 책임 있는 하자 등은 관련 법령에 따라 조치합니다.</p>
          <p>④ <strong>거절권</strong>: 위·변조·도난 의심, 본인확인 불일치, 법령 위반 소지 등이 있는 경우 접수 또는 교환을 제한·보류·거절할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제7조 (가격·시세 및 적용 기준)</h2>
          <p>① 금 시세 및 매입/매도 가격은 시장 상황에 따라 변동됩니다.</p>
          <p>② 회사는 결제 승인 시점 또는 회사가 정한 기준 시점의 가격을 스냅샷으로 적용할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제8조 (프리마켓 거래의 성격 및 회사의 지위)</h2>
          <p>① 프리마켓의 거래 당사자는 판매자와 구매자이며, 회사는 통신판매중개자입니다.</p>
          <p>② 회사는 법령상 책임이 인정되는 경우를 제외하고 거래 이행·품질·안전성 등에 대한 책임을 부담하지 않습니다.</p>
          <p>③ 회사는 신고 접수 시 임시조치(노출 제한, 게시중단, 계정제재 등)를 할 수 있으며, 필요한 범위에서 관계기관에 협조합니다.</p>
        </Section>

        <Section>
          <h2>제9조 (금지행위)</h2>
          <p>① 이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ul>
            <li>1. 타인의 정보 도용, 허위·과장 정보 게시, 가격조작·시세왜곡</li>
            <li>2. 도난품·밀수품·위조 각인·불법 변조 금 등 불법물 거래</li>
            <li>3. 지식재산권·초상권 등 제3자 권리 침해</li>
            <li>4. 시스템 장애 유발(해킹, 비정상 크롤링, 자동화 남용 등)</li>
            <li>5. 기타 법령·공서양속 위반 행위</li>
          </ul>
        </Section>

        <Section id="privacy">
          <h2>제11조 (개인정보보호)</h2>
          <p>
            개인정보 처리에 관한 사항은 별도의 {""}
            <Link to="/privacy" target="_blank" rel="noopener"><strong>개인정보처리방침</strong></Link>{" "}
            을 따릅니다.
          </p>
        </Section>

        <Section>
          <h2>제12조 (위치기반서비스)</h2>
          <p>
            위치 기능은 {""}
            <Link to="/lspa" target="_blank" rel="noopener"><strong>위치기반서비스 이용약관</strong></Link>{" "}
            에 동의한 경우 제공됩니다.
          </p>
        </Section>

        <Section>
          <h2>제13조 (광고·마케팅 알림)</h2>
          <p>사전 동의를 받은 경우에 한하여 이메일·문자·푸시로 혜택·이벤트 정보를 제공할 수 있으며, 이용자는 언제든 수신을 철회할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제14조 (서비스의 이용제한·중지)</h2>
          <p>불가피한 사유로 서비스가 제한·중지될 수 있으며, 약관·정책 위반 시 경고·일시정지·영구정지 등 조치가 이루어질 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제15조 (손해배상 및 책임의 한계)</h2>
          <p>① 회사의 과실로 인한 손해는 법령이 허용하는 범위 내에서 <strong>현실로 발생한 통상손해</strong>를 한도로 배상합니다.</p>
          <p>② 간접·특별·결과적 손해 등은 책임을 지지 않습니다.</p>
        </Section>

        <Section>
          <h2>제16조 (계약 해지 및 회원탈퇴)</h2>
          <p>회원은 언제든 탈퇴할 수 있으며, 미완료 정산 또는 진행 중인 교환이 있는 경우 처리 완료 후 탈퇴가 가능합니다.</p>
        </Section>

        <Section>
          <h2>제17조 (통지)</h2>
          <p>공지, 이메일, 푸시 등 합리적 수단으로 통지할 수 있으며, 불특정 다수에 대한 통지는 7일 이상 게시로 갈음할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제18조 (준거법 및 재판관할)</h2>
          <p>대한민국 법령을 준거법으로 하며, 분쟁은 운영자 본점 소재지 관할 법원을 제1심 전속관할로 합니다.</p>
        </Section>

        <Section>
          <h2>제19조 (사업자/운영자 정보)</h2>
          <p><strong>브랜드명</strong>: {OPERATOR.brand} · <strong>운영자(상호)</strong>: {OPERATOR.company}</p>
          <p><strong>대표자</strong>: {OPERATOR.rep} · <strong>사업자등록번호</strong>: {OPERATOR.regNo}</p>
          <p><strong>통신판매업신고번호</strong>: {OPERATOR.mailOrderNo}</p>
          <p><strong>주소</strong>: {OPERATOR.address}</p>
          <p><strong>연락처</strong>: {OPERATOR.phone} · <strong>이메일</strong>: {OPERATOR.email}</p>
        </Section>

        <Section>
          <h2>부칙</h2>
          <p><strong>시행일</strong>: {TERMS_EFFECTIVE_DATE}</p>
          <p><strong>버전</strong>: {TERMS_VERSION}</p>
        </Section>
      </T_Container>
    </>
  );
}