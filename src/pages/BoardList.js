// src/pages/BoardList.js
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { fetchPosts } from "../services/boardService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: auto;
`;
const Header = styled.h1`
  text-align: center;
  margin-bottom: 20px;
`;
const NewButton = styled.button`
  margin-bottom: 16px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;
const PostItem = styled.div`
  padding: 16px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  &:hover {
    background: #fafafa;
  }
`;
const Title = styled.h2`
  font-size: 1.2em;
  margin: 0;
`;
const Meta = styled.div`
  font-size: 0.85em;
  color: #666;
  margin-top: 4px;
`;

export default function BoardList() {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .catch((err) => {
        console.error("게시글 불러오기 오류:", err);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
      });
  }, []);

  return (
    <Container>
      <Header>게시판</Header>
      <NewButton onClick={() => navigate("/board/new")}>글 작성</NewButton>
      {posts.map((post) => (
        <PostItem key={post.id} onClick={() => navigate(`/board/${post.id}`)}>
          <Title>{post.title}</Title>
          <Meta>
            {post.category === "notice" ? "공지" : "문의"} ·{" "}
            {formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })}
          </Meta>
        </PostItem>
      ))}
    </Container>
  );
}
