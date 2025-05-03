// src/pages/EditBoardPost.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPostById, updatePost } from "../services/boardService";
import { useAuthContext } from "../context/AuthContext";

const Container = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: auto;
`;
const Header = styled.h1`
  text-align: center;
  margin-bottom: 20px;
`;
const Label = styled.label`
  display: block;
  margin: 12px 0 4px;
  font-weight: bold;
`;
const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;
const TextArea = styled.textarea`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
`;
const Select = styled.select`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;
const ButtonGroup = styled.div`
  margin-top: 24px;
  display: flex;
  gap: 8px;
`;
const Button = styled.button`
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: ${({ variant }) =>
    variant === "cancel"
      ? "#95a5a6"
      : variant === "delete"
      ? "#e74c3c"
      : "#007bff"};
  color: #fff;
  cursor: pointer;
`;
const ErrorText = styled.p`
  color: red;
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
  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Fetch existing post
  useEffect(() => {
    if (!user) return;
    fetchPostById(postId)
      .then((post) => {
        // Only author or admin can edit
        if (post.authorId !== user.uid && !isAdmin) {
          alert("수정 권한이 없습니다.");
          navigate(`/board/${postId}`);
          return;
        }
        // Prevent non-admin editing a notice
        if (post.category === "notice" && !isAdmin) {
          alert("공지사항은 관리자만 수정할 수 있습니다.");
          navigate(`/board/${postId}`);
          return;
        }
        setTitle(post.title);
        setContent(post.content);
        setCategory(post.category);
      })
      .catch((err) => {
        console.error("글 불러오기 오류:", err);
        alert("글을 불러오는 중 오류가 발생했습니다.");
        navigate("/board");
      })
      .finally(() => setLoadingPost(false));
  }, [postId, user, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }
    // Non-admin cannot change category to notice
    if (category === "notice" && !isAdmin) {
      setError("공지사항은 관리자만 설정할 수 있습니다.");
      return;
    }
    try {
      await updatePost(postId, { title, content, category });
      navigate(`/board/${postId}`);
    } catch (err) {
      console.error("수정 오류:", err);
      setError("수정에 실패했습니다. 다시 시도해주세요.");
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
            variant="cancel"
            onClick={() => navigate(`/board/${postId}`)}
          >
            취소
          </Button>
        </ButtonGroup>
      </form>
    </Container>
  );
}
