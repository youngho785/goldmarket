// src/pages/terms/Privacy.jsx
// ==============================================
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const PRIVACY_VERSION = "v2.1";
const PRIVACY_EFFECTIVE_DATE = "2026-07-28";

const P_OPERATOR = {
  brand: "한국골드마켓",
  company: "원일귀금속",
  rep: "나영호",
  regNo: "865-41-00244",
  address: "부산광역시 부산진구 골드테마길 21(범천동)",
  phone: "010-7713-3739",
  email: "lifeapproch@naver.com",
  dpo: "개인정보 보호책임자: 나영호",
  dpoEmail: "lifeapproch@naver.com",
};

const P_Container = styled.div`
  max-width: 960px; margin: 16px auto 36px; padding: clamp(24px, 5vw, 46px); line-height: 1.7;
  color: ${({ theme }) => theme.colors.text}; background: ${({ theme }) => theme.colors.surface}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.large}; box-shadow: ${({ theme }) => theme.shadows.card};
`;
const P_Title = styled.h1`
  text-align: center; margin: 8px 0 8px; color: ${({ theme }) => theme.colors.text};
`;
const P_Meta = styled.p`
  text-align: center; color: ${({ theme }) => theme.colors.textSecondary}; margin: 0 0 28px; font-size: 0.9rem;
`;
const P_Section = styled.section`
  margin-bottom: 24px;
  h2 { margin-bottom: 8px; font-size: 1.15rem; color: ${({ theme }) => theme.colors.primary}; }
  p { margin-bottom: 10px; }
  ul { margin: 8px 0 12px 18px; }
`;
const TopBar = styled.div`
  position: sticky; top: 68px; z-index: 900;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; backdrop-filter: saturate(180%) blur(8px);
  -webkit-backdrop-filter: saturate(180%) blur(8px);
`;
const TopInner = styled.div`
  max-width: 900px; margin: 0 auto; padding: 10px 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 0.85rem; color: ${({ theme }) => theme.colors.textSecondary};
`;
const BackBtn2 = styled.button`
  padding: 8px 14px; border-radius: 9999px; border: 1px solid ${({ theme }) => theme.colors.border}; background: ${({ theme }) => theme.colors.surfaceAlt}; color: ${({ theme }) => theme.colors.text}; cursor: pointer;
  &:hover { background: ${({ theme }) => theme.semantic.badgeGoldBg}; }
`;
const TableWrap = styled.div`
  overflow-x: auto; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px; background: ${({ theme }) => theme.colors.surface};
`;
const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.95rem;
  th, td { padding: 10px 12px; border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; vertical-align: top; }
  th { background: ${({ theme }) => theme.colors.surfaceAlt}; text-align: left; white-space: nowrap; }
`;

export function Privacy() {
  const nav = useNavigate();
  return (
    <>
      <TopBar role="region" aria-label="개인정보 처리방침 상단 바">
        <TopInner>
          <span>개인정보처리방침 • 버전 {PRIVACY_VERSION} • 시행 {PRIVACY_EFFECTIVE_DATE}</span>
          <BackBtn2 onClick={() => nav(-1)} aria-label="이전으로">← 뒤로</BackBtn2>
        </TopInner>
      </TopBar>

      <P_Container>
        <P_Title>개인정보처리방침</P_Title>
        <P_Meta>브랜드명: {P_OPERATOR.brand} · 운영자: {P_OPERATOR.company} · 버전 {PRIVACY_VERSION} · 시행일 {PRIVACY_EFFECTIVE_DATE}</P_Meta>

        <P_Section>
          <h2>1. 총칙</h2>
          <p>{P_OPERATOR.company}(이하 “회사”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 처리합니다.</p>
        </P_Section>

        <P_Section>
          <h2>2. 처리하는 개인정보 항목</h2>
          <ul>
            <li><strong>회원가입/인증</strong>: 이메일, 비밀번호(해시), 이름/닉네임, 휴대전화</li>
            <li><strong>방문 예약</strong>: 성명, 휴대전화번호, 방문 날짜·시간, 회원 이메일</li>
            <li><strong>골드바 교환</strong>: 입력한 제품 종류·무게, 현장 계측, 공임, 교환 진행 및 확정 내역</li>
            <li><strong>교환 후기</strong>: 별점, 후기 내용(공개 화면에는 회원 식별정보를 표시하지 않음)</li>
            <li><strong>서비스 이용</strong>: 고객문의 내역, 접속기록(IP·기기정보·로그)</li>
            <li><strong>선택</strong>: 마케팅 수신 동의(채널별), 프로필 이미지 등</li>
          </ul>
        </P_Section>

        <P_Section>
          <h2>3. 이용 목적</h2>
          <ul>
            <li>회원관리, 본인확인, 부정이용 방지</li>
            <li>예상 순금 중량 계산, 골드바 교환 방문예약·현장 계측·공임 확인·진행내역 및 검증 후기 제공</li>
            <li>고객문의/분쟁 대응, 서비스 개선 및 안정화</li>
            <li>선택 동의 시 광고/이벤트 안내 및 분석</li>
          </ul>
        </P_Section>

        <P_Section>
          <h2>4. 보유기간 및 파기</h2>
          <p>처리 목적 달성 시 지체 없이 파기합니다. 다만 법령상 의무가 있는 경우 해당 기간 동안 보관합니다.</p>
        </P_Section>

        <P_Section>
          <h2>4-1. 보유기간·법적근거</h2>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>항목</th><th>보유기간</th><th>근거</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>계약·청약철회·대금결제·재화공급 관련 기록</td>
                  <td>5년</td>
                  <td>전자상거래법 제6조 및 시행령 제6조</td>
                </tr>
                <tr>
                  <td>소비자 불만 또는 분쟁처리 기록</td>
                  <td>3년</td>
                  <td>전자상거래법 제6조 및 시행령 제6조</td>
                </tr>
                <tr>
                  <td>표시·광고에 관한 기록</td>
                  <td>6개월</td>
                  <td>전자상거래법 제6조 및 시행령 제6조</td>
                </tr>
                <tr>
                  <td>접속로그(IP 포함), 접속지 추적자료</td>
                  <td>3개월</td>
                  <td>통신비밀보호법 제15조의2</td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
          <p style={{marginTop:8}}>※ 관련 법령 개정 또는 서비스 내용 변경 시 보유기간과 처리 항목은 변경될 수 있으며, 변경 사항은 본 방침을 통해 안내합니다.</p>
        </P_Section>

        <P_Section id="transfer">
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
                  <td>계정 식별자, 프로필/연락처, 교환·문의 정보, 로그/메타데이터 등 최소 정보</td>
                  <td>위탁 계약 종료 또는 목적 달성 시까지(법정 보존 예외 별도)</td>
                  <td>support.google.com</td>
                </tr>
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
                  <td>미국(및 필요한 글로벌 리전)</td>
                  <td>계정 생성·로그인·데이터 처리 시점마다 네트워크를 통한 안전한 전송(전 구간 암호화)</td>
                  <td>계정/프로필 식별자, 이메일, 해시된 비밀번호, 교환·문의 정보, 로그/메타데이터 등 최소 정보</td>
                  <td>인증·데이터 저장·호스팅·서버리스 처리 및 보안</td>
                  <td>서비스 제공 목적 달성 또는 탈퇴/삭제 요청 시까지(법정 보존 예외 별도)</td>
                  <td>support.google.com</td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>

          <p style={{marginTop:12}}>※ CDN/보안/모니터링 등 외부 서비스를 추가 사용하는 경우, 해당 내역을 표에 추가하여 고지하십시오.</p>
        </P_Section>

        <P_Section>
          <h2>6. 이용자의 권리</h2>
          <p>이용자는 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있습니다(문의: {P_OPERATOR.email} / {P_OPERATOR.phone}).</p>
          <p>마케팅 수신 동의는 마이페이지의 동의관리 또는 안내된 수신거부 방법을 통해 철회·변경할 수 있습니다.</p>
        </P_Section>

        <P_Section>
          <h2>7. 안전성 확보조치</h2>
          <p>접근권한 관리, 전송·저장 암호화, 침입탐지/로그 모니터링, 내부관리계획 등 법령이 요구하는 보호조치를 시행합니다.</p>
        </P_Section>

        <P_Section>
          <h2>8. 개인정보 보호책임자</h2>
          <p>{P_OPERATOR.dpo} · {P_OPERATOR.dpoEmail}</p>
        </P_Section>

        <P_Section>
          <h2>9. 고지의 의무</h2>
          <p>중대한 변경은 최소 7일 전(이용자에게 불리한 변경은 30일 전) 공지합니다.</p>
        </P_Section>

        <P_Section>
          <h2>부칙</h2>
          <p><strong>시행일</strong>: {PRIVACY_EFFECTIVE_DATE}</p>
          <p><strong>버전</strong>: {PRIVACY_VERSION}</p>
        </P_Section>
      </P_Container>
    </>
  );
}
