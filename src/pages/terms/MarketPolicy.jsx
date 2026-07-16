// src/pages/terms/MarketPolicy.jsx
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const POLICY_VERSION = "v1.0";
const POLICY_EFFECTIVE_DATE = "2025-08-16";
const BRAND = "한국골드마켓";
const M_OPERATOR = {
  name: "원일귀금속",
  phone: "010-7713-3739",
  email: "lifeapproch@naver.com",
  reportEmail: "lifeapproch@naver.com",
};

const M_Container = styled.div`
  max-width: 900px; margin: auto; padding: 40px 20px; line-height: 1.65;
  color: ${({ theme }) => theme?.colors?.text || "#333"};
`;
const M_Title = styled.h1`
  text-align: center; margin: 24px 0 8px; color: ${({ theme }) => theme?.colors?.primary || "#0f172a"};
`;
const M_Meta = styled.p`
  text-align: center; color: #6b7280; margin: 0 0 28px; font-size: .9rem;
`;
const M_Section = styled.section`
  margin-bottom: 24px; h2 { margin-bottom: 8px; font-size: 1.15rem; color: ${({ theme }) => theme?.colors?.primary || "#0f172a"}; }
  p { margin-bottom: 10px; } ul { margin: 8px 0 12px 18px; } li { margin-bottom: 4px; }
`;
const Callout = styled.div`
  background: #fffcf3; border: 1px solid #f0e1a6; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;
  color: #6b4e16; font-size: .96rem;
`;
const TopBar2 = styled.div`
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme?.colors?.surface || "rgba(255,255,255,0.92)"};
  border-bottom: 1px solid #eee; backdrop-filter: saturate(180%) blur(8px);
  -webkit-backdrop-filter: saturate(180%) blur(8px);
`;
const TopInner2 = styled.div`
  max-width: 900px; margin: 0 auto; padding: 10px 20px;
  display: flex; align-items: center; justify-content: space-between; font-size: .9rem; color: #555;
`;
const BackBtn3 = styled.button`
  padding: 8px 14px; border-radius: 9999px; border: 1px solid #ddd; background: #fff; cursor: pointer;
  &:hover { background: #fafafa; }
`;
const TableWrap2 = styled.div`
  overflow-x: auto; border: 1px solid #eee; border-radius: 8px; background: #fff; margin-top: 8px;
`;
const Table2 = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.95rem;
  th, td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { background: #fafafa; text-align: left; white-space: nowrap; }
`;

export default function MarketPolicy() {
  const nav = useNavigate();
  return (
    <>
      <TopBar2 role="region" aria-label="프리마켓 운영정책 상단 바">
        <TopInner2>
          <span>프리마켓 운영정책 • 버전 {POLICY_VERSION} • 시행 {POLICY_EFFECTIVE_DATE}</span>
          <BackBtn3 onClick={() => nav(-1)} aria-label="이전으로">← 뒤로</BackBtn3>
        </TopInner2>
      </TopBar2>

      <M_Container>
        <M_Title>프리마켓 운영정책</M_Title>
        <M_Meta>브랜드명: {BRAND} · 운영자: {M_OPERATOR.name} · 버전 {POLICY_VERSION} · 시행일 {POLICY_EFFECTIVE_DATE}</M_Meta>

        <Callout>
          <strong>중요:</strong> {BRAND}는 <strong>통신판매중개자</strong>로서 거래 당사자가 아니며,
          이용자 간 거래의 안전·품질·이행을 보증하지 않습니다. 신고가 접수되면 아래 기준에 따라 임시조치 및 제재를 진행할 수 있습니다.
        </Callout>

        <M_Section id="prohibited">
          <h2>1. 금지되는 상품/행위</h2>
          <ul>
            <li>① 도난품, 습득물, 밀수품, 위조 각인 또는 변조된 금품</li>
            <li>② 불법 채굴·탈세 등 범죄와 관련된 물품 및 거래</li>
            <li>③ 법령·공서양속에 반하는 표현물, 권리침해(저작권/상표권 등) 물품</li>
            <li>④ 가격 담합, 허위매물, 시세왜곡, 과장/허위 표시</li>
            <li>⑤ 타인의 개인정보 공개, 사칭, 계정거래, 부정 접근·크롤링</li>
          </ul>
        </M_Section>

        <M_Section id="listing">
          <h2>2. 게시/거래 운영 기준</h2>
          <ul>
            <li>① 매물 정보는 사실에 근거하여 성실히 작성하고, 사진·설명은 실제 물품을 정확히 반영할 것</li>
            <li>② 순도, 중량(g), 각인, 상태를 명확히 기재</li>
            <li>③ 거래 조건(대금·물품 교환)은 채팅에서 명확히 합의</li>
            <li>④ 위법·사기 정황 신고 시 노출중단·계정제재 등 임시조치 가능</li>
          </ul>
        </M_Section>

        <M_Section id="safety">
          <h2>3. 안전 거래 수칙(권고)</h2>
          <ul>
            <li>① 대면 거래는 CCTV가 있는 공공장소에서 진행</li>
            <li>② 순도·중량은 공신력 있는 도구로 상호 확인</li>
            <li>③ 계좌 송금 시 실명 일치 확인, 고액 현금 거래는 영수증 보관</li>
            <li>④ 의심 정황 발생 시 거래 중단 및 신고</li>
          </ul>
        </M_Section>

        <M_Section id="report">
          <h2>4. 신고 접수 및 처리 절차</h2>
          <p>신고 사유: 불법물·도난 의심, 사기 정황, 권리침해, 개인정보 노출 등. 아래 경로로 접수해 주세요.</p>
          <ul>
            <li>• 앱 내 신고 버튼(게시물/채팅)</li>
            <li>• 이메일: <a href={`mailto:${M_OPERATOR.reportEmail}`}>{M_OPERATOR.reportEmail}</a></li>
          </ul>

          <TableWrap2>
            <Table2>
              <thead>
                <tr><th>단계</th><th>내용</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>① 접수</td>
                  <td>신고 내용·증빙 확인(스크린샷, 송금내역 등)</td>
                </tr>
                <tr>
                  <td>② 임시조치</td>
                  <td>게시물 숨김/검색제한, 채팅 제한, 긴급 차단 등</td>
                </tr>
                <tr>
                  <td>③ 소명요청</td>
                  <td>당사자에게 소명 기회 부여(일정 기한 내 제출)</td>
                </tr>
                <tr>
                  <td>④ 결정</td>
                  <td>경고/일시·영구정지, 게시물 삭제, 재게시 허용 등</td>
                </tr>
              </tbody>
            </Table2>
          </TableWrap2>
          <p style={{marginTop:8}}>※ 긴급 위험(명백한 불법/안전 위험)의 경우 소명 이전에 선조치할 수 있습니다.</p>
        </M_Section>

        <M_Section id="sanctions">
          <h2>5. 제재 기준(라더)</h2>
          <TableWrap2>
            <Table2>
              <thead>
                <tr><th>구분</th><th>예시</th><th>기본 조치</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>경미</td>
                  <td>중복/오표기, 경미한 오인 소지</td>
                  <td>수정 요청 또는 경고</td>
                </tr>
                <tr>
                  <td>보통</td>
                  <td>허위매물, 반복적인 부정확 정보</td>
                  <td>게시중단 + 7~30일 제한</td>
                </tr>
                <tr>
                  <td>중대</td>
                  <td>사기 정황, 불법물 판매, 권리침해 고의</td>
                  <td>즉시 영구정지, 필요 시 수사기관 협조</td>
                </tr>
              </tbody>
            </Table2>
          </TableWrap2>
        </M_Section>

        <M_Section id="liability">
          <h2>6. 분쟁 및 책임</h2>
          <p>프리마켓 거래는 이용자 간 책임으로 진행됩니다. 회사는 법령상 책임이 인정되는 경우를 제외하고 거래 이행·품질·안전성 등에 대한 책임을 지지 않습니다.</p>
        </M_Section>

        <M_Section id="records">
          <h2>7. 기록 보존 및 제공</h2>
          <p>신고 처리·분쟁 해결·법령 준수를 위해 필요한 범위에서 거래 관련 기록을 보존할 수 있으며, 수사기관 요청 시 법령에 따라 필요한 최소한의 정보를 제공할 수 있습니다.</p>
        </M_Section>

        <M_Section id="update">
          <h2>8. 정책 개정</h2>
          <p>본 운영정책은 서비스 고지 후 개정될 수 있으며, 중대한 변경은 시행 7일 전(불리한 경우 30일 전) 사전 공지합니다.</p>
        </M_Section>

        <M_Section>
          <h2>부칙</h2>
          <p><strong>시행일</strong>: {POLICY_EFFECTIVE_DATE}</p>
          <p><strong>버전</strong>: {POLICY_VERSION}</p>
        </M_Section>
      </M_Container>
    </>
  );
}
