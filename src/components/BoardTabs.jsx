// src/components/BoardTabs.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { fetchNotices, fetchInquiries } from "../services/boardService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const TabsContainer = styled.div`
  padding: 8px 0 28px;
  max-width: 900px;
  margin: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  gap: 14px;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  position: relative;
  padding-bottom: 13px;
  &::after { content: ""; position: absolute; left: 0; bottom: 0; width: 48px; height: 3px; border-radius: 999px; background: ${({ theme }) => theme.gradients.gold}; }
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  min-height: 44px;
  padding: 9px 15px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.small};
  font-weight: 750;
  cursor: pointer;
  &:hover {
    filter: brightness(.96);
  }
`;

const TabButtons = styled.div`
  display: flex;
  gap: 6px;
  padding: 5px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  margin-bottom: 18px;
`;

const TabButton = styled.button`
  flex: 1;
  min-height: 44px;
  padding: 10px 12px;
  background: ${({ $active, theme }) => ($active ? theme.colors.surface : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.border : "transparent")};
  border-radius: 10px;
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.xs : "none")};
  font-weight: ${({ $active }) => ($active ? "800" : "650")};
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const PostList = styled.div`
  margin-top: 16px;
`;

const PostItem = styled.div`
  padding: 16px 18px;
  margin-bottom: 10px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.hover};
  }
`;

const PostTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const Meta = styled.div`
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.textSecondary};
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
