// src/pages/BoardDetail.js
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { fetchPostById, deletePost, answerInquiry, clearAnswer } from "../services/boardService";
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
const AnswerCard = styled.div`
  margin-top: 24px;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fafafa;
`;
const Badge = styled.span`
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 999px;
  background: ${({ $type }) => ($type === "done" ? "#e6f4ea" : "#fff8e1")};
  color: ${({ $type }) => ($type === "done" ? "#137333" : "#8a6d3b")};
  border: 1px solid ${({ $type }) => ($type === "done" ? "#c6e7cc" : "#f3e2b3")};
`;
const Textarea = styled.textarea`
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ddd;
  resize: vertical;
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
  background: ${({ $variant }) => ($variant === "delete" ? "#e74c3c" : "#007bff")};
  color: #fff;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};
`;

export default function BoardDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();
  const [post, setPost] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPostById(postId)
      .then((p) => {
        setPost(p);
        if (p?.answer) setAnswerText(p.answer);
      })
      .catch((err) => {
        console.error("글 불러오기 오류:", err);
        alert("글을 불러오는 중 오류가 발생했습니다.");
        navigate("/board");
      });
  }, [postId, navigate]);

  if (!post) return <Container>로딩 중...</Container>;

  const isAuthor = !!user && post.authorId === user.uid;

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

  const handleAnswerSave = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    if (!answerText.trim()) return alert("답변 내용을 입력해 주세요.");
    try {
      setSaving(true);
      await answerInquiry(postId, {
        text: answerText.trim(),
        adminId: user.uid,
        adminNickname: user.displayName || "관리자",
      });
      const refreshed = await fetchPostById(postId);
      setPost(refreshed);
      alert("답변이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      alert("답변 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerClear = async () => {
    if (!window.confirm("답변을 삭제하시겠습니까?")) return;
    try {
      setSaving(true);
      await clearAnswer(postId);
      const refreshed = await fetchPostById(postId);
      setPost(refreshed);
      setAnswerText("");
      alert("답변이 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      alert("답변 삭제 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container>
      <Header>{post.title}</Header>
      <Meta>
        {post.category === "notice" ? "공지" : "문의"} · {post.authorNickname || "익명"} ·{" "}
        {formatDistanceToNow(
          post.createdAt?.toDate ? post.createdAt.toDate() : new Date(),
          { addSuffix: true, locale: ko }
        )}
        {post.category === "inquiry" && (
          <Badge $type={post.status === "answered" ? "done" : "wait"}>
            {post.status === "answered" ? "답변완료" : "답변대기"}
          </Badge>
        )}
      </Meta>

      <Content>{post.content}</Content>

      {post.category === "inquiry" && (
        <AnswerCard>
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>답변</div>

          {post.status === "answered" && post.answer ? (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 8 }}>
              {post.answer}
            </div>
          ) : (
            <div style={{ color: "#888", marginBottom: 8 }}>아직 답변이 등록되지 않았습니다.</div>
          )}

          {(post.answeredBy?.nickname || post.answeredAt?.toDate) && (
            <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
              — {post.answeredBy?.nickname || "관리자"}
              {post.answeredAt?.toDate && (
                <> · {formatDistanceToNow(post.answeredAt.toDate(), { addSuffix: true, locale: ko })}</>
              )}
            </div>
          )}

          {isAdmin && (
            <div>
              <Textarea
                rows={5}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="답변 내용을 입력하세요"
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Button onClick={handleAnswerSave} disabled={saving}>
                  {post.status === "answered" ? "답변 수정" : "답변 등록"}
                </Button>
                {post.status === "answered" && (
                  <Button $variant="delete" onClick={handleAnswerClear} disabled={saving}>
                    답변 삭제
                  </Button>
                )}
              </div>
            </div>
          )}
        </AnswerCard>
      )}

      <ButtonGroup>
        <Button onClick={() => navigate("/board")}>목록</Button>
        {isAuthor && (
          <>
            <Button onClick={() => navigate(`/board/${postId}/edit`)}>수정</Button>
            <Button $variant="delete" onClick={handleDelete}>
              삭제
            </Button>
          </>
        )}
      </ButtonGroup>
    </Container>
  );
}
