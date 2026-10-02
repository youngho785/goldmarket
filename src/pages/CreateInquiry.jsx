import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { createPost } from "../services/supportService";

const Card = styled.section`
  max-width: 680px;
  margin: 8px auto 28px;
  padding: clamp(20px, 3vw, 30px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};

  > h1 {
    margin: 0 0 10px;
    font-size: clamp(1.45rem, 3vw, 2rem);
    line-height: 1.3;
  }

  > p {
    margin: 0 0 16px;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.6;
  }

  @media (max-width: 560px) {
    padding: 18px 16px;
  }
`;
const Form = styled.form`display: grid; gap: 14px;`;
const Field = styled.label`
  display: grid;
  gap: 7px;
  font-weight: 750;

  textarea {
    min-height: 112px;
    resize: vertical;
  }
`;
const Error = styled.p`
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;
const Context = styled.div`
  margin: 14px 0 18px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 12px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .9rem;
  line-height: 1.55;

  strong { color: ${({ theme }) => theme.colors.primary}; }
`;

export default function CreateInquiry() {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const relatedGroupId = useMemo(() => {
    const value = new URLSearchParams(location.search).get("groupId");
    return String(value || "").trim().slice(0, 120);
  }, [location.search]);

  const [title, setTitle] = useState(() => relatedGroupId ? "GOLD TO GOLD 예약·교환 문의" : "");
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
        relatedGroupId,
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
      {relatedGroupId && (
        <Context role="note">
          <strong>이 교환건과 자동으로 연결됩니다.</strong><br />
          교환번호 {relatedGroupId}<br />
          예약 내용을 다시 설명하지 않아도 관리자가 연결된 건을 확인할 수 있습니다.
        </Context>
      )}
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
            rows={5}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            required
            placeholder={relatedGroupId ? "연결된 예약·교환건에서 궁금한 내용을 적어 주세요." : undefined}
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
