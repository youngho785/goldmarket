import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { fetchInquiriesByStatus } from "@/services/boardService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const Wrap = styled.div`
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
`;
const Header = styled.div`
  display: flex; justify-content: space-between; gap: 12px; align-items: end;
  margin-bottom: 16px;
`;
const Title = styled.h1` margin: 0; `;
const Controls = styled.div` display: flex; gap: 8px; align-items: center; `;
const Tabs = styled.div` display: flex; gap: 6px; `;
const Tab = styled.button`
  padding: 8px 12px; border-radius: 999px; border: 1px solid #ddd; cursor: pointer;
  background: ${({ $active }) => ($active ? "#111827" : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : "#111827")};
`;
const Button = styled.button`
  padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;
  background: ${({ theme }) => theme.colors?.primary || "#007bff"}; color: #fff;
`;
const Input = styled.input`
  padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; min-width: 220px;
`;
const List = styled.div` border-top: 1px solid #eee; `;
const Row = styled.div`
  padding: 12px 8px; border-bottom: 1px solid #eee; cursor: pointer;
  display: grid; grid-template-columns: 1fr auto; gap: 8px;
  &:hover { background: #fafafa; }
`;
const TitleText = styled.div` font-weight: 600; `;
const Meta = styled.div`
  display: flex; gap: 8px; color: #666; font-size: 0.9em; align-items: center; flex-wrap: wrap;
`;
const Right = styled.div` display: flex; gap: 8px; align-items: center; `;
const Badge = styled.span`
  display: inline-block; padding: 2px 8px; font-size: 12px; border-radius: 999px;
  background: ${({ $type }) => ($type === "done" ? "#e6f4ea" : "#fff8e1")};
  color: ${({ $type }) => ($type === "done" ? "#137333" : "#8a6d3b")};
  border: 1px solid ${({ $type }) => ($type === "done" ? "#c6e7cc" : "#f3e2b3")};
`;

const tabs = [
  { key: "all", label: "전체" },
  { key: "open", label: "답변대기" },
  { key: "answered", label: "답변완료" },
];

export default function AdminInquiries() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("open"); // 기본: 답변대기
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const list = await fetchInquiriesByStatus({ status: tab, pageSize: 200 });
      setItems(list);
    } catch (e) {
      console.error(e);
      setError("목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(p => {
      const t = (p.title || "").toLowerCase();
      const c = (p.content || "").toLowerCase();
      const n = (p.authorNickname || "익명").toLowerCase();
      return t.includes(s) || c.includes(s) || n.includes(s);
    });
  }, [items, q]);

  return (
    <Wrap>
      <Header>
        <Title>문의 관리</Title>
        <Controls>
          <Tabs>
            {tabs.map(t => (
              <Tab key={t.key} $active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </Tab>
            ))}
          </Tabs>
          <Input
            placeholder="제목/내용/닉네임 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button onClick={load}>{loading ? "불러오는 중…" : "새로고침"}</Button>
        </Controls>
      </Header>

      {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>}
      {loading ? (
        <div>로딩 중…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#6b7280" }}>표시할 문의가 없습니다.</div>
      ) : (
        <List>
          {filtered.map(p => (
            <Row
              key={p.id}
              onClick={() => navigate(`/board/${p.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/board/${p.id}`);
                }
              }}
            >
              <div>
                <TitleText>{p.title}</TitleText>
                <Meta>
                  <span>작성자: {p.authorNickname || "익명"}</span>
                  <span>·</span>
                  <span>
                    {formatDistanceToNow(
                      p.createdAt?.toDate ? p.createdAt.toDate() : new Date(),
                      { addSuffix: true, locale: ko }
                    )}
                  </span>
                </Meta>
              </div>
              <Right>
                <Badge $type={p.status === "answered" ? "done" : "wait"}>
                  {p.status === "answered" ? "답변완료" : "답변대기"}
                </Badge>
              </Right>
            </Row>
          ))}
        </List>
      )}
    </Wrap>
  );
}
