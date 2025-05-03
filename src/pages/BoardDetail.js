// src/pages/BoardDetail.js
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { fetchPostById, deletePost } from "../services/boardService";
import { useParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuthContext } from "../context/AuthContext";

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: auto;
`;
const Header = styled.h1`
  margin-bottom: 8px;
`;
const Meta = styled.div`
  color: #666;
  margin-bottom: 20px;
`;
const Content = styled.div`
  white-space: pre-wrap;
  line-height: 1.6;
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
    variant === "delete" ? "#e74c3c" : "#007bff"};
  color: #fff;
  cursor: pointer;
`;

export default function BoardDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [post, setPost] = useState(null);

  useEffect(() => {
    fetchPostById(postId)
      .then(setPost)
      .catch((err) => {
        console.error("글 불러오기 오류:", err);
        alert("글을 불러오는 중 오류가 발생했습니다.");
        navigate("/board");
      });
  }, [postId, navigate]);

  if (!post) return <Container>로딩 중...</Container>;

  const isAuthor = post.authorId === user.uid;
  const handleDelete = async () => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      try {
        await deletePost(postId);
        navigate("/board");
      } catch (err) {
        console.error("삭제 오류:", err);
        alert("삭제에 실패했습니다.");
      }
    }
  };

  return (
    <Container>
      <Header>{post.title}</Header>
      <Meta>
        {post.category === "notice" ? "공지" : "문의"} ·{" "}
        {formatDistanceToNow(post.createdAt.toDate(), {
          addSuffix: true,
          locale: ko,
        })}
      </Meta>
      <Content>{post.content}</Content>
      <ButtonGroup>
        <Button onClick={() => navigate("/board")}>목록</Button>
        {isAuthor && (
          <>
            <Button onClick={() => navigate(`/board/${postId}/edit`)}>
              수정
            </Button>
            <Button variant="delete" onClick={handleDelete}>
              삭제
            </Button>
          </>
        )}
      </ButtonGroup>
    </Container>
  );
}
