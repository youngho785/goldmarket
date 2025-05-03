// src/components/BoardTabs.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { fetchNotices, fetchInquiries } from "../services/boardService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

// 탭 컨테이너
const TabsContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: auto;
`;

// 헤더 (타이틀 + 버튼)
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h1`
  margin: 0;
`;

// 글 작성 버튼
const NewButton = styled.button`
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.secondary || "#0056b3"};
  }
`;

// 탭 버튼 스타일
const TabButtons = styled.div`
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 16px;
`;

const TabButton = styled.button`
  flex: 1;
  padding: 12px;
  background: ${({ active }) => (active ? "#fff" : "#f7f7f7")};
  border: none;
  border-bottom: ${({ active }) => (active ? "3px solid #007bff" : "none")};
  font-weight: ${({ active }) => (active ? "bold" : "normal")};
  cursor: pointer;
`;

// 게시글 리스트
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
        <NewButton onClick={() => navigate("/board/new")}>
          글 작성
        </NewButton>
      </Header>

      <TabButtons>
        <TabButton
          active={activeTab === "notice"}
          onClick={() => setActiveTab("notice")}
        >
          공지사항
        </TabButton>
        <TabButton
          active={activeTab === "inquiry"}
          onClick={() => setActiveTab("inquiry")}
        >
          문의
        </TabButton>
      </TabButtons>

      <PostList>
        {posts.map((post) => (
          <PostItem key={post.id} onClick={() => navigate(`/board/${post.id}`)}>
            <PostTitle>{post.title}</PostTitle>
            <Meta>
              {formatDistanceToNow(post.createdAt.toDate(), {
                addSuffix: true,
              })}
            </Meta>
          </PostItem>
        ))}
      </PostList>
    </TabsContainer>
  );
}
