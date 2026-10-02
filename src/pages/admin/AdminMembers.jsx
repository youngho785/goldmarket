import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useAuthContext } from "@/context/AuthContext";
import {
  listAdminUsers,
  listAdminUserProfilesFallback,
  setAdminUserDisabled,
  setManagedUserRole,
} from "@/services/adminManagementService";

const Page = styled.section`display: grid; gap: 16px;`;
const Header = styled.header`
  h1 { margin: 0 0 6px; font-size: clamp(1.55rem, 3vw, 2.1rem); }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.55; }
`;
const Toolbar = styled.div`
  display: grid; grid-template-columns: minmax(220px, 1fr) minmax(170px, 220px) auto; gap: 10px;
  input, select {
    min-height: 43px; padding: 9px 12px;
    border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 10px;
    background: ${({ theme }) => theme.colors.surface}; color: ${({ theme }) => theme.colors.text};
  }
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;
const TableWrap = styled.div`overflow-x: auto; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 14px; background: ${({ theme }) => theme.colors.surface};`;
const Table = styled.table`
  width: 100%; min-width: 1120px; border-collapse: collapse;
  th, td { padding: 11px 12px; border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; text-align: left; vertical-align: middle; }
  th { background: ${({ theme }) => theme.colors.surfaceAlt}; font-size: .82rem; }
  td { font-size: .86rem; }
`;
const Badge = styled.span`
  display: inline-block; padding: 4px 8px; border-radius: 999px; font-weight: 800; font-size: .76rem;
  background: ${({ $danger, theme }) => $danger ? theme.semantic.alertErrorBg : theme.semantic.badgeInfoBg};
  color: ${({ $danger, theme }) => $danger ? theme.semantic.alertErrorText : theme.semantic.badgeInfoText};
`;
const Button = styled.button`
  min-height: 36px; padding: 6px 10px; margin: 2px; border: 1px solid ${({ theme }) => theme.colors.borderStrong}; border-radius: 8px;
  background: ${({ $danger, theme }) => $danger ? theme.semantic.alertErrorBg : theme.colors.surface}; color: ${({ $danger, theme }) => $danger ? theme.semantic.alertErrorText : theme.colors.text}; font-weight: 750; cursor: pointer;
  &:disabled { opacity: .45; cursor: not-allowed; }
`;
const Message = styled.p`margin: 0; padding: 11px 13px; border-radius: 10px; background: ${({ $error, theme }) => $error ? theme.semantic.alertErrorBg : theme.semantic.alertInfoBg}; color: ${({ $error, theme }) => $error ? theme.semantic.alertErrorText : theme.semantic.alertInfoText}; line-height: 1.5;`;
const VaultInfo = styled.div`
  display: grid;
  gap: 4px;
  min-width: 185px;
  strong { color: ${({ theme }) => theme.colors.text}; }
  span { color: ${({ theme }) => theme.colors.textSecondary}; }
  small { color: ${({ theme }) => theme.colors.textLight}; line-height: 1.45; }
`;

const formatDate = (value) => value ? new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-";
const formatBonusGold = (value) => `순금 ${Math.max(0, Number(value || 0)).toFixed(3)}g`;

function rewardSummary(rewards) {
  if (!rewards) return "적립 상세 확인 불가";
  return [
    `가입 ${rewards.welcome ? "✓" : "-"}`,
    `퀴즈 ${rewards.quiz ? "✓" : "-"}`,
    `알림 ${rewards.marketingPush ? "✓" : "-"}`,
  ].join(" · ");
}

export default function AdminMembers() {
  const { user: currentUser, isSuperAdmin } = useAuthContext();
  const [users, setUsers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState("");
  const [error, setError] = useState("");
  const [limitedMode, setLimitedMode] = useState(false);

  const load = async ({ append = false, pageToken = "" } = {}) => {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminUsers({ pageToken, pageSize: 50 });
      setUsers((current) => append ? [...current, ...(result.users || [])] : (result.users || []));
      setNextPageToken(result.nextPageToken || null);
      setLimitedMode(false);
    } catch (err) {
      const code = String(err?.code || "");
      const message = String(err?.message || "").toLowerCase();
      const serverFunctionUnavailable =
        ["functions/not-found", "functions/unimplemented"].includes(code) ||
        message.includes("function not found");
      if (!serverFunctionUnavailable || append) {
        setError(err?.message?.replace(/^FirebaseError:\s*/i, "") || "회원 목록을 불러오지 못했습니다.");
      } else {
        try {
          const fallback = await listAdminUserProfilesFallback();
          setUsers(fallback.users || []);
          setNextPageToken(null);
          setLimitedMode(true);
        } catch (fallbackError) {
          setError(fallbackError?.message || "회원 기본목록도 불러오지 못했습니다.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesTerm = !term || [item.email, item.displayName, item.phoneNumber, item.uid, item.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
      if (!matchesTerm) return false;
      if (filter === "vaultActive") return Number(item.vaultItemCount) > 0;
      if (filter === "vaultEmpty") return item.vaultItemCount === 0;
      if (filter === "bonusPositive") return Number(item.bonusGoldG) > 0;
      return true;
    });
  }, [filter, search, users]);

  const changeRole = async (item) => {
    const role = item.role === "admin" ? "user" : "admin";
    if (!window.confirm(`${item.email || item.uid} 계정을 ${role === "admin" ? "관리자" : "일반 회원"}로 변경할까요?`)) return;
    setBusyUid(item.uid);
    try {
      await setManagedUserRole(item.uid, role);
      setUsers((current) => current.map((user) => user.uid === item.uid ? { ...user, role } : user));
    } catch (err) {
      setError(err?.message?.replace(/^FirebaseError:\s*/i, "") || "역할 변경에 실패했습니다.");
    } finally { setBusyUid(""); }
  };

  const toggleDisabled = async (item) => {
    const next = !item.disabled;
    if (!window.confirm(`${item.email || item.uid} 계정을 ${next ? "정지" : "복구"}할까요?`)) return;
    setBusyUid(item.uid);
    try {
      await setAdminUserDisabled(item.uid, next);
      setUsers((current) => current.map((user) => user.uid === item.uid ? { ...user, disabled: next } : user));
    } catch (err) {
      setError(err?.message?.replace(/^FirebaseError:\s*/i, "") || "계정 상태 변경에 실패했습니다.");
    } finally { setBusyUid(""); }
  };

  return (
    <Page>
      <Header>
        <h1>회원·금고 관리</h1>
        <p>회원 계정과 나의 금 등록 여부, 한국골드마켓 적립 순금 현황을 확인합니다. 개인 금제품의 종류·중량·메모는 관리자 화면에 표시하지 않습니다.</p>
      </Header>
      {limitedMode && (
        <Message>
          서버 함수가 아직 배포되지 않아 회원 기본목록만 표시합니다. 나의 금 등록 수·적립 상세·이메일 인증·최근 로그인·계정 정지는 서버 함수 배포 후 정확히 확인할 수 있습니다.
        </Message>
      )}
      {!isSuperAdmin && <Message>회원 조회는 가능하지만 역할 변경과 계정 정지는 최고관리자만 할 수 있습니다.</Message>}
      {error && <Message $error role="alert">{error}</Message>}
      <Toolbar>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이메일·이름·전화번호·UID 검색" aria-label="회원 검색" />
        <select value={filter} onChange={(event) => setFilter(event.target.value)} disabled={limitedMode} aria-label="회원 상태 필터">
          <option value="all">전체 회원</option>
          <option value="vaultActive">나의 금 등록 회원</option>
          <option value="vaultEmpty">나의 금 미등록 회원</option>
          <option value="bonusPositive">적립 순금 보유 회원</option>
        </select>
        <Button type="button" onClick={() => load()} disabled={loading}>{loading ? "불러오는 중…" : "새로고침"}</Button>
      </Toolbar>
      <TableWrap>
        <Table>
          <thead><tr><th>회원</th><th>연락처</th><th>권한</th><th>인증/상태</th><th>나의 금고 / 적립</th><th>가입일</th><th>최근 로그인</th><th>관리</th></tr></thead>
          <tbody>
            {filtered.map((item) => {
              const protectedAccount = item.uid === currentUser?.uid || item.role === "superAdmin";
              const vaultCount = item.vaultItemCount;
              return (
                <tr key={item.uid}>
                  <td><strong>{item.displayName || "이름 미등록"}</strong><br /><small>{item.email || item.uid}</small></td>
                  <td>{item.phoneNumber || "미등록"}</td>
                  <td><Badge>{item.role === "superAdmin" ? "최고관리자" : item.role === "admin" ? "관리자" : item.role === "user" ? "회원" : "확인 불가"}</Badge></td>
                  <td>
                    <Badge $danger={item.disabled === true}>
                      {item.disabled === true
                        ? "정지"
                        : item.emailVerified === true
                          ? "이메일 인증"
                          : item.emailVerified === false
                            ? "미인증"
                            : "확인 불가"}
                    </Badge>
                  </td>
                  <td>
                    <VaultInfo>
                      <strong>{vaultCount == null ? "나의 금 확인 불가" : Number(vaultCount) > 0 ? `나의 금 ${Number(vaultCount).toLocaleString("ko-KR")}개` : "나의 금 미등록"}</strong>
                      <span>적립 {formatBonusGold(item.bonusGoldG)}</span>
                      <small>{rewardSummary(item.bonusRewards)}</small>
                    </VaultInfo>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{formatDate(item.lastSignInAt)}</td>
                  <td>
                    <Button type="button" disabled={limitedMode || !isSuperAdmin || protectedAccount || busyUid === item.uid} onClick={() => changeRole(item)}>{item.role === "admin" ? "관리자 해제" : "관리자 지정"}</Button>
                    <Button type="button" $danger={item.disabled === false} disabled={limitedMode || !isSuperAdmin || protectedAccount || busyUid === item.uid} onClick={() => toggleDisabled(item)}>{item.disabled ? "계정 복구" : "계정 정지"}</Button>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && <tr><td colSpan="8">조건에 맞는 회원이 없습니다.</td></tr>}
          </tbody>
        </Table>
      </TableWrap>
      {nextPageToken && <Button type="button" disabled={loading} onClick={() => load({ append: true, pageToken: nextPageToken })}>다음 회원 50명 불러오기</Button>}
    </Page>
  );
}
