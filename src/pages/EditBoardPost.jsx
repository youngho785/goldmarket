// src/pages/EditBoardPost.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPostById, updatePost } from "../services/boardService";
import { useAuthContext } from "../context/AuthContext";

const Container = styled.div`
  padding: clamp(22px, 4vw, 34px);
  max-width: 680px;
  margin: 8px auto 28px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;
const Header = styled.h1`
  margin-bottom: 24px;
`;
const Label = styled.label`
  display: block;
  margin: 16px 0 7px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text};
`;
const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
`;
const TextArea = styled.textarea`
  width: 100%;
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  resize: vertical;
`;
const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
`;
const ButtonGroup = styled.div`
  margin-top: 24px;
  display: flex;
  gap: 8px;
`;

/* NOTE: DOM으로 흘러가지 않도록 transient prop `$variant` 사용 */
const Button = styled.button`
  min-height: 44px;
  padding: 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ $variant, theme }) =>
    $variant === "cancel"
      ? theme.colors.surfaceAlt
      : $variant === "delete"
      ? theme.colors.error
      : theme.gradients.primary};
  color: ${({ $variant, theme }) => ($variant === "cancel" ? theme.colors.text : theme.on.primary)};
  font-weight: 750;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme.semantic.alertErrorText};
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  padding: 10px 12px;
  border-radius: 10px;
  margin-top: 12px;
  text-align: center;
`;

export default function EditBoardPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuthContext();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("inquiry");

  // 규칙 충족을 위해 기존 작성자/상태 값 유지
  const [authorId, setAuthorId] = useState("");
  const [authorNickname, setAuthorNickname] = useState("");
  const [status, setStatus] = useState(undefined);

  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState("");

  // 로그인 체크
  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  // 기존 글 불러오기
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const post = await fetchPostById(postId);

        // 권한 확인
        if (post.authorId !== user.uid && !isAdmin) {
          alert("수정 권한이 없습니다.");
          navigate(`/board/${postId}`);
          return;
        }
        // 공지는 관리자만 수정
        if (post.category === "notice" && !isAdmin) {
          alert("공지사항은 관리자만 수정할 수 있습니다.");
          navigate(`/board/${postId}`);
          return;
        }

        setTitle(post.title || "");
        setContent(post.content || "");
        setCategory(post.category || "inquiry");
        setAuthorId(post.authorId || "");
        setAuthorNickname(post.authorNickname || "");
        setStatus(post.status); // undefined면 그대로 둠
      } catch (err) {
        console.error("글 불러오기 오류:", err);
        alert("글을 불러오는 중 오류가 발생했습니다.");
        navigate("/board");
      } finally {
        setLoadingPost(false);
      }
    })();
  }, [postId, user, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }
    // 비관리자는 notice 금지
    if (category === "notice" && !isAdmin) {
      setError("공지사항은 관리자만 설정할 수 있습니다.");
      return;
    }

    try {
      // 🔒 Firestore 규칙 충족을 위해 작성자/상태/카테고리 고정 포함
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,                 // inquiry 유지
        authorId,                 // 변경 불가, 그대로 포함
        authorNickname,           // 변경 불가, 그대로 포함
      };
      if (typeof status !== "undefined") payload.status = status; // answered로 변경하지 않음

      await updatePost(postId, payload);
      navigate(`/board/${postId}`);
    } catch (err) {
      console.error("수정 오류:", err);
      setError(
        err?.code === "permission-denied"
          ? "권한이 없습니다. (문의글만 작성자가 수정 가능하며, 답변 관련 필드는 수정할 수 없습니다.)"
          : "수정에 실패했습니다. 다시 시도해주세요."
      );
    }
  };

  if (loading || loadingPost) return <Container>로딩 중...</Container>;

  return (
    <Container>
      <Header>게시글 수정</Header>
      <form onSubmit={handleSubmit}>
        <Label>구분</Label>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={!isAdmin} // 비관리자는 카테고리 변경 제한
        >
          {isAdmin && <option value="notice">공지</option>}
          <option value="inquiry">문의</option>
        </Select>

        <Label>제목</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Label>내용</Label>
        <TextArea
          rows={8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {error && <ErrorText>{error}</ErrorText>}

        <ButtonGroup>
          <Button type="submit">저장</Button>
          <Button
            type="button"
            $variant="cancel"
            onClick={() => navigate(`/board/${postId}`)}
          >
            취소
          </Button>
        </ButtonGroup>
      </form>
    </Container>
  );
}
