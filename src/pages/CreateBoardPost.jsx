// src/pages/CreateBoardPost.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { createPost } from "../services/boardService";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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
const Button = styled.button`
  margin-top: 16px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;
const ErrorText = styled.p`
  color: red;
  margin-top: 8px;
  text-align: center;
`;

export default function CreateBoardPost() {
  const { user, loading, isAdmin } = useAuthContext();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // 일반 사용자는 항상 'inquiry'
  const [category, setCategory] = useState("inquiry");
  const [error, setError] = useState("");

  // 인증 상태 확인
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // 관리자면 기본 카테고리 'notice'로 초기화
  useEffect(() => {
    if (isAdmin) {
      setCategory("notice");
    }
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      const ref = await createPost({
        title,
        content,
        category,
        authorId: user.uid,
      });
      navigate(`/board/${ref.id}`);
    } catch (err) {
      console.error("글 작성 오류:", err);
      setError("게시글 등록에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (loading) return <Container>로딩 중...</Container>;

  return (
    <Container>
      <Header>글 작성</Header>
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
          placeholder="제목을 입력하세요"
          required
        />

        <Label>내용</Label>
        <TextArea
          rows={8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          required
        />

        <Button type="submit">등록</Button>
        {error && <ErrorText>{error}</ErrorText>}
      </form>
    </Container>
  );
}
