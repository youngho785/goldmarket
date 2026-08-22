// src/pages/terms/Privacy.jsx
import React from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";

/*
 * 개인정보처리방침 버전은 앱 버전(versionName/versionCode)과 무관합니다.
 * 기존 공개 문서가 v2.3이었고 이번에 내용이 바뀌므로 이 파일은 v2.4로 표기합니다.
 */
const PRIVACY_VERSION = "v2.4";
const PRIVACY_EFFECTIVE_DATE = "2026-08-22";

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

const ACCOUNT_DELETE_PATH = "/account-delete";

const P_Container = styled.div`
  max-width: 960px;
  margin: 16px auto 36px;
  padding: clamp(24px, 5vw, 46px);
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const P_Title = styled.h1`
  text-align: center;
  margin: 8px 0 8px;
  color: ${({ theme }) => theme.colors.text};
`;

const P_Meta = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 28px;
  font-size: 0.9rem;
`;

const P_Section = styled.section`
  margin-bottom: 24px;

  h2 {
    margin-bottom: 8px;
    font-size: 1.15rem;
    color: ${({ theme }) => theme.colors.primary};
  }

  h3 {
    color: ${({ theme }) => theme.colors.text};
  }

  p {
    margin-bottom: 10px;
  }

  ul {
    margin: 8px 0 12px 18px;
  }
`;

const TopBar = styled.div`
  position: sticky;
  top: 68px;
  z-index: 900;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  backdrop-filter: saturate(180%) blur(8px);
  -webkit-backdrop-filter: saturate(180%) blur(8px);
`;

const TopInner = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BackBtn2 = styled.button`
  padding: 8px 14px;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
    vertical-align: top;
  }

  th {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    text-align: left;
    white-space: nowrap;
  }
`;

const PolicyLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
`;

const ExternalLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
`;

const Notice = styled.div`
  margin: 10px 0 14px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export function Privacy() {
  const nav = useNavigate();

  return (
    <>
      <TopBar role="region" aria-label="개인정보 처리방침 상단 바">
        <TopInner>
          <span>
            개인정보처리방침 • 버전 {PRIVACY_VERSION} • 시행{" "}
            {PRIVACY_EFFECTIVE_DATE}
          </span>
          <BackBtn2 onClick={() => nav(-1)} aria-label="이전으로">
            ← 뒤로
          </BackBtn2>
        </TopInner>
      </TopBar>

      <P_Container>
        <P_Title>개인정보처리방침</P_Title>
        <P_Meta>
          브랜드명: {P_OPERATOR.brand} · 운영자: {P_OPERATOR.company} · 버전{" "}
          {PRIVACY_VERSION} · 시행일 {PRIVACY_EFFECTIVE_DATE}
        </P_Meta>

        <P_Section>
          <h2>1. 총칙</h2>
          <p>
            {P_OPERATOR.company}(이하 “회사”)는 「개인정보 보호법」 등
            관계 법령을 준수하며, 한국골드마켓 서비스의 이용 과정에서 처리되는
            개인정보를 안전하게 보호하기 위해 노력합니다.
          </p>
          <p>
            본 방침은 한국골드마켓 웹사이트와 Android 앱에서 제공하는 회원,
            금교환 계산·방문예약, 알림, 후기 및 고객지원 기능에 적용됩니다.
          </p>
        </P_Section>

        <P_Section>
          <h2>2. 처리하는 개인정보 항목</h2>
          <ul>
            <li>
              <strong>회원가입/인증</strong>: 이메일, 이름, 닉네임,
              휴대전화번호, Firebase Authentication을 통한 인증정보 및 인증 상태
            </li>
            <li>
              <strong>방문예약</strong>: 성명, 휴대전화번호, 방문 날짜·시간,
              예약 상태
            </li>
            <li>
              <strong>골드바 교환</strong>: 이용자가 입력한 제품 종류·무게,
              예상 순금 중량 계산정보, 현장 계측·공임·교환 진행 및 완료 내역
            </li>
            <li>
              <strong>교환 후기</strong>: 별점, 후기 내용
            </li>
            <li>
              <strong>고객지원 및 서비스 이용</strong>: 고객문의 내역,
              접속기록, IP, 기기·브라우저·운영체제 정보, 오류 및 보안 로그
            </li>
            <li>
              <strong>알림</strong>: FCM 푸시 알림 토큰, 앱·브라우저·기기
              구분정보, 알림 수신 설정, 토큰 등록·갱신 정보
            </li>
            <li>
              <strong>선택 항목</strong>: 프로필 이미지, 광고성 정보
              수신동의 여부 및 동의·철회 시각
            </li>
          </ul>

          <Notice>
            비밀번호는 Firebase Authentication을 통한 인증에 사용되며, 회사가
            평문 형태의 비밀번호를 직접 저장하지 않습니다.
          </Notice>
        </P_Section>

        <P_Section>
          <h2>3. 개인정보 이용 목적</h2>
          <ul>
            <li>회원가입, 로그인, 이메일 인증, 비밀번호 재설정 및 회원관리</li>
            <li>본인확인, 부정이용 방지, 계정 및 서비스 보안</li>
            <li>
              예상 순금 중량 계산, 999.9 골드바 교환 조합 안내, 방문예약,
              일정 변경·취소, 현장 교환 진행 및 완료 내역 관리
            </li>
            <li>예약 및 서비스 진행에 필요한 알림 제공</li>
            <li>교환 후기 및 고객문의 처리, 분쟁 대응</li>
            <li>서비스 품질 개선, 장애 분석 및 안정적인 서비스 운영</li>
            <li>
              이용자가 선택적으로 동의한 경우 금시세·주요 소식·이벤트·혜택 등
              광고성 푸시 알림 제공
            </li>
          </ul>
        </P_Section>

        <P_Section>
          <h2>4. 보유기간 및 파기</h2>
          <p>
            개인정보는 원칙적으로 처리 목적이 달성되거나 회원이 계정을
            삭제하면 지체 없이 삭제합니다.
          </p>
          <p>
            회원 탈퇴 시 Firebase 인증 계정, 프로필·연락처, 푸시 토큰,
            프로필 이미지 등 계정에 연결된 개인정보를 삭제하며, 진행 중인
            방문예약은 취소하고 예약 슬롯을 해제합니다.
          </p>
          <p>
            다만 관계 법령에 따른 보존 의무, 보안·부정이용 방지 또는 분쟁
            대응 등 정당한 사유가 있는 경우 필요한 최소 범위의 기록을 해당
            목적에 필요한 기간 동안 별도로 보관한 뒤 삭제합니다. 가능한 경우
            성명·휴대전화번호·이메일·회원 식별자 등 직접 식별정보를 제거하거나
            비식별 처리합니다.
          </p>

          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>구분</th>
                  <th>보유 기준</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>회원 계정·프로필·푸시 토큰</td>
                  <td>회원 탈퇴 또는 처리 목적 달성 시 삭제</td>
                </tr>
                <tr>
                  <td>진행 중 방문예약</td>
                  <td>취소·완료 등 처리 목적 달성 시까지</td>
                </tr>
                <tr>
                  <td>완료된 교환·고객문의·분쟁 관련 기록</td>
                  <td>
                    관계 법령상 보존 의무 또는 분쟁 대응에 필요한 기간까지
                    최소 범위로 보관 후 삭제
                  </td>
                </tr>
                <tr>
                  <td>접속·보안 로그</td>
                  <td>
                    보안·부정이용 방지에 필요한 기간 동안 보관 후 삭제
                    (관계 법령에서 별도 기간을 정한 경우 해당 기간)
                  </td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
        </P_Section>

        <P_Section>
          <h2>5. 개인정보의 제3자 제공</h2>
          <p>
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 판매하거나
            제공하지 않습니다.
          </p>
          <p>
            다만 이용자가 사전에 동의한 경우, 법령에 특별한 규정이 있거나
            법적 의무를 준수하기 위해 필요한 경우에는 해당 목적에 필요한
            최소 범위에서 제공할 수 있습니다.
          </p>
        </P_Section>

        <P_Section>
          <h2>6. 개인정보 처리위탁</h2>
          <p>
            회사는 서비스 운영을 위해 다음과 같이 개인정보 처리업무의 일부를
            외부 서비스 제공자에게 위탁할 수 있습니다.
          </p>

          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>수탁사</th>
                  <th>위탁 업무</th>
                  <th>처리되는 정보</th>
                  <th>보유·이용 기준</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Google LLC / Google Cloud / Firebase</td>
                  <td>
                    회원 인증, 데이터베이스, 파일 저장, 호스팅, 서버리스
                    함수, 푸시 알림 및 서비스 보안
                  </td>
                  <td>
                    계정 식별정보, 연락처, 예약·교환·문의 정보, 프로필 이미지,
                    FCM 토큰, 기기·로그 등 서비스 제공에 필요한 최소 정보
                  </td>
                  <td>
                    서비스 제공 목적 달성 또는 회원 탈퇴·삭제 요청 시까지.
                    다만 관계 법령 또는 제공자의 적법한 보존 사유가 있는 경우
                    해당 기간
                  </td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
        </P_Section>

        <P_Section id="transfer">
          <h2>7. 개인정보의 국외 이전</h2>
          <p>
            회사는 회원가입·인증, 예약·교환 서비스 제공, 알림 및 서비스 운영을
            위해 Firebase 등 글로벌 클라우드 서비스를 이용합니다. 서비스 종류에
            따라 개인정보가 국외의 Google 인프라에서 처리될 수 있습니다.
          </p>
          <p>
            국외 처리위탁·보관이 서비스 계약의 체결 및 이행에 필요한 경우에는
            「개인정보 보호법」 제28조의8 제1항 제3호에 따라 아래 사항을
            개인정보처리방침에 공개합니다.
          </p>

          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>이전받는 자</th>
                  <th>국가·리전</th>
                  <th>이전 시기·방법</th>
                  <th>이전 항목</th>
                  <th>목적</th>
                  <th>보유·이용 기준</th>
                  <th>이전 거부 방법 및 효과</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Google LLC (Firebase Authentication)</td>
                  <td>미국</td>
                  <td>
                    회원가입·로그인·인증 처리 시 암호화된 네트워크 통신
                  </td>
                  <td>
                    이메일, 계정 식별자, 인증 상태 및 인증 처리에 필요한 정보
                  </td>
                  <td>회원 인증 및 계정 관리</td>
                  <td>
                    계정 삭제 또는 처리 목적 달성 시까지. 다만 적법한 보존
                    사유가 있는 경우 해당 기간
                  </td>
                  <td>
                    회원가입을 진행하지 않거나 계정 삭제를 요청하여 이전을
                    거부할 수 있습니다. 다만 인증이 필요한 회원 기능은 이용할
                    수 없습니다.
                  </td>
                </tr>
                <tr>
                  <td>Google LLC (Firebase Cloud Messaging)</td>
                  <td>미국 및 Google의 글로벌 서비스 리전</td>
                  <td>
                    알림 토큰 등록·갱신 및 푸시 알림 전송 시 암호화된 네트워크
                    통신
                  </td>
                  <td>FCM 토큰, 기기·앱 구분정보, 알림 전송 메타데이터</td>
                  <td>서비스 및 선택적 마케팅 푸시 알림 제공</td>
                  <td>
                    토큰 삭제·만료 또는 회원 탈퇴·삭제 요청 시까지
                  </td>
                  <td>
                    기기의 알림 권한을 허용하지 않거나 알림 설정을 해제하여
                    푸시 알림 관련 처리를 거부할 수 있습니다. 이 경우 푸시
                    알림을 통한 예약·혜택 안내를 받을 수 없습니다.
                  </td>
                </tr>
                <tr>
                  <td>Google LLC / Google Cloud (Firebase 플랫폼)</td>
                  <td>
                    대한민국(현재 Firestore·Cloud Functions 주요 리전:
                    asia-northeast3) 및 서비스별 Google 글로벌 인프라
                  </td>
                  <td>
                    데이터 저장·조회·파일 처리·호스팅·서버 처리 시 암호화된
                    네트워크 통신
                  </td>
                  <td>
                    계정·프로필, 예약·교환·문의 정보, 프로필 이미지,
                    서비스 로그·메타데이터 등
                  </td>
                  <td>
                    데이터 저장, 파일 저장, 호스팅, 서버 처리 및 서비스 보안
                  </td>
                  <td>
                    서비스 제공 목적 달성 또는 회원 탈퇴·삭제 요청 시까지.
                    다만 관계 법령 또는 적법한 보존 사유가 있는 경우 해당 기간
                  </td>
                  <td>
                    회원가입·서비스 이용을 중단하거나 계정 삭제를 요청하여
                    이전을 거부할 수 있습니다. 다만 데이터 저장·처리가 필요한
                    회원·예약 기능은 이용할 수 없습니다.
                  </td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>

          <p style={{ marginTop: 10 }}>
            Firebase 서비스별 데이터 처리 위치는 서비스 특성과 프로젝트 설정에
            따라 달라질 수 있습니다. 회사는 서비스 구성 변경 시 본 방침의 관련
            내용을 함께 최신화합니다.
          </p>

          <p>
            Firebase의 개인정보 보호 및 데이터 처리 위치에 관한 자세한 내용은{" "}
            <ExternalLink
              href="https://firebase.google.com/support/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Firebase 개인정보 및 보안 안내
            </ExternalLink>
            에서 확인할 수 있습니다.
          </p>
        </P_Section>

        <P_Section>
          <h2>8. 이용자의 권리 및 계정 삭제</h2>
          <p>
            이용자는 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할
            수 있습니다. 문의: {P_OPERATOR.email} / {P_OPERATOR.phone}
          </p>
          <p>
            로그인 가능한 이용자는 한국골드마켓의 <strong>설정 → 계정 관리</strong>
            에서 직접 회원 탈퇴를 진행할 수 있습니다.
          </p>
          <p>
            앱을 삭제했거나 로그인할 수 없는 경우에도 아래의 공개 웹페이지에서
            계정 및 관련 개인정보 삭제를 요청할 수 있습니다.
          </p>
          <p>
            <PolicyLink to={ACCOUNT_DELETE_PATH}>
              한국골드마켓 계정 및 데이터 삭제 요청
            </PolicyLink>
          </p>
          <p>
            계정 삭제 요청이 확인되면 계정과 연결된 개인정보를 삭제합니다.
            다만 관계 법령상 보존 의무나 보안·분쟁 대응 등 정당한 사유로
            보존해야 하는 일부 기록은 제4조의 기준에 따라 필요한 기간만
            보관한 뒤 삭제합니다.
          </p>
        </P_Section>

        <P_Section id="marketing">
          <h2>9. 광고성 정보 수신동의 (선택)</h2>
          <p>
            이용자가 선택적으로 동의한 경우에 한하여 금시세 업데이트,
            한국골드마켓의 주요 소식, 이벤트·퀴즈·혜택 등의 광고성 정보를
            앱 또는 웹 푸시 알림으로 제공할 수 있습니다.
          </p>
          <ul>
            <li>
              <strong>동의 여부</strong>: 선택사항이며, 동의하지 않아도
              회원가입과 금교환 서비스 이용이 가능합니다.
            </li>
            <li>
              <strong>수신 내용</strong>: 금시세 업데이트, 주요 소식,
              이벤트·퀴즈·혜택 등
            </li>
            <li>
              <strong>수신 채널</strong>: 앱/웹 푸시 알림 등 서비스가
              제공하는 전자적 전송수단
            </li>
            <li>
              <strong>철회</strong>: 마이페이지 또는 설정의 알림 메뉴에서
              언제든 변경·철회할 수 있습니다.
            </li>
          </ul>
          <p>
            회원가입 인증, 비밀번호 재설정, 예약 접수·확정·변경·취소,
            방문 일정 안내 등 이용자가 신청한 서비스의 수행에 필요한 정보는
            광고성 정보 수신동의와 별도로 제공될 수 있습니다.
          </p>
        </P_Section>

        <P_Section>
          <h2>10. 안전성 확보조치</h2>
          <p>
            회사는 개인정보 보호를 위해 접근권한 제한, 전송구간 암호화,
            Firebase 보안규칙 적용, 인증 및 접속기록 관리 등 서비스 규모와
            처리 특성에 맞는 기술적·관리적 보호조치를 시행합니다.
          </p>
        </P_Section>

        <P_Section>
          <h2>11. 개인정보 보호책임자</h2>
          <p>
            운영자: {P_OPERATOR.company} · 대표자: {P_OPERATOR.rep}
          </p>
          <p>
            사업자등록번호: {P_OPERATOR.regNo}
          </p>
          <p>
            주소: {P_OPERATOR.address}
          </p>
          <p>
            연락처: {P_OPERATOR.phone} · {P_OPERATOR.email}
          </p>
          <p>
            {P_OPERATOR.dpo} · {P_OPERATOR.dpoEmail}
          </p>
          <p>
            이용자는 개인정보 처리와 관련한 문의, 불만 처리 및 권리 행사를
            위 연락처로 요청할 수 있습니다.
          </p>
        </P_Section>

        <P_Section>
          <h2>12. 개인정보처리방침의 변경</h2>
          <p>
            본 방침이 변경되는 경우 변경 내용과 시행일을 서비스 내 공지 또는
            기타 적절한 방법으로 안내합니다. 관계 법령에서 별도의 사전 고지를
            요구하는 경우 해당 기준을 따릅니다.
          </p>
        </P_Section>

        <P_Section>
          <h2>부칙</h2>
          <p>
            <strong>시행일</strong>: {PRIVACY_EFFECTIVE_DATE}
          </p>
          <p>
            <strong>문서 버전</strong>: {PRIVACY_VERSION}
          </p>
        </P_Section>
      </P_Container>
    </>
  );
}
