// src/pages/MyInquiries.js
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  fetchMyInquiriesPaged,
} from "../services/boardService";

const Wrap = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: auto;
`;
const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
`;
const Title = styled.h1` margin: 0; `;
const NewBtn = styled.button`
  padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;
  background: ${({ theme }) => theme.colors?.primary || "#007bff"};
  color: #fff;
`;
const Tabs = styled.div`
  display: flex; gap: 8px; margin: 8px 0 16px;
`;
const Tab = styled.button`
  padding: 8px 12px; border-radius: 999px; border: 1px solid #e5e7eb; cursor: pointer;
  background: ${({ $active }) => ($active ? "#111827" : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : "#111827")};
`;
const Item = styled.div`
  padding: 16px; border-bottom: 1px solid #eee; cursor: pointer;
  &:hover { background: #fafafa; }
`;
const Title2 = styled.h2` font-size: 1.1rem; margin: 0; `;
const Meta = styled.div`
  margin-top: 6px; font-size: .85rem; color: #666;
  display: flex; align-items: center; gap: 6px;
`;
const Badge = styled.span`
  display: inline-block; padding: 2px 8px; font-size: 12px; border-radius: 999px;
  background: ${({ $type }) => ($type === "done" ? "#e6f4ea" : "#fff8e1")};
  color: ${({ $type }) => ($type === "done" ? "#137333" : "#8a6d3b")};
  border: 1px solid ${({ $type }) => ($type === "done" ? "#c6e7cc" : "#f3e2b3")};
`;
const More = styled.button`
  margin: 16px auto 0; display: block; padding: 10px 14px; border: 1px solid #e5e7eb;
  border-radius: 8px; background: #fff; cursor: pointer;
`;

export default function MyInquiries() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("status") || ""; // "", "open", "answered"

  const [tab, setTab] = useState(initialTab);
  const [uid, setUid] = useState(() => auth.currentUser?.uid || null);

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  // 로그인 상태 변화 반영
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub();
  }, []);

  // 탭 변경 시 URL 동기화
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (tab) next.set("status", tab);
    else next.delete("status");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 최초 로드/탭 변경 시 데이터 리셋 후 첫 페이지 로드
  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true);
      try {
        const { items, nextCursor } = await fetchMyInquiriesPaged({
          uid,
          status: tab, // "", "open", "answered"
          limit: 20,
          cursor: null,
        });
        setRows(items);
        setCursor(nextCursor);
      } catch (e) {
        console.error("내 문의 불러오기 오류:", e);
        alert("내 문의를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, tab]);

  const loadMore = async () => {
    if (!uid || !cursor) return;
    setLoading(true);
    try {
      const { items, nextCursor } = await fetchMyInquiriesPaged({
        uid,
        status: tab,
        limit: 20,
        cursor,
      });
      setRows((prev) => [...prev, ...items]);
      setCursor(nextCursor);
    } catch (e) {
      console.error("더보기 오류:", e);
      alert("더 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = useMemo(
    () => [
      { key: "", label: "전체" },
      { key: "open", label: "답변대기" },
      { key: "answered", label: "답변완료" },
    ],
    []
  );

  return (
    <Wrap>
      <Header>
        <Title>내 문의</Title>
        <NewBtn onClick={() => navigate("/board/new")}>문의 작성</NewBtn>
      </Header>

      <Tabs>
        {tabs.map((t) => (
          <Tab
            key={t.key}
            $active={t.key === tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Tab>
        ))}
      </Tabs>

      {loading && rows.length === 0 && <div>로딩 중…</div>}

      {rows.map((post) => (
        <Item
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
          <Title2>{post.title}</Title2>
          <Meta>
            <span>문의</span>
            <Badge $type={post.status === "answered" ? "done" : "wait"}>
              {post.status === "answered" ? "답변완료" : "답변대기"}
            </Badge>
            <span>·</span>
            <span>
              {formatDistanceToNow(
                post.createdAt?.toDate ? post.createdAt.toDate() : new Date(),
                { addSuffix: true, locale: ko }
              )}
            </span>
          </Meta>
        </Item>
      ))}

      {!loading && rows.length === 0 && <div style={{ color: "#888" }}>문의글이 없습니다.</div>}

      {cursor && (
        <More onClick={loadMore} disabled={loading}>
          {loading ? "불러오는 중..." : "더 보기"}
        </More>
      )}
    </Wrap>
  );
}
