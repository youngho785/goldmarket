// src/components/BoardTabs.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { fetchNotices, fetchInquiries } from "../services/boardService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const TabsContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h1`
  margin: 0;
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors?.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors?.secondary || "#0056b3"};
  }
`;

const TabButtons = styled.div`
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 16px;
`;

const TabButton = styled.button`
  flex: 1;
  padding: 12px;
  background: ${({ $active }) => ($active ? "#fff" : "#f7f7f7")};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  border-bottom: ${({ $active, theme }) =>
    $active ? `3px solid ${theme.colors.primary}` : "none"};
  border-bottom-left-radius: ${({ $active }) => ($active ? "4px" : "0")};
  border-bottom-right-radius: ${({ $active }) => ($active ? "4px" : "0")};
  font-weight: ${({ $active }) => ($active ? "bold" : "normal")};
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #fff;
  }
`;

const PostList = styled.div`
  margin-top: 16px;
`;

const PostItem = styled.div`
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  &:hover {
    background: #fafafa;
  }
`;

const PostTitle = styled.h3`
  margin: 0;
`;

const Meta = styled.div`
  font-size: 0.85em;
  color: #666;
  margin-top: 4px;
`;

export default function BoardTabs() {
  const [activeTab, setActiveTab] = useState("notice"); // "notice" or "inquiry"
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFn = activeTab === "notice" ? fetchNotices : fetchInquiries;
    fetchFn()
      .then(setPosts)
      .catch((err) => {
        console.error("게시글 불러오기 오류:", err);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
      });
  }, [activeTab]);

  return (
    <TabsContainer>
      <Header>
        <Title>게시판</Title>
        <ButtonsRow>
          <Button onClick={() => navigate("/board/new")}>글 작성</Button>
          {/* ✅ 내 문의 바로가기 */}
          <Button onClick={() => navigate("/board/mine/inquiries")}>내 문의</Button>
        </ButtonsRow>
      </Header>

      <TabButtons>
        <TabButton
          $active={activeTab === "notice"}
          onClick={() => setActiveTab("notice")}
        >
          공지사항
        </TabButton>
        <TabButton
          $active={activeTab === "inquiry"}
          onClick={() => setActiveTab("inquiry")}
        >
          문의
        </TabButton>
      </TabButtons>

      <PostList>
        {posts.map((post) => (
          <PostItem
            key={post.id}
            onClick={() => navigate(`/board/${post.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/board/${post.id}`);
              }
            }}
          >
            <PostTitle>{post.title}</PostTitle>
            <Meta>
              {formatDistanceToNow(
                post.createdAt?.toDate ? post.createdAt.toDate() : new Date(),
                { addSuffix: true }
              )}
            </Meta>
          </PostItem>
        ))}
      </PostList>
    </TabsContainer>
  );
}
