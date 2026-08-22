import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  answerInquiry,
  clearAnswer,
  deletePost,
  fetchPostById,
} from "../services/supportService";

const Card = styled.article`
  max-width: 800px;
  margin: 8px auto 28px;
  padding: clamp(22px, 4vw, 34px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;
const Meta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 22px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;
const Badge = styled.span`
  padding: 2px 8px;
  border-radius: 99px;
  background: ${({ $answered, theme }) =>
    $answered ? theme.semantic.alertSuccessBg : theme.semantic.alertWarningBg};
  color: ${({ $answered, theme }) =>
    $answered ? theme.semantic.alertSuccessText : theme.semantic.alertWarningText};
`;
const Content = styled.div`white-space: pre-wrap; line-height: 1.75;`;
const Answer = styled.section`
  margin-top: 28px;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;
const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 24px;
`;

function relativeTime(value) {
  const date = value?.toDate ? value.toDate() : new Date();
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
}

export default function InquiryDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();
  const [inquiry, setInquiry] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const value = await fetchPostById(postId);
    setInquiry(value);
    setAnswerText(value.answer || "");
  };

  useEffect(() => {
    load().catch(() => navigate("/support", { replace: true }));
    // load는 현재 postId만 사용하므로 postId 변경 시 다시 조회합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (!inquiry) return <Card>문의를 불러오고 있습니다.</Card>;
  const isAuthor = inquiry.authorId === user?.uid;
  const answered = inquiry.status === "answered";

  const remove = async () => {
    if (!window.confirm("이 문의를 삭제하시겠습니까?")) return;
    await deletePost(postId);
    navigate("/support");
  };

  const saveAnswer = async () => {
    if (!answerText.trim()) return;
    setSaving(true);
    try {
      await answerInquiry(postId, {
        text: answerText,
        adminId: user.uid,
        adminNickname: user.displayName || "관리자",
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeAnswer = async () => {
    if (!window.confirm("관리자 답변을 삭제하시겠습니까?")) return;
    setSaving(true);
    try {
      await clearAnswer(postId);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h1>{inquiry.title}</h1>
      <Meta>
        <span>{inquiry.authorNickname || "고객"}</span>
        <span>·</span>
        <span>{relativeTime(inquiry.createdAt)}</span>
        <Badge $answered={answered}>
          {answered ? "답변완료" : "답변대기"}
        </Badge>
      </Meta>
      <Content>{inquiry.content}</Content>

      <Answer>
        <h2>관리자 답변</h2>
        {answered && inquiry.answer ? (
          <Content>{inquiry.answer}</Content>
        ) : (
          <p>아직 답변이 등록되지 않았습니다.</p>
        )}
        {isAdmin && (
          <>
            <textarea
              rows={5}
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="고객에게 전달할 답변"
            />
            <Actions>
              <button type="button" onClick={saveAnswer} disabled={saving}>
                {answered ? "답변 수정" : "답변 등록"}
              </button>
              {answered && (
                <button type="button" onClick={removeAnswer} disabled={saving}>
                  답변 삭제
                </button>
              )}
            </Actions>
          </>
        )}
      </Answer>

      <Actions>
        <button type="button" onClick={() => navigate("/support")}>목록</button>
        {isAuthor && !answered && (
          <button
            type="button"
            onClick={() => navigate(`/support/${postId}/edit`)}
          >
            수정
          </button>
        )}
        {(isAdmin || (isAuthor && !answered)) && (
          <button type="button" onClick={remove}>삭제</button>
        )}
      </Actions>
    </Card>
  );
}
