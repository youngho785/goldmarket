import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  padding: clamp(20px, 3vw, 30px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};

  > h1 {
    margin: 0 0 10px;
    font-size: clamp(1.5rem, 3vw, 2.15rem);
    line-height: 1.3;
    word-break: keep-all;
  }

  @media (max-width: 560px) {
    padding: 18px 16px;
  }
`;
const Meta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
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
const Content = styled.div`
  white-space: pre-wrap;
  line-height: 1.7;
  overflow-wrap: anywhere;
`;
const RelatedExchange = styled.div`
  margin: 0 0 20px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 12px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .9rem;
  strong { color: ${({ theme }) => theme.colors.primary}; }
`;
const Answer = styled.section`
  margin-top: 22px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  h2 {
    margin: 0 0 10px;
    font-size: 1.25rem;
    line-height: 1.35;
  }

  > p {
    margin: 0 0 10px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  textarea {
    width: 100%;
    min-height: 112px;
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: 10px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    resize: vertical;
  }
`;
const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 24px;

  button {
    min-height: 40px;
    padding: 8px 12px;
  }
`;
const AnswerActions = styled(Actions)`
  margin-top: 12px;
`;

const ErrorNotice = styled.p`
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;

function relativeTime(value) {
  const date = value?.toDate ? value.toDate() : new Date();
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
}

export default function InquiryDetail() {
  const { postId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();
  const [inquiry, setInquiry] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [actionError, setActionError] = useState("");

  const adminContext = Boolean(isAdmin && location.pathname.startsWith("/admin/"));
  const listPath = adminContext ? "/admin/support" : "/support";

  const load = async () => {
    const value = await fetchPostById(postId);
    setInquiry(value);
    setAnswerText(value.answer || "");
  };

  useEffect(() => {
    setActionError("");
    load().catch(() => navigate(listPath, { replace: true }));
    // load only depends on the current post id and list context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, listPath]);

  if (!inquiry) return <Card>문의를 불러오고 있습니다.</Card>;
  const isAuthor = inquiry.authorId === user?.uid;
  const answered = inquiry.status === "answered";

  const remove = async () => {
    if (!window.confirm("이 문의를 삭제하시겠습니까?")) return;
    setSaving(true);
    setActionError("");
    try {
      await deletePost(postId);
      navigate(listPath);
    } catch (error) {
      setActionError(error?.message || "문의를 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const saveAnswer = async () => {
    if (!answerText.trim() || saving) return;
    setSaving(true);
    setActionError("");
    try {
      await answerInquiry(postId, {
        text: answerText,
        adminId: user.uid,
        adminNickname: user.displayName || "관리자",
      });
      await load();
      setEditingAnswer(false);
    } catch (error) {
      setActionError(error?.message || "답변을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeAnswer = async () => {
    if (!window.confirm("관리자 답변을 삭제하시겠습니까?")) return;
    setSaving(true);
    setActionError("");
    try {
      await clearAnswer(postId);
      await load();
      setEditingAnswer(false);
    } catch (error) {
      setActionError(error?.message || "답변을 삭제하지 못했습니다.");
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
      {inquiry.relatedGroupId && (
        <RelatedExchange>
          <strong>연결된 GOLD TO GOLD 교환건</strong><br />
          {inquiry.relatedGroupId}
        </RelatedExchange>
      )}
      <Content>{inquiry.content}</Content>

      <Answer>
        <h2>관리자 답변</h2>
        {answered && inquiry.answer && !(isAdmin && editingAnswer) ? (
          <Content>{inquiry.answer}</Content>
        ) : !answered ? (
          <p>아직 답변이 등록되지 않았습니다.</p>
        ) : null}

        {isAdmin && !answered && (
          <>
            <textarea
              rows={4}
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="고객에게 전달할 답변"
              aria-label="관리자 답변"
              disabled={saving}
            />
            <AnswerActions>
              <button
                type="button"
                onClick={saveAnswer}
                disabled={saving || !answerText.trim()}
              >
                {saving ? "저장 중…" : "답변 등록"}
              </button>
            </AnswerActions>
          </>
        )}

        {isAdmin && answered && !editingAnswer && (
          <AnswerActions>
            <button
              type="button"
              onClick={() => {
                setAnswerText(inquiry.answer || "");
                setEditingAnswer(true);
                setActionError("");
              }}
              disabled={saving}
            >
              답변 수정
            </button>
            <button type="button" onClick={removeAnswer} disabled={saving}>
              답변 삭제
            </button>
          </AnswerActions>
        )}

        {isAdmin && answered && editingAnswer && (
          <>
            <textarea
              rows={4}
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="고객에게 전달할 답변"
              aria-label="관리자 답변 수정"
              disabled={saving}
            />
            <AnswerActions>
              <button
                type="button"
                onClick={saveAnswer}
                disabled={saving || !answerText.trim()}
              >
                {saving ? "저장 중…" : "수정 저장"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnswerText(inquiry.answer || "");
                  setEditingAnswer(false);
                  setActionError("");
                }}
                disabled={saving}
              >
                취소
              </button>
            </AnswerActions>
          </>
        )}

        {actionError && <ErrorNotice role="alert">{actionError}</ErrorNotice>}
      </Answer>

      <Actions>
        <button type="button" onClick={() => navigate(listPath)}>목록</button>
        {isAuthor && !answered && !adminContext && (
          <button
            type="button"
            onClick={() => navigate(`/support/${postId}/edit`)}
            disabled={saving}
          >
            수정
          </button>
        )}
        {(isAdmin || (isAuthor && !answered)) && (
          <button type="button" onClick={remove} disabled={saving}>삭제</button>
        )}
      </Actions>
    </Card>
  );
}
