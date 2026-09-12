// src/components/admin/ExchangeList.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useSearchParams } from "react-router-dom";
import { db, functions } from "@/firebase/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import {
  fetchAdminExchangeGroup,
  fetchAdminExchangeGroupItems,
  fetchAdminExchangeGroupsPage,
  fetchAdminProfile,
} from "@/services/adminExchangeService";

const PAGE_SIZE = 20;
const DON_TO_GRAMS = 3.75;

const STATUS_LABEL = {
  requested: "예약 확인 대기",
  scheduled: "예약 확정",
  in_progress: "진행 중",
  completed: "완료",
  rejected: "거절",
  canceled: "취소",
  교환중: "진행 중",
};

const displayReservationStatus = (status, scheduleChangeType = "") => {
  const normalized = status === "교환중" ? "in_progress" : String(status || "requested");
  if (normalized === "requested" && scheduleChangeType === "rescheduled") {
    return "일정 변경 확인 대기";
  }
  if (normalized === "scheduled" && scheduleChangeType === "rescheduled") {
    return "변경 예약 확정";
  }
  return STATUS_LABEL[normalized] || normalized;
};

const PageWrap = styled.div`
  display: grid;
  gap: 10px;
  font-size: 0.9rem;

  @media (max-width: 520px) {
    font-size: 0.92rem;
  }
`;

const StickyToolbar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(280px, 400px) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 780px) {
    position: static;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Input = styled.input`
  width: 100%;
  min-width: 0;
  min-height: 38px;
  padding: 7px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.84rem;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const ToolbarButton = styled.button`
  min-height: 38px;
  padding: 7px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.82rem;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

const Summary = styled.span`
  justify-self: end;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  line-height: 1.35;
  text-align: right;
  white-space: nowrap;

  @media (max-width: 780px) {
    grid-column: 1 / -1;
    justify-self: start;
    text-align: left;
  }
`;

const ErrorBox = styled.p`
  margin: 0;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
`;

const TodayPanel = styled.section`
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const TodayPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;

  > div {
    display: grid;
    gap: 2px;
  }

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 1rem;
    font-weight: 900;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.78rem;
  }
`;

const TodayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
`;

const TodayCard = styled.article`
  display: grid;
  gap: 8px;
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background};
`;

const TodayTime = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 1.05rem;
  font-weight: 900;
`;

const TodayMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
  }
`;

const TodayEmpty = styled.p`
  margin: 0;
  padding: 8px 2px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.84rem;
`;

const GroupCard = styled.article`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const GroupHeader = styled.button`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 0;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const HeaderInfo = styled.div`
  display: grid;
  grid-template-columns: 6.3em minmax(0, 1fr);
  gap: 2px 8px;
  min-width: 0;
  line-height: 1.35;

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.75rem;
    font-weight: 650;
  }

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.92rem;
    font-weight: 820;
  }

  span {
    min-width: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;

const StatusBadge = styled.span`
  padding: 3px 7px;
  border-radius: 999px;
  background: ${({ $status, theme }) => {
    if ($status === "requested") return theme.colors.warning;
    if ($status === "scheduled") return theme.colors.success;
    if ($status === "in_progress") return theme.colors.info;
    if ($status === "completed") return theme.colors.secondary;
    if ($status === "rejected") return theme.colors.error;
    return theme.colors.gray;
  }};
  color: ${({ $status, theme }) => ($status === "requested" ? theme.on.warning : theme.on.primary)};
  font-size: 0.75rem;
  font-weight: 850;
`;

const Chip = styled.span`
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.76rem;
  font-weight: 800;
`;

const GroupBody = styled.div`
  display: grid;
  gap: 10px;
  padding: 11px 12px 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  grid-template-columns: 6.2em minmax(0, 1fr);
  gap: 6px;
  align-items: baseline;
  line-height: 1.4;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.81rem;
    font-weight: 800;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.84rem;
    word-break: break-word;
  }
`;

const PhoneLink = styled.a`
  color: ${({ theme }) => theme.colors.link};
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const TotalSummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.82rem;

  strong {
    margin-right: 2px;
    font-size: 0.84rem;
    font-weight: 850;
  }

  @media (max-width: 520px) {
    justify-content: flex-start;
  }
`;

const ItemsTable = styled.table`
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;

  th,
  td {
    padding: 7px 9px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    text-align: left;
    vertical-align: top;
  }

  th {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.79rem;
    font-weight: 800;
    white-space: nowrap;
  }

  td {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
    line-height: 1.4;
  }
`;

const NoticeCard = styled.section`
  display: grid;
  gap: 6px;
  padding: 12px;
  border-left: 4px solid ${({ $danger, theme }) =>
    $danger ? theme.colors.error : theme.colors.warning};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  p {
    margin: 0;
  }
`;

const BonusCard = styled.section`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 12px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
`;

const BonusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const BonusField = styled.label`
  display: grid;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .86rem;
  font-weight: 750;
`;

const BonusInput = styled.input`
  min-height: 44px;
  padding: 9px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const PlanCard = styled.section`
  display: grid;
  gap: 7px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const OverviewGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const OverviewCard = styled.div`
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ $accent, theme }) =>
    $accent ? theme.semantic.badgeGoldBg : theme.colors.surfaceAlt};
`;

const OverviewLabel = styled.div`
  margin-bottom: 5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.75rem;
  font-weight: 800;
`;

const OverviewValue = styled.div`
  overflow-wrap: anywhere;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.35;
`;

const OverviewSub = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.76rem;
  line-height: 1.4;
`;

const SectionTitle = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.86rem;
  font-weight: 900;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ActionButton = styled.button`
  min-height: 38px;
  padding: 7px 11px;
  border: 0;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

const LoadMoreWrap = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 0 24px;
`;

function fmt(value) {
  try {
    if (!value) return "-";
    const date =
      typeof value.toDate === "function" ? value.toDate() : new Date(value);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function roundTo3(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const sign = number < 0 ? -1 : 1;
  const absolute = Math.abs(number);
  const times10000 = Math.floor(absolute * 10000 + 1e-8);
  let thousandths = Math.floor(times10000 / 10);
  if (times10000 % 10 >= 7) thousandths += 1;
  return sign * (thousandths / 1000);
}

function gramsText(value) {
  return `${roundTo3(value).toFixed(3)}g`;
}

function donText(value) {
  return `${(Number(value || 0) / DON_TO_GRAMS).toFixed(2)}돈`;
}

function originalQuantityText(item) {
  const original = Number(item.originalQuantity);
  const grams = Number(item.quantity || 0);

  if (Number.isFinite(original) && item.inputUnit === "don") {
    return `${roundTo3(original * DON_TO_GRAMS).toFixed(3)}g (${original.toFixed(2)}돈)`;
  }
  if (Number.isFinite(original) && item.inputUnit === "g") {
    return `${roundTo3(original).toFixed(3)}g (${(original / DON_TO_GRAMS).toFixed(2)}돈)`;
  }
  return `${roundTo3(grams).toFixed(3)}g (${(grams / DON_TO_GRAMS).toFixed(2)}돈)`;
}

function normalizeStatus(value) {
  return value === "교환중" ? "in_progress" : String(value || "requested");
}

function matchesStatusFilter(status, filter) {
  const normalized = normalizeStatus(status);
  if (!filter) return true;
  if (filter === "active") return ["scheduled", "in_progress"].includes(normalized);
  return normalized === filter;
}

function latestItem(items) {
  return [...items].sort((a, b) => {
    const aTime = a.updatedAt?.toDate?.()?.getTime?.() || new Date(a.updatedAt || 0).getTime();
    const bTime = b.updatedAt?.toDate?.()?.getTime?.() || new Date(b.updatedAt || 0).getTime();
    return bTime - aTime;
  })[0] || {};
}

function seoulDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const TODAY_ACTIVE_STATUSES = new Set(["requested", "scheduled", "in_progress"]);

export default function ExchangeList() {
  const [searchParams] = useSearchParams();
  const statusFilter = String(searchParams.get("status") || "").trim();
  const focusGroupId = String(searchParams.get("groupId") || "").trim();

  const [groups, setGroups] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [qText, setQText] = useState("");
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [profiles, setProfiles] = useState({});
  const [busy, setBusy] = useState({});
  const [bonusForms, setBonusForms] = useState({});
  const [error, setError] = useState("");
  const [todayReservations, setTodayReservations] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState("");
  const [todayKey, setTodayKey] = useState(() => seoulDateKey());

  const loadTodayReservations = useCallback(async (silent = false) => {
    if (!silent) setTodayLoading(true);
    setTodayError("");

    try {
      const currentTodayKey = seoulDateKey();
      setTodayKey(currentTodayKey);
      const snapshot = await getDocs(
        query(
          collection(db, "goldExchangeGroups"),
          where("visitDate", "==", currentTodayKey)
        )
      );

      const activeGroups = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .filter((group) => TODAY_ACTIVE_STATUSES.has(normalizeStatus(group.repStatus)));

      const rows = await Promise.all(
        activeGroups.map(async (group) => {
          const items = await fetchAdminExchangeGroupItems(group.id).catch(() => []);
          const latest = latestItem(items);
          const totalG = Number(
            group.totalG ??
              items.reduce((sum, item) => sum + Number(item.finalWeight || 0), 0)
          );

          return {
            ...group,
            repStatus: normalizeStatus(group.repStatus),
            name: latest.name || latest.requesterName || "이름 확인",
            phone: latest.phone || "",
            totalG,
            scheduleChangeType: String(group.scheduleChangeType || latest.scheduleChangeType || ""),
          };
        })
      );

      rows.sort((a, b) =>
        String(a.visitTime || "99:99").localeCompare(String(b.visitTime || "99:99"))
      );
      setTodayReservations(rows);
    } catch (todayLoadError) {
      console.error("[ExchangeList] today reservations failed:", todayLoadError);
      setTodayError("오늘 예약을 불러오지 못했습니다.");
    } finally {
      if (!silent) setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayReservations();

    const currentTodayKey = seoulDateKey();
    const liveTodayQuery = query(
      collection(db, "goldExchangeGroups"),
      where("visitDate", "==", currentTodayKey)
    );
    const unsubscribe = onSnapshot(
      liveTodayQuery,
      () => loadTodayReservations(true),
      (snapshotError) => {
        console.warn("[ExchangeList] today live subscribe failed:", snapshotError);
      }
    );

    // 실시간 구독이 일시적으로 끊기는 상황을 대비한 보조 재조회
    const timer = window.setInterval(() => loadTodayReservations(true), 5 * 60_000);
    return () => {
      unsubscribe?.();
      window.clearInterval(timer);
    };
  }, [loadTodayReservations]);

  const loadFirst = useCallback(async () => {
    setLoadingFirst(true);
    setError("");

    try {
      const result = await fetchAdminExchangeGroupsPage({
        status: statusFilter,
        pageSize: PAGE_SIZE,
      });

      let nextGroups = result.groups;

      if (
        focusGroupId &&
        !nextGroups.some((group) => group.id === focusGroupId)
      ) {
        const focused = await fetchAdminExchangeGroup(focusGroupId);
        if (focused) nextGroups = [focused, ...nextGroups];
      }

      setGroups(nextGroups);
      setCursor(result.cursor);
      setHasMore(result.hasMore);

      if (focusGroupId) {
        setExpanded((current) => ({ ...current, [focusGroupId]: true }));
      }
    } catch (loadError) {
      console.error("[ExchangeList] group load failed:", loadError);
      setError(
        loadError?.message ||
          "금교환 그룹 목록을 불러오지 못했습니다."
      );
      setGroups([]);
    } finally {
      setLoadingFirst(false);
    }
  }, [focusGroupId, statusFilter]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  // 관리자 목록의 첫 페이지는 Firestore 실시간 구독으로 유지합니다.
  // 고객의 일정 변경/취소가 발생해도 알림이나 새로고침 없이 즉시 반영됩니다.
  useEffect(() => {
    const constraints = [];
    if (statusFilter === "active") {
      constraints.push(where("repStatus", "in", ["scheduled", "in_progress"]));
    } else if (
      ["requested", "scheduled", "in_progress", "completed", "rejected", "canceled"].includes(
        statusFilter
      )
    ) {
      constraints.push(where("repStatus", "==", statusFilter));
    }
    constraints.push(orderBy("updatedAt", "desc"));
    constraints.push(limit(PAGE_SIZE));

    const liveQuery = query(collection(db, "goldExchangeGroups"), ...constraints);
    const unsubscribe = onSnapshot(
      liveQuery,
      (snapshot) => {
        setGroups((current) => {
          const merged = new Map(current.map((group) => [group.id, group]));

          snapshot.docChanges().forEach((change) => {
            const row = { id: change.doc.id, ...change.doc.data() };
            if (change.type === "removed") {
              merged.delete(row.id);
            } else {
              merged.set(row.id, row);
            }
          });

          if (focusGroupId && !merged.has(focusGroupId)) {
            // 포커스 그룹은 아래 loadFirst/fetchAdminExchangeGroup 경로가 다시 보완합니다.
          }

          return Array.from(merged.values()).sort((a, b) => {
            const aTime =
              a.updatedAt?.toDate?.()?.getTime?.() ||
              new Date(a.updatedAt || 0).getTime() ||
              0;
            const bTime =
              b.updatedAt?.toDate?.()?.getTime?.() ||
              new Date(b.updatedAt || 0).getTime() ||
              0;
            return bTime - aTime;
          });
        });

        // 이미 펼쳐 본 상세 데이터도 대표 상태/일정 변경 정보를 즉시 맞춥니다.
        if (snapshot.docChanges().length > 0) {
          setDetails((current) => {
            let didChange = false;
            const next = { ...current };

            snapshot.docChanges().forEach((change) => {
              if (change.type === "removed") return;
              const row = { id: change.doc.id, ...change.doc.data() };
              const detail = current[row.id];
              if (!detail?.items?.length) return;

              didChange = true;
              next[row.id] = {
                ...detail,
                items: detail.items.map((item) => ({
                  ...item,
                  status: normalizeStatus(row.repStatus || item.status),
                  visitDate: row.visitDate || item.visitDate,
                  visitTime: row.visitTime || item.visitTime,
                  scheduleChangeType:
                    row.scheduleChangeType ?? item.scheduleChangeType,
                  previousVisitDate:
                    row.previousVisitDate ?? item.previousVisitDate,
                  previousVisitTime:
                    row.previousVisitTime ?? item.previousVisitTime,
                  scheduleChangeReason:
                    row.scheduleChangeReason ?? item.scheduleChangeReason,
                  cancellationReason:
                    row.cancellationReason ?? item.cancellationReason,
                  scheduleChangeRequestedAt:
                    row.scheduleChangeRequestedAt ?? item.scheduleChangeRequestedAt,
                  cancellationRequestedAt:
                    row.cancellationRequestedAt ?? item.cancellationRequestedAt,
                  updatedAt: row.updatedAt || item.updatedAt,
                })),
              };
            });

            return didChange ? next : current;
          });
        }
      },
      (snapshotError) => {
        console.warn("[ExchangeList] live group subscribe failed:", snapshotError);
      }
    );

    return () => unsubscribe?.();
  }, [focusGroupId, statusFilter]);

  const loadMore = async () => {
    if (!cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    setError("");

    try {
      const result = await fetchAdminExchangeGroupsPage({
        status: statusFilter,
        cursor,
        pageSize: PAGE_SIZE,
      });

      setGroups((current) => {
        const merged = new Map(current.map((group) => [group.id, group]));
        result.groups.forEach((group) => merged.set(group.id, group));
        return Array.from(merged.values());
      });
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (loadError) {
      console.error("[ExchangeList] more groups failed:", loadError);
      setError("추가 금교환 그룹을 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  };

  const ensureDetails = useCallback(
    async (groupId) => {
      if (!groupId || details[groupId]?.loaded || details[groupId]?.loading) {
        return;
      }

      setDetails((current) => ({
        ...current,
        [groupId]: {
          ...(current[groupId] || {}),
          loading: true,
          error: "",
        },
      }));

      try {
        const items = await fetchAdminExchangeGroupItems(groupId);
        const latest = latestItem(items);
        const uid = String(latest.userId || items.find((item) => item.userId)?.userId || "");

        let profile = uid ? profiles[uid] : null;
        if (uid && profile === undefined) {
          profile = await fetchAdminProfile(uid).catch(() => null);
          setProfiles((current) => ({ ...current, [uid]: profile }));
        }

        setDetails((current) => ({
          ...current,
          [groupId]: {
            loaded: true,
            loading: false,
            error: "",
            items,
            profile,
          },
        }));
      } catch (detailError) {
        console.error("[ExchangeList] details failed:", detailError);
        setDetails((current) => ({
          ...current,
          [groupId]: {
            loaded: false,
            loading: false,
            error: "상세 정보를 불러오지 못했습니다.",
            items: [],
          },
        }));
      }
    },
    [details, profiles]
  );

  useEffect(() => {
    if (focusGroupId) ensureDetails(focusGroupId);
  }, [ensureDetails, focusGroupId]);

  const toggleGroup = async (groupId) => {
    const willOpen = !expanded[groupId];
    setExpanded((current) => ({ ...current, [groupId]: willOpen }));
    if (willOpen) await ensureDetails(groupId);
  };

  const filteredGroups = useMemo(() => {
    const term = qText.trim().toLowerCase();
    if (!term) return groups;

    return groups.filter((group) => {
      const detail = details[group.id];
      const items = detail?.items || [];
      const latest = latestItem(items);
      const profile = detail?.profile || {};
      const values = [
        group.id,
        group.visitDate,
        group.visitTime,
        group.repStatus,
        latest.name,
        latest.phone,
        latest.userId,
        profile.displayName,
        profile.phone,
        ...items.flatMap((item) => [
          item.id,
          item.goldType,
          item.exchangeType,
          item.status,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(term);
    });
  }, [details, groups, qText]);

  const updateGroupStatus = async (groupId, status) => {
    if (!groupId || !status || busy[groupId]) return;

    setBusy((current) => ({ ...current, [groupId]: true }));
    try {
      const call = httpsCallable(functions, "setExchangeGroupStatus");
      const response = await call({ groupId, status });
      if (!response?.data?.ok) throw new Error("상태 변경 결과를 확인할 수 없습니다.");

      setGroups((current) => {
        const updated = current.map((group) =>
          group.id === groupId
            ? { ...group, repStatus: status, updatedAt: new Date() }
            : group
        );
        if (focusGroupId === groupId || matchesStatusFilter(status, statusFilter)) {
          return updated;
        }
        return updated.filter((group) => group.id !== groupId);
      });
      setDetails((current) => {
        const detail = current[groupId];
        if (!detail?.items) return current;
        return {
          ...current,
          [groupId]: {
            ...detail,
            items: detail.items.map((item) => ({ ...item, status })),
          },
        };
      });
      setTodayReservations((current) =>
        current
          .map((row) =>
            row.id === groupId ? { ...row, repStatus: normalizeStatus(status) } : row
          )
          .filter((row) => TODAY_ACTIVE_STATUSES.has(normalizeStatus(row.repStatus)))
      );
    } catch (statusError) {
      console.error("[ExchangeList] status update failed:", statusError);
      alert(
        statusError?.message?.replace(/^FirebaseError:\s*/i, "") ||
          "그룹 상태 변경에 실패했습니다."
      );
    } finally {
      setBusy((current) => ({ ...current, [groupId]: false }));
    }
  };

  const updateBonusForm = (groupId, field, value) => {
    setBonusForms((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] || {}),
        [field]: value,
      },
    }));
  };

  const confirmBonusUsage = async (group, totalG) => {
    const form = bonusForms[group.id] || {};
    const code = String(form.requestCode || "").replace(/\D/g, "").slice(0, 6);
    const finalRecognizedG = Number(form.finalRecognizedG ?? totalG);
    const amountG = Number(group.bonusGoldRequestedG || 0);

    if (code.length !== 6) {
      alert("고객의 6자리 확인 코드를 입력해 주세요.");
      return;
    }
    if (!Number.isFinite(finalRecognizedG) || finalRecognizedG <= 0) {
      alert("현장에서 확인한 인정 순금 중량을 입력해 주세요.");
      return;
    }
    if (
      !window.confirm(
        `현장 인정 ${finalRecognizedG.toFixed(3)}g에 적립 순금 ${amountG.toFixed(2)}g을 사용 확정할까요?`
      )
    ) {
      return;
    }

    setBusy((current) => ({ ...current, [group.id]: true }));
    try {
      const call = httpsCallable(functions, "bonusAdminConfirmGoldUsage");
      const response = await call({
        groupId: group.id,
        requestCode: code,
        finalRecognizedG,
      });
      const result = response?.data || {};
      if (!result.ok) throw new Error("적립 순금 사용 확정 실패");

      setGroups((current) =>
        current.map((item) =>
          item.id === group.id
            ? {
                ...item,
                bonusGoldUsageStatus: "used",
                bonusGoldUsedG: Number(result.amountG || amountG),
                finalRecognizedG: Number(
                  result.finalRecognizedG || finalRecognizedG
                ),
                finalAppliedG: Number(result.finalAppliedG || 0),
                ...(result.barsPlan
                  ? { barsPlan: result.barsPlan }
                  : {}),
              }
            : item
        )
      );

      if (result.barsPlan) {
        setDetails((current) => {
          const detail = current[group.id];
          if (!detail?.items) return current;

          return {
            ...current,
            [group.id]: {
              ...detail,
              items: detail.items.map((item) => ({
                ...item,
                barsPlan: result.barsPlan,
                bonusGoldUsageStatus: "used",
                bonusGoldUsedG: Number(
                  result.amountG || amountG
                ),
                finalRecognizedG: Number(
                  result.finalRecognizedG ||
                    finalRecognizedG
                ),
                finalAppliedG: Number(
                  result.finalAppliedG || 0
                ),
              })),
            },
          };
        });
      }
    } catch (bonusError) {
      console.error("[ExchangeList] bonus confirm failed:", bonusError);
      alert(bonusError?.message || "적립 순금 사용을 확정하지 못했습니다.");
    } finally {
      setBusy((current) => ({ ...current, [group.id]: false }));
    }
  };

  const cancelBonusUsage = async (groupId) => {
    if (!window.confirm("적립 순금 사용 신청을 취소할까요?")) return;

    setBusy((current) => ({ ...current, [groupId]: true }));
    try {
      const call = httpsCallable(functions, "bonusAdminCancelGoldUsage");
      const response = await call({
        groupId,
        reason: "매장 확인 중 신청 취소",
      });
      if (!response?.data?.ok) throw new Error("사용 신청 취소 실패");

      setGroups((current) =>
        current.map((group) =>
          group.id === groupId
            ? { ...group, bonusGoldUsageStatus: "canceled" }
            : group
        )
      );
    } catch (bonusError) {
      console.error("[ExchangeList] bonus cancel failed:", bonusError);
      alert(bonusError?.message || "적립 순금 사용 신청을 취소하지 못했습니다.");
    } finally {
      setBusy((current) => ({ ...current, [groupId]: false }));
    }
  };

  const todayCounts = useMemo(() => {
    const counts = { requested: 0, scheduled: 0, in_progress: 0, rescheduled: 0 };
    todayReservations.forEach((reservation) => {
      const status = normalizeStatus(reservation.repStatus);
      if (status in counts) counts[status] += 1;
      if (status === "requested" && reservation.scheduleChangeType === "rescheduled") {
        counts.rescheduled += 1;
      }
    });
    return counts;
  }, [todayReservations]);

  if (loadingFirst) {
    return <p>금교환 그룹을 불러오는 중…</p>;
  }

  return (
    <PageWrap>
      <TodayPanel aria-label="오늘 금교환 예약">
        <TodayPanelHeader>
          <div>
            <strong>오늘 예약 · {todayReservations.length}건</strong>
            <span>
              {todayKey} · 확인 대기 {todayCounts.requested} · 확정 {todayCounts.scheduled} · 진행 {todayCounts.in_progress}
              {todayCounts.rescheduled > 0 ? ` · 변경 확인 ${todayCounts.rescheduled}` : ""}
            </span>
          </div>
          <ToolbarButton
            type="button"
            onClick={() => loadTodayReservations()}
            disabled={todayLoading}
          >
            오늘 예약 새로고침
          </ToolbarButton>
        </TodayPanelHeader>

        {todayLoading ? (
          <TodayEmpty>오늘 예약을 불러오는 중…</TodayEmpty>
        ) : todayError ? (
          <ErrorBox role="alert">{todayError}</ErrorBox>
        ) : todayReservations.length === 0 ? (
          <TodayEmpty>오늘 방문 예정인 금교환 예약이 없습니다.</TodayEmpty>
        ) : (
          <TodayGrid>
            {todayReservations.map((reservation) => {
              const status = normalizeStatus(reservation.repStatus);
              return (
                <TodayCard key={reservation.id}>
                  <TodayMeta>
                    <TodayTime>{reservation.visitTime || "시간 미정"}</TodayTime>
                    <StatusBadge $status={status}>
                      {displayReservationStatus(status, reservation.scheduleChangeType)}
                    </StatusBadge>
                  </TodayMeta>
                  <TodayMeta>
                    <span><strong>{reservation.name}</strong></span>
                    <span>{gramsText(reservation.totalG)}</span>
                  </TodayMeta>
                  <TodayMeta>
                    <span>전화</span>
                    <span>
                      {reservation.phone ? (
                        <PhoneLink href={`tel:${reservation.phone.replace(/\D/g, "")}`}>
                          {reservation.phone}
                        </PhoneLink>
                      ) : (
                        "미등록"
                      )}
                    </span>
                  </TodayMeta>
                </TodayCard>
              );
            })}
          </TodayGrid>
        )}
      </TodayPanel>

      <StickyToolbar>
        <Input
          value={qText}
          onChange={(event) => setQText(event.target.value)}
          placeholder="그룹번호·요청자·전화·제품 검색"
          aria-label="금교환 요청 검색"
        />
        <ToolbarButton
          type="button"
          onClick={() => {
            loadFirst();
            loadTodayReservations();
          }}
        >
          새로고침
        </ToolbarButton>
        <Summary>
          {statusFilter ? `필터 ${statusFilter} · ` : ""}
          표시 <strong>{filteredGroups.length}</strong>건 · 불러온 그룹{" "}
          <strong>{groups.length}</strong>건
        </Summary>
      </StickyToolbar>

      {error && <ErrorBox role="alert">{error}</ErrorBox>}

      {filteredGroups.length === 0 ? (
        <p>조건에 맞는 금교환 요청이 없습니다.</p>
      ) : (
        filteredGroups.map((group) => {
          const status = normalizeStatus(group.repStatus);
          const detail = details[group.id] || {};
          const items = detail.items || [];
          const latest = latestItem(items);
          const profile = detail.profile || {};
          const totalG = Number(
            group.totalG ??
              items.reduce((sum, item) => sum + Number(item.finalWeight || 0), 0)
          );
          const name =
            latest.name ||
            latest.requesterName ||
            profile.displayName ||
            "상세 정보 확인";
          const phone = latest.phone || profile.phone || "";
          const plan =
            group.barsPlan ||
            items.find((item) => item.barsPlan)?.barsPlan ||
            null;
          const scheduleType = String(group.scheduleChangeType || latest.scheduleChangeType || "");
          const schedulePreviousVisitDate = String(
            group.previousVisitDate || latest.previousVisitDate || ""
          );
          const schedulePreviousVisitTime = String(
            group.previousVisitTime || latest.previousVisitTime || ""
          );
          const scheduleReason = String(
            scheduleType === "canceled"
              ? (
                  group.cancellationReason ||
                  latest.cancellationReason ||
                  ""
                )
              : (
                  group.scheduleChangeReason ||
                  latest.scheduleChangeReason ||
                  ""
                )
          );
          const bonusStatus = String(group.bonusGoldUsageStatus || "");
          const bonusForm = bonusForms[group.id] || {};
          const disabled = !!busy[group.id];
          const isBonusUsed = bonusStatus === "used";
          const planBasisG = Number(
            isBonusUsed
              ? group.finalAppliedG ||
                  plan?.totalGrams ||
                  totalG
              : plan?.totalGrams || totalG
          );

          return (
            <GroupCard key={group.id}>
              <GroupHeader
                type="button"
                aria-expanded={!!expanded[group.id]}
                onClick={() => toggleGroup(group.id)}
              >
                <HeaderInfo>
                  <small>방문 일정</small>
                  <strong>
                    {[group.visitDate, group.visitTime].filter(Boolean).join(" ") || "미정"}
                  </strong>
                  <small>최근 업데이트</small>
                  <span>{fmt(group.updatedAt)}</span>
                  <small>그룹 번호</small>
                  <span>{group.id}</span>
                </HeaderInfo>

                <HeaderRight>
                  {bonusStatus === "requested" && (
                    <StatusBadge $status="requested">적립 사용 확인</StatusBadge>
                  )}
                  <Chip>{gramsText(totalG)}</Chip>
                  <Chip>{donText(totalG)}</Chip>
                  <StatusBadge $status={status}>
                    {displayReservationStatus(status, scheduleType)}
                  </StatusBadge>
                  <span aria-hidden>{expanded[group.id] ? "▲" : "▼"}</span>
                </HeaderRight>
              </GroupHeader>

              {expanded[group.id] && (
                <GroupBody>
                  {detail.loading && <p>상세 정보를 불러오는 중…</p>}
                  {detail.error && <ErrorBox>{detail.error}</ErrorBox>}

                  {detail.loaded && (
                    <>
                      <MetaGrid>
                        <Field>
                          <strong>요청자</strong>
                          <span>{name}</span>
                        </Field>
                        <Field>
                          <strong>회원 UID</strong>
                          <span>{latest.userId || "비식별/없음"}</span>
                        </Field>
                        <Field>
                          <strong>전화</strong>
                          <span>
                            {phone ? (
                              <PhoneLink href={`tel:${phone.replace(/\D/g, "")}`}>
                                {phone}
                              </PhoneLink>
                            ) : (
                              "미등록"
                            )}
                          </span>
                        </Field>
                      </MetaGrid>

                      {scheduleType && (
                        <NoticeCard $danger={scheduleType === "canceled"}>
                          <strong>
                            {scheduleType === "canceled"
                              ? "고객 예약 취소"
                              : status === "requested"
                                ? "일정 변경 확인 필요"
                                : status === "scheduled"
                                  ? "변경 예약 확정됨"
                                  : "최근 일정 변경"}
                          </strong>
                          <p>
                            이전: {schedulePreviousVisitDate || "-"}{" "}
                            {schedulePreviousVisitTime || ""}
                          </p>
                          {scheduleType !== "canceled" && (
                            <p>
                              변경: {latest.visitDate || "-"} {latest.visitTime || ""}
                            </p>
                          )}
                          {scheduleReason && (
                            <p>
                              사유: {scheduleReason}
                            </p>
                          )}
                        </NoticeCard>
                      )}

                      <SectionTitle>요청 핵심 요약</SectionTitle>
                      <OverviewGrid aria-label="금교환 요청 핵심 요약">
                        <OverviewCard $accent>
                          <OverviewLabel>예상 순금</OverviewLabel>
                          <OverviewValue>{gramsText(totalG)}</OverviewValue>
                          <OverviewSub>{donText(totalG)}</OverviewSub>
                        </OverviewCard>

                        <OverviewCard>
                          <OverviewLabel>선택 골드바</OverviewLabel>
                          <OverviewValue>
                            {plan?.selected?.label
                              ? `${plan.selected.label} × ${plan.selected.qty || 0}`
                              : "선택 정보 없음"}
                          </OverviewValue>
                          <OverviewSub>
                            {plan?.selected?.usedGrams != null
                              ? `총 ${gramsText(plan.selected.usedGrams)} / ${Number(
                                  plan.selected.usedDon || 0
                                ).toFixed(2)}돈`
                              : "고객 선택 계획을 확인하세요."}
                          </OverviewSub>
                        </OverviewCard>

                        <OverviewCard>
                          <OverviewLabel>추가 필요 / 잔여</OverviewLabel>
                          <OverviewValue>
                            {plan
                              ? plan.requiresTopUp || Number(plan.topUpGrams) > 0
                                ? `+${gramsText(plan.topUpGrams)}`
                                : gramsText(plan.leftoverGrams)
                              : "계획 없음"}
                          </OverviewValue>
                          <OverviewSub>
                            {plan
                              ? plan.requiresTopUp || Number(plan.topUpGrams) > 0
                                ? `추가 필요 · ${Number(plan.topUpDon || 0).toFixed(2)}돈`
                                : `예상 잔여 · ${Number(plan.leftoverDon || 0).toFixed(2)}돈`
                              : "현장 확인이 필요한 요청일 수 있습니다."}
                          </OverviewSub>
                        </OverviewCard>

                        <OverviewCard>
                          <OverviewLabel>예약 / 진행 상태</OverviewLabel>
                          <OverviewValue>{displayReservationStatus(status, scheduleType)}</OverviewValue>
                          <OverviewSub>
                            {[group.visitDate, group.visitTime].filter(Boolean).join(" ") ||
                              "방문 일정 미정"}
                          </OverviewSub>
                        </OverviewCard>
                      </OverviewGrid>

                      <SectionTitle>제품별 상세</SectionTitle>
                      <TableWrap>
                        <ItemsTable>
                          <thead>
                            <tr>
                              <th>제품 종류</th>
                              <th>요청 수량</th>
                              <th>교환 유형</th>
                              <th>상태</th>
                              <th>환산 중량</th>
                              <th>환산 기준</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.goldType || "-"}</td>
                                <td>{originalQuantityText(item)}</td>
                                <td>
                                  {item.unknown
                                    ? "현장 확인"
                                    : item.exchangeType || "999.9골드바"}
                                </td>
                                <td>
                                  {STATUS_LABEL[normalizeStatus(item.status)] ||
                                    item.status ||
                                    "-"}
                                </td>
                                <td>{gramsText(item.finalWeight)}</td>
                                <td>
                                  {Number.isFinite(Number(item.purityUsed))
                                    ? `${(Number(item.purityUsed) * 100).toFixed(2)}%`
                                    : "현장 확인"}
                                  {item.rateVersion ? ` · v${item.rateVersion}` : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </ItemsTable>
                      </TableWrap>

                      <TotalSummary aria-label="환산 중량 합계">
                        <strong>환산 중량 합계</strong>
                        <Chip>{gramsText(totalG)}</Chip>
                        <Chip>{donText(totalG)}</Chip>
                      </TotalSummary>

                      {plan && (
                        <PlanCard>
                          <strong>
                            {isBonusUsed
                              ? "최종 교환 계획"
                              : "예상 교환 계획"}
                          </strong>

                          {isBonusUsed ? (
                            <>
                              <span>
                                현장 인정 중량:{" "}
                                <strong>
                                  {gramsText(group.finalRecognizedG)}
                                </strong>
                              </span>
                              <span>
                                적립 순금:{" "}
                                <strong>
                                  +{gramsText(group.bonusGoldUsedG)}
                                </strong>
                              </span>
                              <span>
                                최종 적용 합계:{" "}
                                <strong>
                                  {gramsText(group.finalAppliedG)}
                                </strong>{" "}
                                /{" "}
                                {(
                                  Number(group.finalAppliedG || 0) /
                                  DON_TO_GRAMS
                                ).toFixed(2)}
                                돈
                              </span>
                            </>
                          ) : (
                            <span>
                              계산 기준: {gramsText(planBasisG)} /{" "}
                              {(planBasisG / DON_TO_GRAMS).toFixed(2)}돈
                            </span>
                          )}

                          <span>
                            선택 규격: {plan.selected?.label || "-"} ×{" "}
                            {plan.selected?.qty || 0}
                          </span>
                          <span>
                            골드바 총중량:{" "}
                            {gramsText(plan.selected?.usedGrams)} /{" "}
                            {Number(
                              plan.selected?.usedDon || 0
                            ).toFixed(2)}
                            돈
                          </span>
                          {plan.requiresTopUp || Number(plan.topUpGrams) > 0 ? (
                            <NoticeCard>
                              <p><strong>추가 교환 선택</strong></p>
                              <p>
                                고객 예상 순금: {gramsText(planBasisG)} / {(planBasisG / DON_TO_GRAMS).toFixed(2)}돈
                              </p>
                              <p>
                                추가 필요: <strong>+{gramsText(plan.topUpGrams)} / {Number(plan.topUpDon || 0).toFixed(2)}돈</strong>
                              </p>
                              <p>방문 시 실측 후 실제 추가량과 금액을 최종 안내하세요.</p>
                            </NoticeCard>
                          ) : (
                            <span>
                              {isBonusUsed ? "최종 잔여" : "예상 잔여"}:{" "}
                              {gramsText(plan.leftoverGrams)} /{" "}
                              {Number(
                                plan.leftoverDon || 0
                              ).toFixed(2)}
                              돈
                            </span>
                          )}
                          {Array.isArray(plan.autoBreakdown) &&
                            plan.autoBreakdown.length > 0 && (
                              <span>
                                추가 조합:{" "}
                                {plan.autoBreakdown
                                  .map(
                                    (item) =>
                                      `${item.label} × ${item.qty}`
                                  )
                                  .join(", ")}
                              </span>
                            )}
                        </PlanCard>
                      )}

                      {bonusStatus && (
                        <BonusCard>
                          <strong>
                            적립 순금 사용 ·{" "}
                            {bonusStatus === "requested"
                              ? "확인 대기"
                              : bonusStatus === "used"
                                ? "사용 완료"
                                : bonusStatus === "restored"
                                  ? "잔액 복구"
                                  : "신청 취소"}
                          </strong>

                          {bonusStatus === "requested" && (
                            <>
                              <BonusGrid>
                                <BonusField>
                                  신청 중량
                                  <BonusInput
                                    readOnly
                                    value={`${Number(
                                      group.bonusGoldRequestedG || 0
                                    ).toFixed(2)}g`}
                                  />
                                </BonusField>
                                <BonusField>
                                  고객 6자리 코드
                                  <BonusInput
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={bonusForm.requestCode || ""}
                                    onChange={(event) =>
                                      updateBonusForm(
                                        group.id,
                                        "requestCode",
                                        event.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, 6)
                                      )
                                    }
                                  />
                                </BonusField>
                                <BonusField>
                                  현장 인정 순금(g)
                                  <BonusInput
                                    inputMode="decimal"
                                    value={
                                      bonusForm.finalRecognizedG ??
                                      roundTo3(totalG).toFixed(3)
                                    }
                                    onChange={(event) =>
                                      updateBonusForm(
                                        group.id,
                                        "finalRecognizedG",
                                        event.target.value
                                      )
                                    }
                                  />
                                </BonusField>
                              </BonusGrid>
                              <ButtonGroup>
                                <ActionButton
                                  disabled={disabled}
                                  onClick={() =>
                                    confirmBonusUsage(group, totalG)
                                  }
                                >
                                  {disabled ? "처리 중…" : "사용 확정"}
                                </ActionButton>
                                <ActionButton
                                  disabled={disabled}
                                  onClick={() => cancelBonusUsage(group.id)}
                                >
                                  신청 취소
                                </ActionButton>
                              </ButtonGroup>
                            </>
                          )}

                          {bonusStatus === "used" && (
                            <span>
                              현장 인정{" "}
                              {Number(group.finalRecognizedG || 0).toFixed(3)}g +
                              적립{" "}
                              {Number(group.bonusGoldUsedG || 0).toFixed(2)}g =
                              최종{" "}
                              {Number(group.finalAppliedG || 0).toFixed(3)}g
                            </span>
                          )}
                        </BonusCard>
                      )}

                      <ButtonGroup>
                        {status === "requested" && (
                          <>
                            <ActionButton
                              disabled={disabled}
                              onClick={() =>
                                updateGroupStatus(group.id, "scheduled")
                              }
                            >
                              {scheduleType === "rescheduled" ? "변경 예약 확정" : "예약 확정"}
                            </ActionButton>
                            <ActionButton
                              disabled={disabled}
                              onClick={() =>
                                updateGroupStatus(group.id, "rejected")
                              }
                            >
                              {scheduleType === "rescheduled" ? "변경 요청 거절" : "거절"}
                            </ActionButton>
                          </>
                        )}

                        {status === "scheduled" && (
                          <>
                            <ActionButton
                              disabled={disabled}
                              onClick={() =>
                                updateGroupStatus(group.id, "in_progress")
                              }
                            >
                              진행 중
                            </ActionButton>
                            <ActionButton
                              disabled={disabled}
                              onClick={() =>
                                updateGroupStatus(group.id, "canceled")
                              }
                            >
                              취소
                            </ActionButton>
                          </>
                        )}

                        {status === "in_progress" && (
                          <>
                            <ActionButton
                              disabled={disabled}
                              onClick={() =>
                                updateGroupStatus(group.id, "completed")
                              }
                            >
                              완료
                            </ActionButton>
                            <ActionButton
                              disabled={disabled}
                              onClick={() =>
                                updateGroupStatus(group.id, "canceled")
                              }
                            >
                              취소
                            </ActionButton>
                          </>
                        )}

                        {status === "rejected" && (
                          <ActionButton
                            disabled={disabled}
                            onClick={() =>
                              updateGroupStatus(group.id, "requested")
                            }
                          >
                            요청으로 되돌리기
                          </ActionButton>
                        )}
                      </ButtonGroup>
                    </>
                  )}
                </GroupBody>
              )}
            </GroupCard>
          );
        })
      )}

      <LoadMoreWrap>
        <ToolbarButton
          type="button"
          disabled={!hasMore || loadingMore}
          onClick={loadMore}
        >
          {loadingMore
            ? "불러오는 중…"
            : hasMore
              ? "다음 20건 불러오기"
              : "더 이상 없음"}
        </ToolbarButton>
        <ToolbarButton
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          맨 위로
        </ToolbarButton>
      </LoadMoreWrap>
    </PageWrap>
  );
}