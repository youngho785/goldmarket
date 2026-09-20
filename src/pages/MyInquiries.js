// src/pages/MyInquiries.js
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { fetchMyInquiriesPaged } from "../services/supportService";

const Wrap = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: auto;
`;
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
`;
const Title = styled.h1`margin: 0;`;
const NewBtn = styled.button`
  min-height: 40px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font-weight: 800;
`;
const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin: 8px 0 16px;
  flex-wrap: wrap;
`;
const Tab = styled.button`
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? theme.on.primary : theme.colors.text)};
`;
const ErrorNotice = styled.p`
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;
const Item = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  cursor: pointer;
  &:hover, &:focus-visible {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    outline: none;
  }
`;
const Title2 = styled.h2`font-size: 1.1rem; margin: 0;`;
const Meta = styled.div`
  margin-top: 6px;
  font-size: .85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 6px;
`;
const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 999px;
  background: ${({ $type, theme }) => ($type === "done" ? theme.semantic.alertSuccessBg : theme.semantic.alertWarningBg)};
  color: ${({ $type, theme }) => ($type === "done" ? theme.semantic.alertSuccessText : theme.semantic.alertWarningText)};
  border: 1px solid ${({ $type, theme }) => ($type === "done" ? theme.colors.success : theme.colors.warning)};
`;
const More = styled.button`
  margin: 16px auto 0;
  display: block;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
`;

export default function MyInquiries() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("status") || "";

  const [tab, setTab] = useState(initialTab);
  const [uid, setUid] = useState(() => auth.currentUser?.uid || null);
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (tab) next.set("status", tab);
    else next.delete("status");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { items, nextCursor } = await fetchMyInquiriesPaged({
          uid,
          status: tab,
          limit: 20,
          cursor: null,
        });
        setRows(items);
        setCursor(nextCursor);
      } catch (loadError) {
        console.error("내 문의 불러오기 오류:", loadError);
        setRows([]);
        setCursor(null);
        setError("내 문의를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, tab]);

  const loadMore = async () => {
    if (!uid || !cursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const { items, nextCursor } = await fetchMyInquiriesPaged({
        uid,
        status: tab,
        limit: 20,
        cursor,
      });
      setRows((prev) => [...prev, ...items]);
      setCursor(nextCursor);
    } catch (loadError) {
      console.error("더보기 오류:", loadError);
      setError("추가 문의를 불러오지 못했습니다. 다시 시도해 주세요.");
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
        <NewBtn type="button" onClick={() => navigate("/support/new")}>문의 작성</NewBtn>
      </Header>

      <Tabs aria-label="문의 상태 필터">
        {tabs.map((item) => (
          <Tab
            key={item.key}
            type="button"
            $active={item.key === tab}
            aria-pressed={item.key === tab}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Tab>
        ))}
      </Tabs>

      {error && <ErrorNotice role="alert">{error}</ErrorNotice>}
      {loading && rows.length === 0 && <div>로딩 중…</div>}

      {rows.map((post) => (
        <Item
          key={post.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/support/${post.id}`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate(`/support/${post.id}`);
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

      {!loading && rows.length === 0 && !error && (
        <div style={{ color: "var(--gm-text-light)" }}>문의글이 없습니다.</div>
      )}

      {cursor && (
        <More type="button" onClick={loadMore} disabled={loading}>
          {loading ? "불러오는 중..." : "더 보기"}
        </More>
      )}
    </Wrap>
  );
}
