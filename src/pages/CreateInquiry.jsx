import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { createPost } from "../services/supportService";

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
const Error = styled.p`
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;

export default function CreateInquiry() {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, navigate, user]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const ref = await createPost({
        title,
        content,
        authorId: user.uid,
      });
      navigate(`/support/${ref.id}`);
    } catch (err) {
      setError(err?.message || "문의 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <Card>로그인 상태를 확인하고 있습니다.</Card>;

  return (
    <Card>
      <h1>금교환 문의 작성</h1>
      <p>예약·감정·보너스 사용 등 금교환 이용 중 궁금한 내용을 남겨 주세요.</p>
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
        <button type="submit" disabled={saving}>
          {saving ? "등록 중..." : "문의 등록"}
        </button>
      </Form>
    </Card>
  );
}
