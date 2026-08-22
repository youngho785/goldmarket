// src/pages/AccountDelete.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const APP_NAME = "한국골드마켓";
const OPERATOR = "원일귀금속";
const CONTACT_EMAIL = "lifeapproch@naver.com";

const Wrap = styled.main`
  max-width: 860px;
  margin: 18px auto 48px;
  padding: clamp(20px, 5vw, 42px);
  color: ${({ theme }) => theme.colors.text};
`;

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: clamp(22px, 4vw, 38px);
`;

const Eyebrow = styled.div`
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;
  font-size: 0.9rem;
`;

const Title = styled.h1`
  margin: 0 0 12px;
  font-size: clamp(1.7rem, 4vw, 2.35rem);
  line-height: 1.25;
`;

const Lead = styled.p`
  margin: 0 0 26px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.75;
`;

const Section = styled.section`
  margin-top: 28px;

  h2 {
    margin: 0 0 10px;
    font-size: 1.15rem;
    color: ${({ theme }) => theme.colors.primary};
  }

  p {
    margin: 8px 0;
    line-height: 1.75;
  }

  ol,
  ul {
    margin: 10px 0 0 22px;
    line-height: 1.8;
  }
`;

const Notice = styled.div`
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  line-height: 1.7;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
`;

const PrimaryAction = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-weight: 800;
  text-decoration: none;
`;

const SecondaryButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  cursor: pointer;
`;

const TextLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
`;

const Footer = styled.p`
  margin-top: 28px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  line-height: 1.65;
`;

export default function AccountDelete() {
  const [copyMessage, setCopyMessage] = useState("");

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("[한국골드마켓] 계정 및 데이터 삭제 요청");
    const body = encodeURIComponent(
      [
        "한국골드마켓 계정 및 데이터 삭제를 요청합니다.",
        "",
        "※ 가능하면 한국골드마켓에 가입한 이메일 주소에서 보내주세요.",
        "가입 이메일:",
        "",
        "요청사항: 계정 및 계정에 연결된 개인정보 삭제",
      ].join("\n")
    );

    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "계정 및 데이터 삭제 요청 | 한국골드마켓";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopyMessage("문의 이메일 주소를 복사했습니다.");
    } catch {
      setCopyMessage(`문의 이메일: ${CONTACT_EMAIL}`);
    }
  };

  return (
    <Wrap>
      <Card>
        <Eyebrow>Google Play 계정 삭제 안내</Eyebrow>
        <Title>{APP_NAME} 계정 및 데이터 삭제 요청</Title>
        <Lead>
          이 페이지는 {APP_NAME} 사용자가 앱을 삭제했거나 로그인할 수 없는
          경우에도 계정과 관련 개인정보의 삭제를 요청할 수 있도록 제공되는
          공개 웹페이지입니다. 운영자: {OPERATOR}
        </Lead>

        <Section>
          <h2>1. 앱/웹에 로그인할 수 있는 경우</h2>
          <p>
            한국골드마켓에 로그인한 뒤 <strong>설정 → 계정 관리 → 계정 탈퇴</strong>
            에서 직접 계정을 삭제할 수 있습니다.
          </p>
          <p>
            웹에서 로그인할 수 있다면 <TextLink to="/settings">설정 페이지</TextLink>
            로 이동해 직접 탈퇴할 수 있습니다.
          </p>
        </Section>

        <Section>
          <h2>2. 로그인할 수 없거나 앱을 이미 삭제한 경우</h2>
          <p>
            아래 버튼으로 계정 삭제를 요청할 수 있습니다. 본인 확인을 빠르게
            하기 위해 가능하면 <strong>한국골드마켓에 가입한 이메일 주소</strong>
            에서 요청을 보내주세요.
          </p>

          <Actions>
            <PrimaryAction href={mailto}>계정 삭제 요청 이메일 보내기</PrimaryAction>
            <SecondaryButton type="button" onClick={copyEmail}>
              문의 이메일 복사
            </SecondaryButton>
          </Actions>

          {copyMessage && <Notice role="status">{copyMessage}</Notice>}

          <Notice>
            메일 앱이 자동으로 열리지 않는 경우{" "}
            <strong>{CONTACT_EMAIL}</strong>로 직접 메일을 보내고 제목을
            “한국골드마켓 계정 및 데이터 삭제 요청”으로 작성해 주세요.
          </Notice>

          <Notice>
            계정 삭제 요청을 위해 주민등록번호, 신분증 사본, 계좌 비밀번호 등
            불필요한 민감정보를 보내지 마세요. 본인 확인에는 원칙적으로 가입
            이메일 등 필요한 최소 정보만 사용합니다.
          </Notice>
        </Section>

        <Section>
          <h2>3. 삭제되는 정보</h2>
          <ul>
            <li>Firebase Authentication 회원 계정</li>
            <li>이름, 닉네임, 이메일, 휴대전화번호 등 회원 프로필 정보</li>
            <li>FCM 푸시 토큰 및 계정에 연결된 기기·알림 정보</li>
            <li>프로필 이미지 등 계정에 연결된 파일</li>
            <li>진행 중인 방문예약 및 계정에 연결된 예약 정보</li>
            <li>
              그 밖에 계정 식별자와 직접 연결되어 더 이상 보관할 필요가 없는
              서비스 데이터
            </li>
          </ul>
        </Section>

        <Section>
          <h2>4. 일부 기록이 바로 삭제되지 않을 수 있는 경우</h2>
          <p>
            관계 법령상 보존 의무, 보안·부정이용 방지 또는 분쟁 대응 등
            정당한 사유가 있는 경우 필요한 최소 범위의 기록은 해당 목적에
            필요한 기간 동안 별도로 보관한 뒤 삭제합니다.
          </p>
          <p>
            가능한 경우 성명, 휴대전화번호, 이메일, 회원 식별자 등 직접
            식별정보를 제거하거나 비식별 처리합니다.
          </p>
        </Section>

        <Section>
          <h2>5. 처리 절차</h2>
          <ol>
            <li>삭제 요청 접수</li>
            <li>가입 이메일 등 필요한 범위에서 본인 확인</li>
            <li>계정 및 관련 개인정보 삭제 처리</li>
            <li>필요한 경우 처리 결과 안내</li>
          </ol>
          <p>
            본인 확인이 완료되면 특별한 사정이 없는 한 지체 없이 삭제 절차를
            진행합니다.
          </p>
        </Section>

        <Section>
          <h2>개인정보처리방침</h2>
          <p>
            삭제 범위와 보유 기준에 관한 자세한 내용은{" "}
            <TextLink to="/privacy">개인정보처리방침</TextLink>에서 확인할 수
            있습니다.
          </p>
        </Section>

        <Footer>
          문의: {CONTACT_EMAIL} · {APP_NAME} / {OPERATOR}
        </Footer>
      </Card>
    </Wrap>
  );
}
