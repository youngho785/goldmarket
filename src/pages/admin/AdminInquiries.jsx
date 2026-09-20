import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { fetchInquiriesByStatus } from "@/services/supportService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const Wrap = styled.section`
  display: grid;
  gap: 16px;
`;
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: end;

  @media (max-width: 900px) {
    align-items: stretch;
    flex-direction: column;
  }
`;
const HeaderCopy = styled.div`
  h1 { margin: 0 0 5px; }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const Controls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;
const Tabs = styled.div`display: flex; gap: 6px; flex-wrap: wrap;`;
const Tab = styled.button`
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? theme.on.primary : theme.colors.text)};
  font-weight: 750;
`;
const Button = styled.button`
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-weight: 800;
  &:disabled { opacity: .55; cursor: not-allowed; }
`;
const Input = styled.input`
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  min-width: min(280px, 100%);
  flex: 1 1 240px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;
const Summary = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .86rem;
`;
const Error = styled.p`
  margin: 0;
  padding: 11px 13px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;
const Empty = styled.p`
  margin: 0;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surface};
`;
const List = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
`;
const Row = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  &:last-child { border-bottom: 0; }
  &:hover, &:focus-visible { background: ${({ theme }) => theme.colors.surfaceAlt}; outline: none; }
  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;
const TitleText = styled.div`font-weight: 750;`;
const Meta = styled.div`
  display: flex;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.86rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 5px;
`;
const Right = styled.div`display: flex; gap: 8px; align-items: center;`;
const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 999px;
  background: ${({ $type, theme }) => ($type === "done" ? theme.semantic.alertSuccessBg : theme.semantic.alertWarningBg)};
  color: ${({ $type, theme }) => ($type === "done" ? theme.semantic.alertSuccessText : theme.semantic.alertWarningText)};
  border: 1px solid ${({ $type, theme }) => ($type === "done" ? theme.colors.success : theme.colors.warning)};
  font-weight: 800;
`;

const tabs = [
  { key: "all", label: "전체" },
  { key: "open", label: "답변대기" },
  { key: "answered", label: "답변완료" },
];

export default function AdminInquiries() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("open");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchInquiriesByStatus({ status: tab, pageSize: 200 });
      setItems(list);
    } catch (e) {
      console.error(e);
      setError("문의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const content = (p.content || "").toLowerCase();
      const nickname = (p.authorNickname || "익명").toLowerCase();
      return title.includes(s) || content.includes(s) || nickname.includes(s);
    });
  }, [items, q]);

  return (
    <Wrap>
      <Header>
        <HeaderCopy>
          <h1>문의 관리</h1>
          <p>답변 대기 문의를 우선 처리하고 완료된 문의 이력을 확인합니다.</p>
        </HeaderCopy>
        <Controls>
          <Tabs aria-label="문의 상태 필터">
            {tabs.map((item) => (
              <Tab
                key={item.key}
                type="button"
                $active={tab === item.key}
                aria-pressed={tab === item.key}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </Tab>
            ))}
          </Tabs>
          <Input
            placeholder="제목·내용·닉네임 검색"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="문의 검색"
          />
          <Button type="button" onClick={load} disabled={loading}>
            {loading ? "불러오는 중…" : "새로고침"}
          </Button>
        </Controls>
      </Header>

      <Summary aria-live="polite">
        {loading ? "문의 목록을 확인하는 중입니다." : `표시 중 ${filtered.length}건 · 불러온 문의 ${items.length}건`}
      </Summary>
      {error && <Error role="alert">{error}</Error>}
      {loading && items.length === 0 ? (
        <Empty>문의 목록을 불러오고 있습니다.</Empty>
      ) : filtered.length === 0 ? (
        <Empty>조건에 맞는 문의가 없습니다.</Empty>
      ) : (
        <List>
          {filtered.map((post) => (
            <Row
              key={post.id}
              onClick={() => navigate(`/admin/support/${post.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/admin/support/${post.id}`);
                }
              }}
            >
              <div>
                <TitleText>{post.title}</TitleText>
                <Meta>
                  <span>작성자: {post.authorNickname || "익명"}</span>
                  <span>·</span>
                  <span>
                    {formatDistanceToNow(
                      post.createdAt?.toDate ? post.createdAt.toDate() : new Date(),
                      { addSuffix: true, locale: ko }
                    )}
                  </span>
                </Meta>
              </div>
              <Right>
                <Badge $type={post.status === "answered" ? "done" : "wait"}>
                  {post.status === "answered" ? "답변완료" : "답변대기"}
                </Badge>
              </Right>
            </Row>
          ))}
        </List>
      )}
    </Wrap>
  );
}
