// src/pages/Privacy.jsx
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const PRIVACY_VERSION = "v1.0";
const PRIVACY_EFFECTIVE_DATE = "2025-08-16";

// 운영자(사업자) 정보
const OPERATOR = {
  brand: "한국골드마켓",
  company: "원일귀금속",
  rep: "나영호",
  regNo: "865-41-00244",
  address: "부산광역시 부산진구 골드테마길 21(범천동)",
  phone: "010-7713-3739",
  email: "lifeapproch@naver.com", // 개인정보 문의 창구
  dpo: "개인정보 보호책임자: 나영호",
  dpoEmail: "lifeapproch@naver.com",
};

const Container = styled.div`
  max-width: 900px; margin: auto; padding: 40px 20px; line-height: 1.65;
  color: ${({ theme }) => theme.colors.text || "#333"};
`;
const Title = styled.h1`
  text-align: center; margin: 24px 0 8px; color: ${({ theme }) => theme.colors.primary || "#0f172a"};
`;
const Meta = styled.p`
  text-align: center; color: #6b7280; margin: 0 0 28px; font-size: 0.9rem;
`;
const Section = styled.section`
  margin-bottom: 24px;
  h2 { margin-bottom: 8px; font-size: 1.15rem; color: ${({ theme }) => theme.colors.primary || "#0f172a"}; }
  p { margin-bottom: 10px; }
  ul { margin: 8px 0 12px 18px; }
`;
const TopBar = styled.div`
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme.colors.surface || "rgba(255,255,255,0.92)"};
  border-bottom: 1px solid #eee; backdrop-filter: saturate(180%) blur(8px);
  -webkit-backdrop-filter: saturate(180%) blur(8px);
`;
const TopInner = styled.div`
  max-width: 900px; margin: 0 auto; padding: 10px 20px;
  display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; color: #555;
`;
const BackBtn = styled.button`
  padding: 8px 14px; border-radius: 9999px; border: 1px solid #ddd; background: #fff; cursor: pointer;
  &:hover { background: #fafafa; }
`;
const TableWrap = styled.div`
  overflow-x: auto; border: 1px solid #eee; border-radius: 8px; background: #fff;
`;
const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.95rem;
  th, td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { background: #fafafa; text-align: left; white-space: nowrap; }
`;

export default function Privacy() {
  const nav = useNavigate();
  return (
    <>
      <TopBar>
        <TopInner>
          <span>개인정보처리방침 • 버전 {PRIVACY_VERSION} • 시행 {PRIVACY_EFFECTIVE_DATE}</span>
          <BackBtn onClick={() => nav(-1)} aria-label="이전으로">← 뒤로</BackBtn>
        </TopInner>
      </TopBar>

      <Container>
        <Title>개인정보처리방침</Title>
        <Meta>브랜드명: {OPERATOR.brand} · 운영자: {OPERATOR.company} · 버전 {PRIVACY_VERSION} · 시행일 {PRIVACY_EFFECTIVE_DATE}</Meta>

        <Section>
          <h2>1. 총칙</h2>
          <p>{OPERATOR.company}(이하 “회사”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 처리합니다.</p>
        </Section>

        <Section>
          <h2>2. 처리하는 개인정보 항목</h2>
          <ul>
            <li><strong>회원가입/인증</strong>: 이메일, 비밀번호(해시), 이름/닉네임, 휴대전화</li>
            <li><strong>서비스 이용</strong>: 게시/채팅 내역, 교환 예약/감정/정산 정보, 접속기록(IP·기기정보·로그)</li>
            <li><strong>선택</strong>: 위치정보(동의 시), 마케팅 수신 동의(채널별), 프로필 이미지 등</li>
          </ul>
        </Section>

        <Section>
          <h2>3. 이용 목적</h2>
          <ul>
            <li>회원관리, 본인확인, 부정이용 방지</li>
            <li>프리마켓 중개, 골드바 교환 예약/감정/정산 제공</li>
            <li>고객문의/분쟁 대응, 서비스 개선 및 안정화</li>
            <li>선택 동의 시 광고/이벤트 안내 및 분석</li>
          </ul>
        </Section>

        <Section>
          <h2>4. 보유기간 및 파기</h2>
          <p>처리 목적 달성 시 지체 없이 파기합니다. 다만 법령상 의무가 있는 경우 해당 기간 동안 보관합니다.</p>
        </Section>

        {/* 앵커: 클라우드/국외이전/처리위탁 */}
        <Section id="transfer">
          <h2>5. 처리위탁 및 국외이전</h2>
          <p>회사는 서비스 제공을 위해 일부 업무를 외부에 위탁하거나 클라우드 인프라를 이용함에 따라 개인정보가 국외로 이전될 수 있습니다. 수탁사/제공받는 자, 국가, 이전 항목, 목적, 보유기간은 아래와 같습니다.</p>

          <h3 style={{margin:"14px 0 8px"}}>5-1. 처리위탁</h3>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>수탁사</th><th>위탁 업무</th><th>처리 항목</th><th>보유·이용기간</th><th>연락처</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Google Cloud / Firebase (Google LLC)</td>
                  <td>인증, 데이터베이스/스토리지, 호스팅, 서버리스 함수 운영</td>
                  <td>계정 식별자, 프로필/연락처, 로그/메타데이터, 게시/채팅 등 최소 정보</td>
                  <td>위탁 계약 종료 또는 목적 달성 시까지(법정 보존 예외 별도)</td>
                  <td>support.google.com</td>
                </tr>
                {/* 국내 PG, 알림대행, 고객센터 솔루션 등을 쓰면 행 추가 */}
              </tbody>
            </Table>
          </TableWrap>

          <h3 style={{margin:"18px 0 8px"}}>5-2. 국외이전</h3>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>제공받는 자</th><th>이전 국가</th><th>이전 일시·방법</th><th>이전 항목</th><th>이용 목적</th><th>보유·이용기간</th><th>연락처</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Google LLC (Firebase)</td>
                  <td>미국(및 서비스 제공상 필요한 글로벌 리전)</td>
                  <td>서비스 이용 시 네트워크를 통한 실시간 이전</td>
                  <td>계정/프로필 식별자, 이메일, 해시된 비밀번호, 로그/메타, 게시/채팅 등 최소 정보</td>
                  <td>인증·데이터 저장·호스팅·서버리스 처리 및 보안</td>
                  <td>목적 달성 시까지 또는 탈퇴/삭제 요청 시(법정 보존 예외 별도)</td>
                  <td>support.google.com</td>
                </tr>
                {/* CDN/보안(예: Cloudflare) 사용 시 행 추가 */}
              </tbody>
            </Table>
          </TableWrap>

          <p style={{marginTop:12}}>※ 위탁/국외이전 현황은 서비스 안정화 또는 사업자 변경에 따라 달라질 수 있으며, 중요한 변경 시 본 방침 개정으로 고지합니다.</p>
        </Section>

        <Section>
          <h2>6. 이용자의 권리</h2>
          <p>이용자는 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있습니다(문의: {OPERATOR.email} / {OPERATOR.phone}).</p>
          <p>마케팅 수신 및 위치기반서비스 동의는 마이페이지의 동의관리에서 철회/변경할 수 있습니다.</p>
        </Section>

        <Section>
          <h2>7. 안전성 확보조치</h2>
          <p>접근권한 관리, 전송·저장 암호화, 침입탐지/로그 모니터링, 내부관리계획 등 법령이 요구하는 보호조치를 시행합니다.</p>
        </Section>

        <Section>
          <h2>8. 개인정보 보호책임자</h2>
          <p>{OPERATOR.dpo} · {OPERATOR.dpoEmail}</p>
        </Section>

        <Section>
          <h2>9. 고지의 의무</h2>
          <p>중대한 변경은 최소 7일 전(이용자에게 불리한 변경은 30일 전) 공지합니다.</p>
        </Section>

        <Section>
          <h2>부칙</h2>
          <p><strong>시행일</strong>: {PRIVACY_EFFECTIVE_DATE}</p>
          <p><strong>버전</strong>: {PRIVACY_VERSION}</p>
        </Section>
      </Container>
    </>
  );
}
