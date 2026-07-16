// src/components/admin/ExchangeList.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { db, functions } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  query,
  orderBy,
  limit as qLimit,
  startAfter,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

const DEBUG =
  (typeof window !== "undefined" &&
    (window.location.search.includes("debug=1") ||
      localStorage.getItem("DEBUG_EXCHANGE_LIST") === "1")) ||
  false;

/* ─────────────── 상수 & 유틸 ─────────────── */
const PAGE_SIZE = 20;
const DON_TO_GRAMS = 3.75;

const STATUS_LABEL = {
  requested: "요청(대기)",
  scheduled: "예약 승인",
  in_progress: "진행 중",
  completed: "완료",
  rejected: "거절",
  canceled: "취소",
  교환중: "진행 중",
};

// 대표상태 우선순위 (인덱스 작을수록 상위)
const STATUS_PRIORITY = [
  "rejected",
  "canceled",
  "completed",
  "scheduled",
  "in_progress",
  "교환중",
  "requested",
];

function fmt(ts) {
  try {
    if (!ts) return "-";
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0") +
      " " +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  } catch {
    return "-";
  }
}

/* GoldExchange & MyExchanges와 동일한 라운딩/포맷 규칙 */
const roundTo3Custom = (n) => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8);
  let thousands = Math.floor(t / 10);
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};
const toFixed3CustomStr = (n) => roundTo3Custom(n).toFixed(3);
const fmtG3 = (n) => toFixed3CustomStr(Number(n || 0)); // g: 소수점 3자리(커스텀 반올림)
const fmtD2 = (n) => (Number(n || 0)).toFixed(2);       // 돈: 소수점 2자리
const fmtG2Min = (n) => {                                // 안내용 최소 0.01g
  const x = Number(n || 0);
  if (x > 0 && x < 0.01) return "0.01";
  return (Math.round(x * 100) / 100).toFixed(2);
};

const displayOriginalQty = (doc) => {
  const origQ = doc.originalQuantity;
  const unit = doc.inputUnit; // 'g' | 'don'
  if (origQ != null && unit) {
    const n = Number(origQ) || 0;
    if (unit === "g") {
      return `${toFixed3CustomStr(n)} g (${fmtD2(roundTo3Custom(n / DON_TO_GRAMS))} 돈)`;
    }
    return `${toFixed3CustomStr(roundTo3Custom(n * DON_TO_GRAMS))} g (${fmtD2(roundTo3Custom(n))} 돈)`;
  }
  const grams = Number(doc.quantity) || 0;
  return `${toFixed3CustomStr(grams)} g (${fmtD2(roundTo3Custom(grams / DON_TO_GRAMS))} 돈)`;
};

const normalizeStatusKey = (s) => (s === "교환중" ? "in_progress" : s || "requested");

/* ─────────────── 스타일 ─────────────── */
const StickyToolbar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 10px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const Summary = styled.span`
  margin-left: auto;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  ${DEBUG ? "outline: 2px dashed #00A8E8;" : ""}
`;

const DebugBar = styled.div`
  display: ${DEBUG ? "block" : "none"};
  background: #00a8e8;
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  margin: 8px 0;
`;

const Input = styled.input`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  min-width: 220px;
  background: ${({ theme }) => theme.colors.surface};
`;

const GroupCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const GroupHeader = styled.button`
  all: unset;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.surfaceAlt || "#f7f9fc"}; }
`;

const HLeft = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: .6rem;
  row-gap: .25rem;
  align-items: baseline;
  min-width: 0;
`;

const HLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
  font-size: .92rem;
`;
const HValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  font-size: .95rem;
  min-width: 0;
`;

const HRight = styled.div`
  display: flex;
  align-items: center;
  gap: .5rem;
`;

const StatusBadge = styled.span`
  padding: .32rem .6rem;
  border-radius: 9999px;
  font-weight: 800;
  font-size: .83rem;
  background: ${({ $status, theme }) => {
    if ($status === 'requested') return theme.colors.warning;
    if ($status === 'scheduled') return theme.colors.success;
    if ($status === 'completed') return theme.colors.secondary;
    if ($status === 'rejected') return theme.colors.error;
    if ($status === 'canceled') return theme.colors.gray;
    if ($status === 'in_progress' || $status === '교환중') return theme.colors.info;
    return theme.colors.gray;
  }};
  color: #fff;
`;

const Chev = styled.span`
  display: inline-block;
  transition: transform .2s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  font-size: 1rem;
  opacity: .7;
`;

const GroupBody = styled.div`
  padding: .9rem 1rem 1.1rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: .9rem;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .75rem 1.25rem;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  grid-template-columns: 6.5em 1fr;
  align-items: baseline;
  column-gap: .5rem;
`;
const Label = styled.span`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.01em;
`;
const Value = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  word-break: break-word;
`;

const Divider = styled.hr`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  border: none;
  margin: .25rem 0 .25rem;
`;

const ItemsTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border-radius: 10px;
  thead th {
    text-align: left;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    padding: .55rem .65rem;
    font-size: .92rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  tbody td {
    padding: .55rem .65rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: top;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .92rem;
  }
  tbody tr:nth-child(even) td {
    background: ${({ theme }) => theme.colors.surfaceAlt || "#fafafa"};
  }
  tbody tr:last-child td { border-bottom: none; }
  @media (max-width: 640px) {
    th[data-col='exchangeType'], td[data-col='exchangeType'],
    th[data-col='status'], td[data-col='status'] { display: none; }
  }
`;

const TotalRow = styled.div`
  margin-top: .35rem;
  font-weight: 800;
  display: flex;
  gap: .5rem;
  align-items: center;
`;

const Chips = styled.span`
  display: inline-flex;
  gap: .35rem;
  flex-wrap: wrap;
`;
const Chip = styled.span`
  display: inline-block;
  padding: .12rem .45rem;
  border-radius: 9999px;
  font-weight: 800;
  font-size: .82rem;
  color: #fff;
  background: ${({ $tone, theme }) => {
    if ($tone === 'grams') return theme.colors.primary;
    if ($tone === 'don') return theme.colors.secondary;
    return theme.colors.info;
  }};
`;

const PlanCard = styled.div`
  margin-top: .5rem;
  padding: .75rem .9rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: linear-gradient(180deg, #fcfdff, #f7f9fc);
`;
const PlanRow = styled.div`
  display: grid;
  grid-template-columns: 7em 1fr;
  gap: .5rem;
  margin: .25rem 0;
`;
const PlanLabel = styled.span`font-weight: 800;`;
const PlanValue = styled.span``;
const Pill = styled.span`
  display: inline-block;
  padding: .2rem .55rem;
  border-radius: 9999px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 800;
  font-size: .82rem;
  margin-right: .35rem;
  margin-top: .25rem;
`;

const ButtonGroup = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
const ActionButton = styled.button`
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.buttonText};
  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
  &:disabled {
    opacity: .6;
    cursor: not-allowed;
  }
`;

const LoadMoreWrap = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 16px 0 24px;
`;
const LoadMoreBtn = styled.button`
  padding: 10px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const TopButton = styled.button`
  position: fixed;
  right: 16px;
  bottom: 16px;
  padding: 10px 12px;
  border: none;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  cursor: pointer;
`;

/* ─────────────── 컴포넌트 ─────────────── */
export default function ExchangeList() {
  // 로우 문서(페이지 누적)
  const [docs, setDocs] = useState([]);
  const [qText, setQText] = useState("");
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // 그룹 확장 상태
  const [expanded, setExpanded] = useState({});
  const toggle = (gid) => setExpanded((p) => ({ ...p, [gid]: !p[gid] }));

  // 프로필 캐시 (userId -> profile)
  const [profiles, setProfiles] = useState({});

  // 그룹 단위 busy 상태 (중복 클릭 방지)
  const [busy, setBusy] = useState({}); // { [groupId]: boolean }

  // 최초 페이지 로드 (createdAt desc 정렬로만 페이징)
  useEffect(() => {
    let cancelled = false;
    async function loadFirstPage() {
      setLoadingFirst(true);
      setHasMore(true);
      setLastDoc(null);
      try {
        const baseQ = query(
          collection(db, "goldExchanges"),
          orderBy("createdAt", "desc"),
          qLimit(PAGE_SIZE)
        );
        const snap = await getDocs(baseQ);
        if (cancelled) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDocs(rows);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.size === PAGE_SIZE);
      } catch (e) {
        console.error("첫 페이지 로드 실패:", e);
      } finally {
        if (!cancelled) setLoadingFirst(false);
      }
    }
    loadFirstPage();
    return () => {
      cancelled = true;
    };
  }, []);

  // 더 불러오기
  const loadMore = async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const baseQ = query(
        collection(db, "goldExchanges"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        qLimit(PAGE_SIZE)
      );
      const snap = await getDocs(baseQ);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDocs((prev) => [...prev, ...rows]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.size === PAGE_SIZE);
    } catch (e) {
      console.error("추가 로드 실패:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // docs -> 그룹화(+대표상태/합계/요청자/플랜)
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of docs) {
      const gid = r.groupId || r.id;
      if (!map.has(gid)) map.set(gid, []);
      map.get(gid).push(r);
    }

    const out = [];
    for (const [gid, items] of map) {
      const statuses = items.map((i) => i.status).filter(Boolean);
      const repStatus =
        statuses.sort(
          (a, b) =>
            STATUS_PRIORITY.indexOf(a ?? "requested") -
            STATUS_PRIORITY.indexOf(b ?? "requested")
        )[0] || "requested";

      const createdNs = items
        .map((i) => {
          const t = i.createdAt;
          if (!t) return null;
          return typeof t.toDate === "function" ? t.toDate().getTime() : new Date(t).getTime();
        })
        .filter((n) => Number.isFinite(n));
      const updatedNs = items
        .map((i) => {
          const t = i.updatedAt;
          if (!t) return null;
          return typeof t.toDate === "function" ? t.toDate().getTime() : new Date(t).getTime();
        })
        .filter((n) => Number.isFinite(n));

      const createdAt = createdNs.length ? new Date(Math.min(...createdNs)) : null;
      const updatedAt = updatedNs.length ? new Date(Math.max(...updatedNs)) : null;

      // 예약일/시간(대표)
      const any = items[0] || {};
      const visitDate = any.visitDate || "";
      const visitTime = any.visitTime || "";
      const scheduledAt =
        items
          .map((i) => i.scheduledAt)
          .map((t) => (t && typeof t.toDate === "function" ? t.toDate() : t))
          .filter(Boolean)
          .sort((a, b) => (b?.getTime?.() ?? 0) - (a?.getTime?.() ?? 0))[0] || null;

      // 요청자(업데이트 최근 문서 우선)
      const latestByUpdate =
        items
          .slice()
          .sort((a, b) => {
            const au = a.updatedAt && (typeof a.updatedAt.toDate === "function" ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt).getTime());
            const bu = b.updatedAt && (typeof b.updatedAt.toDate === "function" ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime());
            return (bu || 0) - (au || 0);
          })[0] || {};
      const requester = {
        userId: latestByUpdate.userId || items.find(i => i.userId)?.userId || "",
        name: latestByUpdate.name || latestByUpdate.requesterName || "-",
        phone: latestByUpdate.phone || "-",
        address: latestByUpdate.address || "-",
        email: latestByUpdate.email || "-", // 프로필 보강은 렌더 시 적용
      };

      // 수치 보정 + 합계
      const enrichedItems = items.map((it) => {
        const fwNum = Number.isFinite(Number(it.finalWeight)) ? Number(it.finalWeight) : 0;
        const fwDon = Number.isFinite(Number(it.finalWeightDon)) ? Number(it.finalWeightDon) : fwNum / DON_TO_GRAMS;
        return {
          ...it,
          _displayOriginal: displayOriginalQty(it),
          _finalWeight: fwNum,
          _finalWeightDon: fwDon,
        };
      });
      const totalG = enrichedItems.reduce((s, i) => s + (Number(i._finalWeight) || 0), 0);

      // 최신 barsPlan
      const planDoc =
        items
          .filter((i) => i.barsPlan)
          .sort((a, b) => {
            const au = a.updatedAt && (typeof a.updatedAt.toDate === "function" ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt).getTime());
            const bu = b.updatedAt && (typeof b.updatedAt.toDate === "function" ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime());
            return (bu || 0) - (au || 0);
          })[0] || null;

      out.push({
        groupId: gid,
        items: enrichedItems,
        repStatus,
        createdAt,
        updatedAt,
        visitDate,
        visitTime,
        scheduledAt,
        requester,
        totalG,
        plan: planDoc ? planDoc.barsPlan : null,
      });
    }

    // 최신 업데이트 순 정렬
    out.sort((a, b) => {
      const at = a.updatedAt?.getTime?.() ?? 0;
      const bt = b.updatedAt?.getTime?.() ?? 0;
      return bt - at;
    });

    return out;
  }, [docs]);

  // 처음 한 개는 기본 펼침
  useEffect(() => {
    if (groups.length === 0) return;
    setExpanded((prev) => {
      if (Object.keys(prev).length) return prev;
      return { [groups[0].groupId]: true };
    });
  }, [groups]);

  // 프로필 보강(이메일/전화) — 현재 페이지에 나타난 userId만
  useEffect(() => {
    const need = Array.from(
      new Set(groups.map((g) => g.requester.userId).filter(Boolean))
    ).filter((uid) => !profiles[uid]);

    if (need.length === 0) return;

    (async () => {
      const entries = await Promise.all(
        need.map(async (uid) => {
          try {
            const ref = doc(db, "profiles", uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              return [uid, snap.data()];
            }
          } catch (e) {
            console.warn("[Admin ExchangeList] profile fetch failed:", uid, e?.message || e);
          }
          return [uid, null];
        })
      );
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uid, data] of entries) next[uid] = data;
        return next;
      });
    })();
  }, [groups, profiles]);

  // 검색 필터 (그룹 단위)
  const groupsFiltered = useMemo(() => {
    const term = qText.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) => {
      const prof = g.requester.userId ? profiles[g.requester.userId] : null;
      const hay = [
        g.groupId,
        g.requester.userId,
        g.requester.name,
        g.requester.phone || prof?.phone,
        g.requester.address,
        g.requester.email || prof?.email,
        g.visitDate,
        g.visitTime,
        ...g.items.flatMap((it) => [
          it.id,
          it.goldType,
          it.exchangeType,
          it.status,
          displayOriginalQty(it),
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [groups, qText, profiles]);

  // 그룹 상태 일괄 업데이트 → Functions 콜러블 사용
  const updateGroupStatus = async (groupId, status) => {
    if (!groupId || !status) return;
    if (busy[groupId]) return; // 중복 방지

    setBusy((p) => ({ ...p, [groupId]: true }));
    try {
      const call = httpsCallable(functions, "setExchangeGroupStatus");
      const res = await call({ groupId, status });
      if (!res?.data?.ok) throw new Error("상태 변경 실패");

      // 로컬 상태 반영(낙관적 갱신)
      setDocs((prev) =>
        prev.map((d) =>
          (d.groupId || d.id) === groupId
            ? { ...d, status, updatedAt: new Date() }
            : d
        )
      );
    } catch (err) {
      console.error("그룹 상태 업데이트 실패:", err);
      alert("그룹 상태 업데이트에 실패했습니다.");
    } finally {
      setBusy((p) => ({ ...p, [groupId]: false }));
    }
  };

  if (loadingFirst && docs.length === 0) {
    return <p>금 교환 요청을 불러오는 중…</p>;
  }
  if (groups.length === 0) {
    return (
      <>
        <StickyToolbar>
          <Input
            placeholder="그룹/사용자/연락처/주소/항목/일시 검색"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
          />
          <Summary>총 0건</Summary>
        </StickyToolbar>
        <p style={{ padding: 12 }}>금 교환 요청이 없습니다.</p>
      </>
    );
  }

  return (
    <>
      <StickyToolbar>
        <Input
          placeholder="그룹/사용자/연락처/주소/항목/일시 검색"
          value={qText}
          onChange={(e) => setQText(e.target.value)}
        />
        <Summary>
          그룹: {groupsFiltered.length}건 / 로드된 문서: {docs.length}건
        </Summary>
      </StickyToolbar>

      <ListContainer data-testid="admin-exchange-list">
        {DEBUG && (
          <DebugBar>
            DEBUG · Admin ExchangeList (Grouped) · src/components/admin/ExchangeList.js
          </DebugBar>
        )}

        {groupsFiltered.map((g) => {
          const statusKey = normalizeStatusKey(g.repStatus);
          const prof = g.requester.userId ? profiles[g.requester.userId] : null;
          const email = g.requester.email !== "-" ? g.requester.email : (prof?.email || "미등록");
          const phone = g.requester.phone !== "-" ? g.requester.phone : (prof?.phone || "미등록");
          const visitLine =
            g.scheduledAt
              ? fmt(g.scheduledAt)
              : [g.visitDate, g.visitTime].filter(Boolean).join(" ") || "-";

          const disabled = !!busy[g.groupId];

          return (
            <GroupCard key={g.groupId}>
              <GroupHeader onClick={() => toggle(g.groupId)} aria-expanded={!!expanded[g.groupId]}>
                <HLeft>
                  <HLabel>요청일</HLabel>
                  <HValue>{fmt(g.createdAt)}</HValue>
                  <HLabel>업데이트</HLabel>
                  <HValue>{fmt(g.updatedAt)}</HValue>
                  <HLabel>예약</HLabel>
                  <HValue>{visitLine}</HValue>
                </HLeft>
                <HRight>
                  <Chips>
                    <Chip $tone="grams">{fmtG3(g.totalG)} g</Chip>
                    <Chip $tone="don">{fmtD2((g.totalG || 0) / DON_TO_GRAMS)} 돈</Chip>
                  </Chips>
                  <StatusBadge $status={statusKey}>
                    {STATUS_LABEL[g.repStatus] || STATUS_LABEL[statusKey] || g.repStatus}
                  </StatusBadge>
                  <Chev $open={!!expanded[g.groupId]}>▾</Chev>
                </HRight>
              </GroupHeader>

              {expanded[g.groupId] && (
                <GroupBody>
                  {/* 예약/요청자 정보 */}
                  <MetaGrid>
                    <Field><Label>요청 그룹</Label><Value>{g.groupId}</Value></Field>
                    <Field><Label>요청자</Label><Value>{g.requester.name}</Value></Field>
                    <Field><Label>전화</Label><Value>{phone}</Value></Field>
                    <Field><Label>주소</Label><Value>{g.requester.address}</Value></Field>
                    <Field><Label>이메일</Label><Value>{email}</Value></Field>
                  </MetaGrid>

                  <Divider />

                  {/* 항목 리스트 */}
                  <div>
                    <ItemsTable>
                      <thead>
                        <tr>
                          <th style={{width: '24%'}}>제품 종류</th>
                          <th style={{width: '30%'}}>요청 수량</th>
                          <th data-col="exchangeType" style={{width: '20%'}}>교환 유형</th>
                          <th data-col="status" style={{width: '16%'}}>상태</th>
                          <th style={{width: '10%'}}>교환 중량</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items
                          .slice()
                          .sort((a, b) => {
                            const ac = a.createdAt && (typeof a.createdAt.toDate === "function" ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime());
                            const bc = b.createdAt && (typeof b.createdAt.toDate === "function" ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime());
                            return (ac || 0) - (bc || 0);
                          })
                          .map((it) => (
                            <tr key={it.id}>
                              <td>{it.goldType || "-"}</td>
                              <td>{it._displayOriginal}</td>
                              <td data-col="exchangeType">
                                {it.unknown ? "현장 확인" : (it.exchangeType || "999.9골드바")}
                              </td>
                              <td data-col="status">{STATUS_LABEL[it.status] || it.status || "-"}</td>
                              <td>
                                <Chips>
                                  <Chip $tone="grams">{fmtG3(it._finalWeight)} g</Chip>
                                  <Chip $tone="don">{fmtD2(it._finalWeightDon)} 돈</Chip>
                                </Chips>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </ItemsTable>

                    <TotalRow>
                      합계(순금 중량):
                      <Chips>
                        <Chip $tone="grams">{fmtG3(g.totalG)} g</Chip>
                        <Chip $tone="don">{fmtD2((g.totalG || 0) / DON_TO_GRAMS)} 돈</Chip>
                      </Chips>
                    </TotalRow>
                  </div>

                  {/* 교환 계획 (barsPlan) */}
                  {g.plan && (
                    <>
                      <Divider />
                      <PlanCard>
                        <strong>교환 계획</strong>
                        <PlanRow>
                          <PlanLabel>선택 규격</PlanLabel>
                          <PlanValue>
                            {g.plan.selected?.label} × {g.plan.selected?.qty}
                          </PlanValue>
                        </PlanRow>
                        <PlanRow>
                          <PlanLabel>사용량</PlanLabel>
                          <PlanValue>
                            {fmtG3(g.plan.selected?.usedGrams)} g / {fmtD2(g.plan.selected?.usedDon)} 돈
                          </PlanValue>
                        </PlanRow>
                        <PlanRow>
                          <PlanLabel>잔여</PlanLabel>
                          <PlanValue>
                            {fmtG2Min(g.plan.leftoverGrams)} g / {fmtD2(g.plan.leftoverDon)} 돈
                            {Number(g.plan.leftoverGrams) > 0 ? " · 남은 금은 매입 가능합니다." : ""}
                          </PlanValue>
                        </PlanRow>
                        {Array.isArray(g.plan.autoBreakdown) && g.plan.autoBreakdown.length > 0 && (
                          <PlanRow>
                            <PlanLabel>추가 조합</PlanLabel>
                            <PlanValue>
                              {g.plan.autoBreakdown.map((x, i) => (
                                <Pill key={`${x.label}-${i}`}>{x.label} × {x.qty}</Pill>
                              ))}
                            </PlanValue>
                          </PlanRow>
                        )}
                      </PlanCard>
                    </>
                  )}

                  {/* 그룹 상태 일괄 제어 */}
                  <ButtonGroup>
                    {statusKey === "requested" && (
                      <>
                        <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "scheduled")}>
                          {disabled ? "처리 중…" : "예약 승인"}
                        </ActionButton>
                        <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "rejected")}>
                          {disabled ? "처리 중…" : "거절"}
                        </ActionButton>
                      </>
                    )}
                    {statusKey === "scheduled" && (
                      <>
                        <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "in_progress")}>
                          {disabled ? "처리 중…" : "진행 중"}
                        </ActionButton>
                        <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "completed")}>
                          {disabled ? "처리 중…" : "완료"}
                        </ActionButton>
                        <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "canceled")}>
                          {disabled ? "처리 중…" : "취소"}
                        </ActionButton>
                      </>
                    )}
                    {statusKey === "in_progress" && (
                      <>
                        <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "completed")}>
                          {disabled ? "처리 중…" : "완료"}
                        </ActionButton>
                        <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "canceled")}>
                          {disabled ? "처리 중…" : "취소"}
                        </ActionButton>
                      </>
                    )}
                    {(statusKey === "rejected" || statusKey === "canceled" || statusKey === "completed") && (
                      <ActionButton disabled={disabled} onClick={() => updateGroupStatus(g.groupId, "requested")}>
                        {disabled ? "처리 중…" : "요청으로 되돌리기"}
                      </ActionButton>
                    )}
                  </ButtonGroup>
                </GroupBody>
              )}
            </GroupCard>
          );
        })}
      </ListContainer>

      <LoadMoreWrap>
        <LoadMoreBtn onClick={loadMore} disabled={!hasMore || loadingMore}>
          {loadingMore ? "불러오는 중..." : hasMore ? "더보기" : "더 이상 없음"}
        </LoadMoreBtn>
        <LoadMoreBtn
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          맨 위로
        </LoadMoreBtn>
      </LoadMoreWrap>

      <TopButton
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="맨 위로"
        title="맨 위로"
      >
        ▲
      </TopButton>
    </>
  );
}
