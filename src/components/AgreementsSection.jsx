// src/components/AgreementsSection.jsx
import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { FiExternalLink } from "react-icons/fi";

const Box = styled.div`
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px; border: 1px solid #eee; border-radius: 8px; background:#fafafa;
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr auto;  /* 체크박스 / 텍스트 / 아이콘버튼 */
  column-gap: 10px; align-items: start;
`;
const Checkbox = styled.input.attrs({ type: "checkbox" })`
  width: 18px; height: 18px; margin-top: 2px;
`;
const Text = styled.label`
  font-size: 0.95rem; color:#1f2937; line-height: 1.5; cursor: pointer;
`;
const Badge = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.78rem; line-height: 1;
  padding: 4px 6px; border-radius: 9999px;
  background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb;
  margin-right: 6px;
`;
const IconBtn = styled(Link)`
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  background: #fff; color: #374151;
  text-decoration: none;
  outline-offset: 2px;
  &:hover { background:#f9fafb; border-style: solid; }
  &:focus-visible { outline: 2px solid #3b82f6; }
`;
const Placeholder = styled.span`
  width: 36px; height: 36px; display:inline-block;
`;

export function AgreementsSection({ value = {}, onChange, onOpen }) {
  // age14가 없을 때도 안전하게 false로 처리
  const { age14 = false, tos = false, privacy = false, marketing = false } = value;

  return (
    <Box role="group" aria-label="약관 동의">
      {/* 만 14세 이상 확인 */}
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
        {/* 아이콘 버튼 없음 — 그리드 정렬 유지용 자리 표시 */}
        <Placeholder aria-hidden />
      </Row>

      {/* 이용약관 */}
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

      {/* 개인정보 수집·이용 */}
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

      {/* 마케팅 수신(선택) */}
      <Row>
        <Checkbox
          id="agree_marketing"
          checked={!!marketing}
          onChange={(e) => onChange?.({ ...value, marketing: e.target.checked })}
        />
        <Text htmlFor="agree_marketing">
          <Badge style={{ opacity: .85 }}>선택</Badge>
          이메일/푸시 등 마케팅 정보 수신에 동의합니다.
        </Text>
        <IconBtn
          to="/privacy#6"
          aria-label="마케팅 안내 항목 보기"
          title="마케팅 안내 보기"
          onClick={() => onOpen?.("marketing")}
        >
          <FiExternalLink aria-hidden />
        </IconBtn>
      </Row>
    </Box>
  );
}
