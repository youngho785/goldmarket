import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { fetchPostById, updatePost } from "../services/supportService";

const Card = styled.section`
  max-width: 680px;
  margin: 8px auto 28px;
  padding: clamp(22px, 4vw, 34px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;
const Form = styled.form`display: grid; gap: 16px;`;
const Field = styled.label`display: grid; gap: 7px; font-weight: 750;`;
const Actions = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const Error = styled.p`
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;

export default function EditInquiry() {
  const { postId } = useParams();
  const { user, isAdmin, loading } = useAuthContext();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loadingInquiry, setLoadingInquiry] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchPostById(postId)
      .then((inquiry) => {
        if (inquiry.authorId !== user.uid && !isAdmin) {
          navigate(`/support/${postId}`, { replace: true });
          return;
        }
        setTitle(inquiry.title || "");
        setContent(inquiry.content || "");
      })
      .catch(() => navigate("/support", { replace: true }))
      .finally(() => setLoadingInquiry(false));
  }, [isAdmin, navigate, postId, user]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updatePost(postId, { title, content });
      navigate(`/support/${postId}`);
    } catch (err) {
      setError(
        err?.code === "permission-denied"
          ? "답변이 완료된 문의는 수정할 수 없습니다."
          : err?.message || "문의 수정에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingInquiry) return <Card>문의를 불러오고 있습니다.</Card>;

  return (
    <Card>
      <h1>금교환 문의 수정</h1>
      <Form onSubmit={submit}>
        <Field>
          제목
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
          />
        </Field>
        <Field>
          문의 내용
          <textarea
            rows={8}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            required
          />
        </Field>
        {error && <Error role="alert">{error}</Error>}
        <Actions>
          <button type="submit" disabled={saving}>
            {saving ? "저장 중..." : "수정 저장"}
          </button>
          <button type="button" onClick={() => navigate(`/support/${postId}`)}>
            취소
          </button>
        </Actions>
      </Form>
    </Card>
  );
}
