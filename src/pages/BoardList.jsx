// src/pages/BoardList.jsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { fetchPosts } from "../services/boardService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: auto;
`;
const Header = styled.h1`
  text-align: center;
  margin-bottom: 20px;
`;
const ButtonsRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;
const NewButton = styled.button`
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors?.primary || "#007bff"};
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
  display: flex;
  align-items: center;
  gap: 6px;
`;
const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 999px;
  background: ${({ $type }) => ($type === "done" ? "#e6f4ea" : "#fff8e1")};
  color: ${({ $type }) => ($type === "done" ? "#137333" : "#8a6d3b")};
  border: 1px solid ${({ $type }) => ($type === "done" ? "#c6e7cc" : "#f3e2b3")};
`;

// 이메일 간단 마스킹 (abcd****@domain)
const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  const [id, domain] = email.split("@");
  if (!id || !domain) return email;
  const head = id.slice(0, Math.min(4, id.length));
  return `${head}${"*".repeat(Math.max(0, id.length - head.length))}@${domain}`;
};

export default function BoardList() {
  const [posts, setPosts] = useState([]);
  const [current, setCurrent] = useState(() => auth.currentUser);
  const navigate = useNavigate();

  // 로그인 상태 변동 시에도 작성자 폴백이 즉시 반영되도록 구독
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrent(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .catch((err) => {
        console.error("게시글 불러오기 오류:", err);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
      });
  }, []);

  const renderAuthor = (post) => {
    if (post.authorNickname && post.authorNickname.trim()) return post.authorNickname;
    const isMine = current && post.authorId === current.uid;
    if (isMine) return current.displayName || maskEmail(current.email) || "익명";
    return "익명";
  };

  return (
    <Container>
      <Header>게시판</Header>

      <ButtonsRow>
        <NewButton onClick={() => navigate("/board/new")}>글 작성</NewButton>
        <NewButton onClick={() => navigate("/board/mine/inquiries")}>내 문의</NewButton>
      </ButtonsRow>

      {posts.map((post) => (
        <PostItem
          key={post.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/board/${post.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/board/${post.id}`);
            }
          }}
        >
          <Title>{post.title}</Title>
          <Meta>
            <span>{post.category === "notice" ? "공지" : "문의"}</span>
            {post.category === "inquiry" && (
              <Badge $type={post.status === "answered" ? "done" : "wait"}>
                {post.status === "answered" ? "답변완료" : "답변대기"}
              </Badge>
            )}
            <span>· {renderAuthor(post)}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(
                post.createdAt?.toDate ? post.createdAt.toDate() : new Date(),
                { addSuffix: true, locale: ko }
              )}
            </span>
          </Meta>
        </PostItem>
      ))}
    </Container>
  );
}
