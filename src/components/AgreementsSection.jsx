// src/components/AgreementsSection.jsx
import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { FiExternalLink } from "react-icons/fi";

const Box = styled.div`
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 8px; background: ${({ theme }) => theme.colors.surfaceAlt};
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr auto;
  column-gap: 10px; align-items: start;
`;
const Checkbox = styled.input.attrs({ type: "checkbox" })`
  width: 18px; height: 18px; margin-top: 2px;
`;
const Text = styled.label`
  font-size: 0.95rem; color: ${({ theme }) => theme.colors.text}; line-height: 1.5; cursor: pointer;
`;
const Detail = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;
  line-height: 1.5;
`;
const Badge = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.78rem; line-height: 1;
  padding: 4px 6px; border-radius: 9999px;
  background: ${({ theme }) => theme.semantic.badgeInfoBg}; color: ${({ theme }) => theme.semantic.badgeInfoText}; border: 1px solid ${({ theme }) => theme.colors.border};
  margin-right: 6px;
`;
const IconBtn = styled(Link)`
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface}; color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  outline-offset: 2px;
  &:hover { background: ${({ theme }) => theme.colors.goldLight}; border-style: solid; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.focus.outline}; }
`;
const Placeholder = styled.span`
  width: 36px; height: 36px; display:inline-block;
`;

export function AgreementsSection({ value = {}, onChange, onOpen }) {
  const { age14 = false, tos = false, privacy = false, marketing = false } = value;

  return (
    <Box role="group" aria-label="약관 동의">
      <Row>
        <Checkbox
          id="agree_age14"
          checked={!!age14}
          onChange={(e) => onChange?.({ ...value, age14: e.target.checked })}
        />
        <Text htmlFor="agree_age14">
          <Badge>필수</Badge>
          만 14세 이상(또는 법정대리인 동의)임을 확인합니다.
        </Text>
        <Placeholder aria-hidden />
      </Row>

      <Row>
        <Checkbox
          id="agree_tos"
          checked={!!tos}
          onChange={(e) => onChange?.({ ...value, tos: e.target.checked })}
        />
        <Text htmlFor="agree_tos">
          <Badge>필수</Badge>
          서비스 이용약관에 동의합니다.
        </Text>
        <IconBtn
          to="/terms"
          aria-label="이용약관 열기"
          title="이용약관 열기"
          onClick={() => onOpen?.("terms")}
        >
          <FiExternalLink aria-hidden />
        </IconBtn>
      </Row>

      <Row>
        <Checkbox
          id="agree_privacy"
          checked={!!privacy}
          onChange={(e) => onChange?.({ ...value, privacy: e.target.checked })}
        />
        <Text htmlFor="agree_privacy">
          <Badge>필수</Badge>
          개인정보 수집·이용에 동의합니다.
        </Text>
        <IconBtn
          to="/privacy"
          aria-label="개인정보처리방침 열기"
          title="개인정보처리방침 열기"
          onClick={() => onOpen?.("privacy")}
        >
          <FiExternalLink aria-hidden />
        </IconBtn>
      </Row>

      <Row>
        <Checkbox
          id="agree_marketing"
          checked={!!marketing}
          onChange={(e) => onChange?.({ ...value, marketing: e.target.checked })}
        />
        <Text htmlFor="agree_marketing">
          <Badge style={{ opacity: .85 }}>선택</Badge>
          금시세·혜택 알림 받기
          <Detail>
            금시세 업데이트, 주요 소식, 이벤트·혜택 등을 이메일/푸시로 받아봅니다.
            <br />광고성 정보 수신동의(선택)
          </Detail>
        </Text>
        <IconBtn
          to="/privacy#marketing"
          aria-label="광고성 정보 수신동의 안내 보기"
          title="광고성 정보 수신동의 안내 보기"
          onClick={() => onOpen?.("marketing")}
        >
          <FiExternalLink aria-hidden />
        </IconBtn>
      </Row>
    </Box>
  );
}
