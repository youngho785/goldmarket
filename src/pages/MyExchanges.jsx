// src/pages/MyExchanges.js
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { format, isValid } from 'date-fns';
import { db } from '../firebase/firebase';
import { useAuthContext } from '../context/AuthContext';

/* ── 상수/유틸 ─────────────────────────────────── */
const DON_TO_GRAMS = 3.75;

const STATUS_LABEL = {
  requested: '예약대기중',
  in_progress: '교환중',
  교환중: '교환중',
  scheduled: '예약완료',
  completed: '교환완료',
  rejected: '거절',
};

// 대표 상태 선택 우선순위 (인덱스가 작을수록 우선)
const STATUS_PRIORITY = ['rejected', 'completed', 'scheduled', 'in_progress', '교환중', 'requested'];

// 필터용 그룹
const FILTER_LABEL = {
  all: '전체',
  active: '진행중',     // requested / in_progress(교환중)
  scheduled: '예약',
  completed: '완료',
  rejected: '거절',
};

const get = (theme, path, fallback) => {
  try {
    return path
      .split('.')
      .reduce((o, k) => (o && o[k] != null ? o[k] : undefined), theme) ?? fallback;
  } catch {
    return fallback;
  }
};

const toJSDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  return null;
};

const fmt = (d, f = 'yyyy.MM.dd HH:mm') => (d && isValid(d) ? format(d, f) : '-');

/* ── GoldExchange와 동일한 라운딩 규칙 ─────────── */
/** 0.0007 이상이면 0.001 올림 (4번째 자리 7-올림) */
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

const fmtG3 = (n) => toFixed3CustomStr(Number(n || 0));  // g: 소수점 셋째자리, 커스텀 반올림
const fmtD2 = (n) => (Number(n || 0)).toFixed(2);        // 돈: 둘째자리
const fmtG2Min = (n) => {                                // 안내용: 최소 0.01g
  const x = Number(n || 0);
  if (x > 0 && x < 0.01) return '0.01';
  return (Math.round(x * 100) / 100).toFixed(2);
};

/** 원래 입력 수량 표기 (GoldExchange와 동일한 감각의 반올림/환산) */
const displayOriginalQty = (doc) => {
  const origQ = doc.originalQuantity;
  const unit = doc.inputUnit; // 'g' | 'don'
  // 새 문서에 originalQuantity, inputUnit이 있으면 그걸 우선
  if (origQ != null && unit) {
    const n = Number(origQ) || 0;
    if (unit === 'g') {
      return `${toFixed3CustomStr(n)} g (${fmtD2(roundTo3Custom(n / DON_TO_GRAMS))} 돈)`;
    }
    // unit === 'don'
    return `${toFixed3CustomStr(roundTo3Custom(n * DON_TO_GRAMS))} g (${fmtD2(roundTo3Custom(n))} 돈)`;
  }
  // 레거시: grams만 있는 경우
  const grams = Number(doc.quantity) || 0;
  return `${toFixed3CustomStr(grams)} g (${fmtD2(roundTo3Custom(grams / DON_TO_GRAMS))} 돈)`;
};

/* ── 스타일 ───────────────────────────────────── */
const Page = styled.div`
  padding: 1.25rem 1rem 2.5rem;
  max-width: 960px;
  margin: 0 auto;
`;

const SectionTitle = styled.h1`
  margin: 0 0 .75rem;
  font-size: 1.35rem;
  letter-spacing: -0.01em;
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin: .25rem 0 1rem;
`;

const FilterChip = styled.button`
  padding: .35rem .7rem;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => get(theme, 'colors.border', '#e5e7eb')};
  background: ${({ $active, theme }) => ($active ? get(theme,'colors.surfaceAlt', '#eef2ff') : get(theme,'colors.surface','#fff'))};
  font-weight: 800;
  font-size: .85rem;
  cursor: pointer;
`;

const Count = styled.span`
  margin-left: .35rem;
  font-weight: 800;
  color: ${({ theme }) => get(theme, 'colors.primary', '#1f6feb')};
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: .9rem;
`;

const Card = styled.div`
  background: ${({ theme }) => get(theme, 'colors.surface', '#ffffff')};
  border: 1px solid ${({ theme }) => get(theme, 'colors.border', '#e5e7eb')};
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,.06);
  overflow: hidden;
`;

const CardHeader = styled.button`
  all: unset;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
  width: 100%;
  padding: .85rem 1rem;
  background: ${({ theme }) => get(theme, 'colors.background', '#f8fafc')};
  border-bottom: 1px solid ${({ theme }) => get(theme, 'colors.border', '#e5e7eb')};
  &:hover { background: ${({ theme }) => get(theme, 'colors.background', '#f1f5f9')}; }
`;

const HeaderLeft = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: .6rem;
  row-gap: .25rem;
  align-items: baseline;
  min-width: 0;
`;

const HLabel = styled.span`
  color: ${({ theme }) => get(theme, 'colors.textSecondary', '#475569')};
  font-weight: 600;
  font-size: .92rem;
`;

const HValue = styled.span`
  color: ${({ theme }) => get(theme, 'colors.text', '#111827')};
  font-weight: 700;
  font-size: .95rem;
  min-width: 0;
`;

const HeaderRight = styled.div`
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
    if ($status === 'requested') return get(theme, 'colors.warning', '#f59e0b');
    if ($status === 'scheduled') return get(theme, 'colors.success', '#10b981');
    if ($status === 'completed') return get(theme, 'colors.secondary', '#6366f1');
    if ($status === 'rejected') return get(theme, 'colors.error', '#ef4444');
    if ($status === 'in_progress' || $status === '교환중') return get(theme, 'colors.info', '#3b82f6');
    return get(theme, 'colors.gray', '#9ca3af');
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

const CardBody = styled.div`
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
  color: ${({ theme }) => get(theme, 'colors.text', '#0f172a')};
  letter-spacing: -0.01em;
`;
const Value = styled.span`
  color: ${({ theme }) => get(theme, 'colors.textSecondary', '#334155')};
  word-break: break-word;
`;

const Divider = styled.hr`
  height: 1px;
  background: ${({ theme }) => get(theme, 'colors.border', '#e5e7eb')};
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
    background: ${({ theme }) => get(theme, 'colors.background', '#f1f5f9')};
    color: ${({ theme }) => get(theme, 'colors.text', '#0f172a')};
    padding: .55rem .65rem;
    font-size: .92rem;
    border-bottom: 1px solid ${({ theme }) => get(theme, 'colors.border', '#e5e7eb')};
  }
  tbody td {
    padding: .55rem .65rem;
    border-bottom: 1px solid ${({ theme }) => get(theme, 'colors.border', '#e5e7eb')};
    vertical-align: top;
    color: ${({ theme }) => get(theme, 'colors.textSecondary', '#334155')};
    font-size: .92rem;
  }
  tbody tr:nth-child(even) td {
    background: ${({ theme }) => get(theme, 'colors.surfaceAlt', '#fafafa')};
  }
  tbody tr:last-child td { border-bottom: none; }
  @media (max-width: 640px) {
    th[data-col='exchangeType'], td[data-col='exchangeType'],
    th[data-col='status'], td[data-col='status'] { display: none; }
  }
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
    if ($tone === 'grams') return get(theme, 'colors.primary', '#1f6feb');
    if ($tone === 'don') return get(theme, 'colors.secondary', '#6366f1');
    return get(theme, 'colors.complementary', '#0ea5e9');
  }};
`;

const TotalRow = styled.div`
  margin-top: .35rem;
  font-weight: 800;
  display: flex;
  gap: .5rem;
  align-items: center;
`;

const Help = styled.p`
  color: ${({ theme }) => get(theme, 'colors.textSecondary', '#6b7280')};
  margin: .25rem 0 0;
  font-size: .9rem;
`;

const Empty = styled.p`
  margin-top: 1.25rem;
`;

const PlanCard = styled.div`
  margin-top: .5rem;
  padding: .75rem .9rem;
  border: 1px solid ${({ theme }) => get(theme, 'colors.border', '#e5e7eb')};
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

/* 스켈레톤 */
const Skeleton = styled.div`
  width: 100%;
  height: 64px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

/* ── 메인 컴포넌트 ─────────────────────────────── */
export default function MyExchanges() {
  const { user } = useAuthContext();
  const [docsA, setDocsA] = useState([]); // userId == uid
  const [docsB, setDocsB] = useState([]); // participants array-contains uid
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | scheduled | completed | rejected

  // 구독
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const qUser = query(collection(db, 'goldExchanges'), where('userId', '==', user.uid));
    const qPart = query(collection(db, 'goldExchanges'), where('participants', 'array-contains', user.uid));

    const unsub1 = onSnapshot(
      qUser,
      (snap) => {
        setDocsA(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr('내 교환 내역을 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    );
    const unsub2 = onSnapshot(
      qPart,
      (snap) => setDocsB(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, [user?.uid]);

  // 병합 + 중복 제거 + 그룹핑
  const groups = useMemo(() => {
    // 1) id 기준 중복 제거
    const byId = new Map();
    for (const d of [...docsA, ...docsB]) {
      if (!byId.has(d.id)) byId.set(d.id, d);
    }
    const merged = [...byId.values()];

    // 2) groupId로 묶기
    const map = new Map();
    merged.forEach((doc) => {
      const gid = doc.groupId || doc.id;
      if (!map.has(gid)) map.set(gid, []);
      map.get(gid).push(doc);
    });

    const out = [];
    for (const [gid, items] of map) {
      const statuses = items.map((i) => i.status).filter(Boolean);
      const repStatus =
        statuses.sort(
          (a, b) => STATUS_PRIORITY.indexOf(a ?? 'requested') - STATUS_PRIORITY.indexOf(b ?? 'requested')
        )[0] || 'requested';

      const createdNs = items
        .map((i) => toJSDate(i.createdAt)?.getTime?.())
        .filter((n) => Number.isFinite(n));
      const updatedNs = items
        .map((i) => toJSDate(i.updatedAt)?.getTime?.())
        .filter((n) => Number.isFinite(n));

      const createdAt = createdNs.length ? new Date(Math.min(...createdNs)) : null;
      const updatedAt = updatedNs.length ? new Date(Math.max(...updatedNs)) : null;

      const any = items[0] || {};
      const visitDate = any.visitDate || '';
      const visitTime = any.visitTime || '';
      const scheduledAt = toJSDate(any.scheduledAt) ?? null;

      const latestByUpdate =
        items
          .slice()
          .sort(
            (a, b) => (toJSDate(b.updatedAt)?.getTime?.() ?? 0) - (toJSDate(a.updatedAt)?.getTime?.() ?? 0)
          )[0] || {};

      // 이메일은 문서에 없을 수 있으므로, 회원가입 Auth 이메일로 폴백
      const requester = {
        name: latestByUpdate.name || latestByUpdate.requesterName || user?.displayName || '-',
        phone: latestByUpdate.phone || '-',     // 전화/주소는 문서 값 우선
        address: latestByUpdate.address || '-',
        email: latestByUpdate.email || user?.email || '-', // 폴백
      };

      const enrichedItems = items.map((it) => {
        // 저장된 최종 교환중량(finalWeight, g)만 사용
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

      // 최신 barsPlan 보유 문서
      const planDoc = items
        .filter((i) => i.barsPlan)
        .sort(
          (a, b) => (toJSDate(b.updatedAt)?.getTime?.() ?? 0) - (toJSDate(a.updatedAt)?.getTime?.() ?? 0)
        )[0] || null;

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

    out.sort((a, b) => {
      const at = a.updatedAt && isValid(a.updatedAt) ? a.updatedAt.getTime() : 0;
      const bt = b.updatedAt && isValid(b.updatedAt) ? b.updatedAt.getTime() : 0;
      return bt - at;
    });

    return out;
  }, [docsA, docsB, user?.displayName, user?.email]);

  // 최신 1개만 기본 펼침
  useEffect(() => {
    if (groups.length === 0) return;
    setExpanded((prev) => {
      if (Object.keys(prev).length) return prev; // 사용자가 이미 토글했으면 유지
      return { [groups[0].groupId]: true };
    });
  }, [groups]);

  const toggle = (gid) => setExpanded((p) => ({ ...p, [gid]: !p[gid] }));

  // 필터링
  const groupsFiltered = useMemo(() => {
    if (statusFilter === 'all') return groups;
    if (statusFilter === 'active') {
      return groups.filter(g => ['requested','in_progress','교환중'].includes(g.repStatus));
    }
    return groups.filter(g => g.repStatus === statusFilter);
  }, [groups, statusFilter]);

  // 필터별 카운트
  const counts = useMemo(() => {
    const base = { all: groups.length, active: 0, scheduled: 0, completed: 0, rejected: 0 };
    for (const g of groups) {
      if (['requested','in_progress','교환중'].includes(g.repStatus)) base.active += 1;
      if (g.repStatus === 'scheduled') base.scheduled += 1;
      if (g.repStatus === 'completed') base.completed += 1;
      if (g.repStatus === 'rejected') base.rejected += 1;
    }
    return base;
  }, [groups]);

  /* ── 렌더 ───────────────────────────────────── */
  if (!user) return <Page><Empty>로그인이 필요합니다.</Empty></Page>;
  if (loading) return (
    <Page>
      <SectionTitle>나의 금 교환 내역</SectionTitle>
      <FilterBar>
        {Object.entries(FILTER_LABEL).map(([key, label]) => (
          <FilterChip key={key} disabled>{label}</FilterChip>
        ))}
      </FilterBar>
      <CardGrid>
        <Skeleton />
        <Skeleton />
      </CardGrid>
    </Page>
  );
  if (err) return <Page><Empty style={{ color: '#ef4444' }}>{err}</Empty></Page>;
  if (groups.length === 0) return <Page><Empty>등록된 교환 요청이 없습니다.</Empty></Page>;

  return (
    <Page>
      <SectionTitle>나의 금 교환 내역</SectionTitle>

      <FilterBar role="tablist" aria-label="상태 필터">
        {Object.entries(FILTER_LABEL).map(([key, label]) => (
          <FilterChip
            key={key}
            $active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            role="tab"
            aria-selected={statusFilter === key}
          >
            {label}
            <Count>{counts[key] ?? 0}</Count>
          </FilterChip>
        ))}
      </FilterBar>

      <CardGrid>
        {groupsFiltered.map((g) => {
          const statusKey = g.repStatus === '교환중' ? 'in_progress' : g.repStatus;
          const visitLine =
            g.scheduledAt && isValid(g.scheduledAt)
              ? fmt(g.scheduledAt)
              : [g.visitDate, g.visitTime].filter(Boolean).join(' ') || '-';

          return (
            <Card key={g.groupId}>
              <CardHeader
                onClick={() => toggle(g.groupId)}
                aria-expanded={!!expanded[g.groupId]}
                aria-controls={`panel-${g.groupId}`}
                title={`요청일 ${fmt(g.createdAt)} · 업데이트 ${fmt(g.updatedAt)} · 예약 ${visitLine}`}
              >
                <HeaderLeft>
                  <HLabel>요청일</HLabel>
                  <HValue>{fmt(g.createdAt)}</HValue>
                  <HLabel>업데이트</HLabel>
                  <HValue>{fmt(g.updatedAt)}</HValue>
                  <HLabel>예약</HLabel>
                  <HValue>{visitLine}</HValue>
                </HeaderLeft>
                <HeaderRight>
                  <Chips>
                    <Chip $tone="grams">{fmtG3(g.totalG)} g</Chip>
                    <Chip $tone="don">{fmtD2((g.totalG || 0) / DON_TO_GRAMS)} 돈</Chip>
                  </Chips>
                  <StatusBadge $status={statusKey}>
                    {STATUS_LABEL[g.repStatus] || STATUS_LABEL[statusKey] || g.repStatus}
                  </StatusBadge>
                  <Chev $open={!!expanded[g.groupId]}>▾</Chev>
                </HeaderRight>
              </CardHeader>

              {expanded[g.groupId] && (
                <CardBody id={`panel-${g.groupId}`}>
                  {/* 예약/요청자 정보 */}
                  <MetaGrid>
                    <Field><Label>요청 그룹</Label><Value>{g.groupId}</Value></Field>
                    <Field><Label>요청자</Label><Value>{g.requester.name}</Value></Field>
                    <Field><Label>전화</Label><Value>{g.requester.phone}</Value></Field>
                    <Field><Label>주소</Label><Value>{g.requester.address}</Value></Field>
                    <Field><Label>이메일</Label><Value>{g.requester.email}</Value></Field>
                  </MetaGrid>

                  <Divider />

                  {/* 제품 리스트 */}
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
                          .sort(
                            (a, b) => (toJSDate(a.createdAt)?.getTime?.() ?? 0) - (toJSDate(b.createdAt)?.getTime?.() ?? 0)
                          )
                          .map((it) => (
                            <tr key={it.id}>
                              <td>{it.goldType || '-'}</td>
                              <td>{it._displayOriginal}</td>
                              <td data-col="exchangeType">
                                {it.unknown ? '현장 확인' : (it.exchangeType || '999.9골드바')}
                              </td>
                              <td data-col="status">{STATUS_LABEL[it.status] || it.status || '-'}</td>
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
                    <Help>교환 중량 및 합계는 <strong>입력하신 값</strong>이 계산되어 저장된 값을 그대로 표시합니다.</Help>
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
                            {Number(g.plan.leftoverGrams) > 0 ? ' · 남은 금은 매입 가능합니다.' : ''}
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
                </CardBody>
              )}
            </Card>
          );
        })}
      </CardGrid>
    </Page>
  );
}
