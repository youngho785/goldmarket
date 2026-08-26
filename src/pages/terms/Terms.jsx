// src/pages/terms/Terms.jsx
// ==============================================
import React from "react";
import styled from "styled-components";
import { useNavigate, Link } from "react-router-dom";

const TERMS_VERSION = "v2.0";
const TERMS_EFFECTIVE_DATE = "2026-07-28";

const OPERATOR = {
  brand: "한국골드마켓",
  company: "원일귀금속",
  rep: "나영호",
  regNo: "865-41-00244",
  mailOrderNo: "",
  address: "부산광역시 부산진구 골드테마길 21(범천동)",
  phone: "010-7713-3739",
  email: "lifeapproch@naver.com",
};

const T_Container = styled.div`
  max-width: 900px; margin: 16px auto 36px; padding: clamp(24px, 5vw, 46px); line-height: 1.7;
  color: ${({ theme }) => theme.colors.text}; background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.large}; box-shadow: ${({ theme }) => theme.shadows.card};
`;
const StickyBarRoot = styled.div`
  position: sticky; top: 68px; z-index: 900;
  background: ${({ theme }) => theme.colors.surface};
  backdrop-filter: saturate(180%) blur(8px); -webkit-backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;
const StickyBarInner = styled.div`
  max-width: 900px; margin: 0 auto; padding: 10px 20px;
  display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: .85rem; color: ${({ theme }) => theme.colors.textSecondary};
`;
const BackBtn = styled.button`
  padding: 8px 12px; border-radius: 9999px; border: 1px solid ${({ theme }) => theme.colors.border}; background: ${({ theme }) => theme.colors.surfaceAlt}; color: ${({ theme }) => theme.colors.text}; cursor: pointer;
  &:hover { background: ${({ theme }) => theme.semantic.badgeGoldBg}; }
`;
const Title = styled.h1`
  text-align: center; margin: 8px 0 8px; color: ${({ theme }) => theme.colors.text};
`;
const Meta = styled.p`
  text-align: center; color: ${({ theme }) => theme.colors.textSecondary}; margin: 0 0 28px; font-size: .9rem;
`;
const Section = styled.section`
  margin-bottom: 24px;
  h2 { margin-bottom: 8px; font-size: 1.15rem; color: ${({ theme }) => theme.colors.primary}; }
  p { margin-bottom: 12px; }
  ul { margin: 6px 0 12px 18px; }
`;
const Notice = styled.div`
  background: ${({ theme }) => theme.semantic.alertWarningBg}; border: 1px solid ${({ theme }) => theme.colors.secondary}55; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;
  color: ${({ theme }) => theme.semantic.alertWarningText}; font-size: .96rem;
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
          <strong>서비스 고지:</strong> {OPERATOR.brand}(이하 “회사”)의 골드바 교환 서비스는
          원일귀금속이 직접 제공합니다. 온라인 계산 결과는 예상값이며, 최종 순도·중량·공임은
          매장에서 이용자와 함께 확인하고 동의 후 확정합니다.
        </Notice>

        <Section>
          <h2>제1조 (목적)</h2>
          <p>본 약관은 회사가 제공하는 서비스(웹·앱 포함)의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 규정합니다.</p>
        </Section>

        <Section>
          <h2>제2조 (정의)</h2>
          <p>① “골드바 교환”이란 이용자가 보유한 금의 순도와 중량을 확인하고, 이용자의 동의를 거쳐 지정 규격의 999.9 골드바로 교환하는 서비스를 말합니다.</p>
          <p>② “예상 계산”이란 이용자가 입력한 제품 종류와 무게를 기준으로 예상 순금 중량 및 골드바 조합을 안내하는 온라인 기능을 말합니다.</p>
          <p>③ “회원”이란 회사에 개인정보를 제공하여 회원등록을 하고 교환 예약 및 진행내역 조회 등 회원 서비스를 이용하는 자를 말합니다.</p>
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
            <li>1. 보유 금의 예상 순금 중량 및 골드바 조합 계산</li>
            <li>2. 골드바 교환 방문예약, 현장 계측, 공임 확인 및 교환</li>
            <li>3. 교환 진행내역 조회와 고객문의 등 부가 기능</li>
          </ul>
          <p>② 서비스의 내용·방식은 회사 정책과 기술적 필요에 따라 변경될 수 있으며, 중요한 변경은 제3조에 따라 공지합니다.</p>
          <p>③ 회사는 이용자가 최종 순도·중량·골드바 조합과 비용을 확인할 수 있도록 교환 확정 전에 관련 내용을 안내합니다.</p>
        </Section>

        <Section>
          <h2>제6조 (골드바 교환 예약 및 감정)</h2>
          <p>① <strong>예상 계산</strong>: 온라인 결과는 이용자가 입력한 정보에 따른 예상값으로, 최종 교환량을 보증하지 않습니다.</p>
          <p>② <strong>현장 확인</strong>: 회사는 매장에서 제품의 순도·중량·부속물 등을 확인하고 최종 인정 중량을 안내합니다.</p>
          <p>③ <strong>비용 안내</strong>: 이용자가 부담할 골드바 제작 공임과 잔여 중량 처리 방법은 교환 확정 전에 안내합니다.</p>
          <p>④ <strong>교환 확정</strong>: 이용자가 최종 내용을 확인하고 동의한 후 교환 또는 제작을 진행합니다. 제작 시작 후 취소가 제한되는 경우에는 그 내용과 사유를 사전에 고지합니다.</p>
          <p>⑤ <strong>접수 제한</strong>: 위·변조·도난 의심, 본인확인 불일치, 법령 위반 소지가 있는 경우 접수 또는 교환을 제한·보류·거절할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제7조 (가격·시세 및 적용 기준)</h2>
          <p>① 제품별 예상 환산 기준과 골드바 제작 공임은 서비스 화면에서 확인할 수 있으며, 시장 상황과 제작 조건에 따라 변경될 수 있습니다.</p>
          <p>② 현장 확인 결과와 온라인 예상값이 다를 경우 회사는 차이의 원인과 최종 적용 기준을 설명하고 이용자의 동의를 받습니다.</p>
        </Section>

        <Section>
          <h2>제8조 (예약 변경·취소 및 교환 내역)</h2>
          <p>① 이용자는 매장 방문 전 예약을 변경하거나 취소할 수 있습니다.</p>
          <p>② 현장 계측 후에도 최종 교환에 동의하기 전에는 교환을 진행하지 않을 수 있습니다.</p>
          <p>③ 교환이 확정되면 회사는 순도·중량·골드바 조합·공임 등 확정 내역을 이용자가 확인할 수 있는 형태로 제공합니다.</p>
        </Section>

        <Section>
          <h2>제9조 (금지행위)</h2>
          <p>① 이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ul>
            <li>1. 타인의 정보 도용 또는 허위 정보로 예약·교환을 신청하는 행위</li>
            <li>2. 도난품·밀수품·위조 각인·불법 변조 금 등 불법 물품의 교환을 시도하는 행위</li>
            <li>3. 지식재산권·초상권 등 제3자 권리 침해</li>
            <li>4. 시스템 장애 유발(해킹, 비정상 크롤링, 자동화 남용 등)</li>
            <li>5. 기타 법령·공서양속 위반 행위</li>
          </ul>
        </Section>

        <Section>
          <h2>제10조 (신원정보 및 기록 보존)</h2>
          <p>① 분쟁 해결 또는 법령 준수 목적상 필요한 범위에서 회사는 거래 관련 정보 및 접속기록 등을 일정 기간 보존할 수 있습니다.</p>
          <p>② 적법한 요청이 있을 경우 법령에 따라 필요한 최소한의 범위에서 협조할 수 있습니다.</p>
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
          <h2>제12조 (광고·마케팅 알림)</h2>
          <p>사전 동의를 받은 경우에 한하여 이메일·문자·푸시로 혜택·이벤트 정보를 제공할 수 있으며, 이용자는 언제든 수신을 철회할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제13조 (서비스의 이용제한·중지)</h2>
          <p>불가피한 사유로 서비스가 제한·중지될 수 있으며, 약관·정책 위반 시 경고·일시정지·영구정지 등 조치가 이루어질 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제14조 (손해배상 및 책임의 한계)</h2>
          <p>① 회사의 과실로 인한 손해는 법령이 허용하는 범위 내에서 <strong>현실로 발생한 통상손해</strong>를 한도로 배상합니다.</p>
          <p>② 간접·특별·결과적 손해 등은 책임을 지지 않습니다.</p>
        </Section>

        <Section>
          <h2>제15조 (계약 해지 및 회원탈퇴)</h2>
          <p>회원은 언제든 탈퇴를 요청할 수 있습니다. 다만 미완료 처리 또는 진행 중인 예약·교환이 있는 경우 해당 건을 완료하거나 정상 취소한 후 탈퇴할 수 있으며, 회원탈퇴만으로 진행 중인 예약·교환이 자동 취소되지는 않습니다.</p>
        </Section>

        <Section>
          <h2>제16조 (통지)</h2>
          <p>공지, 이메일, 푸시 등 합리적 수단으로 통지할 수 있으며, 불특정 다수에 대한 통지는 7일 이상 게시로 갈음할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>제17조 (준거법 및 재판관할)</h2>
          <p>대한민국 법령을 준거법으로 하며, 분쟁은 운영자 본점 소재지 관할 법원을 제1심 전속관할로 합니다.</p>
        </Section>

        <Section>
          <h2>제18조 (사업자/운영자 정보)</h2>
          <p><strong>브랜드명</strong>: {OPERATOR.brand} · <strong>운영자(상호)</strong>: {OPERATOR.company}</p>
          <p><strong>대표자</strong>: {OPERATOR.rep} · <strong>사업자등록번호</strong>: {OPERATOR.regNo}</p>
          {OPERATOR.mailOrderNo && <p><strong>통신판매업신고번호</strong>: {OPERATOR.mailOrderNo}</p>}
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
