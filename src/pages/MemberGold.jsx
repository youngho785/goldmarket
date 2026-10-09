import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import styled from "styled-components";
import {
  BellRing,
  Check,
  ChevronRight,
  CircleDollarSign,
  History,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import {
  cancelBonusGoldUsage,
  getMemberGoldOverview,
  requestBonusGoldUsage,
} from "@/services/quizClient";
import {
  trackProductEvent,
  trackProductEventOncePerSession,
} from "@/analytics/productAnalytics";

const Page = styled.main`
  display: grid;
  gap: 14px;
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 8px 0 32px;
`;

const Hero = styled.section`
  position: relative;
  overflow: hidden;
  padding: clamp(22px, 5vw, 34px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background:
    radial-gradient(circle at 92% 0%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent), transparent 38%),
    ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Eyebrow = styled.p`
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .72rem;
  font-weight: 950;
  letter-spacing: .09em;
`;

const HeroTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.65rem, 5vw, 2.35rem);
  letter-spacing: -.04em;
`;

const BalanceLabel = styled.p`
  margin: 22px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;
  font-weight: 800;
`;

const Balance = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(2.35rem, 9vw, 4rem);
  font-weight: 950;
  letter-spacing: -.045em;

  span {
    margin-left: 6px;
    font-size: .42em;
    font-weight: 850;
  }
`;

const Lead = styled.p`
  margin: 10px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .86rem;
  line-height: 1.65;
`;

const Card = styled.section`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.xs};
`;

const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.04rem;
  }

  b {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .82rem;
  }
`;

const RewardGrid = styled.div`
  display: grid;
  gap: 9px;
`;

const RewardRow = styled.div`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 13px;
  background: ${({ $done, theme }) => $done ? theme.semantic.alertSuccessBg : theme.colors.surface};

  > span:first-child {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: ${({ $done, theme }) => $done ? theme.colors.primary : theme.semantic.badgeGoldBg};
    color: ${({ $done, theme }) => $done ? theme.on.primary : theme.colors.primary};
  }

  svg { width: 16px; height: 16px; }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.text};
    font-size: .84rem;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .72rem;
  }

  b {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .76rem;
    white-space: nowrap;
  }
`;

const Action = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 52px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 13px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  text-decoration: none;
  font-size: .82rem;
  font-weight: 900;

  svg { width: 18px; height: 18px; }
`;

const SecondaryAction = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 10px;
  padding: 10px 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: .8rem;
  font-weight: 850;
  cursor: pointer;

  &:disabled { opacity: .55; cursor: not-allowed; }
`;

const UsageBox = styled.div`
  display: grid;
  gap: 7px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 30%, ${({ theme }) => theme.colors.border});
  border-radius: 14px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  strong { color: ${({ theme }) => theme.colors.primary}; }
  span, p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .8rem; line-height: 1.55; }
`;

const Code = styled.div`
  margin: 5px 0;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 2rem;
  font-weight: 950;
  letter-spacing: .18em;
`;

const Select = styled.select`
  width: 100%;
  min-height: 46px;
  margin-top: 10px;
  padding: 9px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
`;

const LedgerList = styled.div`
  display: grid;
  gap: 2px;
`;

const LedgerRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 11px 2px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child { border-bottom: 0; }
  strong { display: block; color: ${({ theme }) => theme.colors.text}; font-size: .82rem; }
  small { display: block; margin-top: 3px; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .7rem; }
  b { color: ${({ $credit, theme }) => $credit ? theme.colors.primary : theme.colors.text}; font-family: ${({ theme }) => theme.fonts.numeric}; font-size: .82rem; }
`;

const Notice = styled.p`
  margin: 0;
  padding: 12px 13px;
  border-radius: 12px;
  background: ${({ $error, theme }) => $error ? theme.semantic.alertErrorBg : theme.semantic.badgeGoldBg};
  color: ${({ $error, theme }) => $error ? theme.semantic.alertErrorText : theme.colors.textSecondary};
  font-size: .8rem;
  line-height: 1.55;
`;

function formatLedgerDate(value) {
  if (!value) return "";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ledgerLabel(entry) {
  switch (String(entry?.source || "")) {
    case "welcome_gold_v1":
      return "회원가입 혜택";
    case "marketing_push_bonus_v1":
      return "금시세·혜택 알림";
    case "gold_bonus_v1":
      return "금 퀵퀴즈";
    case "gold_exchange_redemption":
      return "GOLD TO GOLD 사용";
    case "gold_exchange_redemption_restore":
      return "교환 취소로 복원";
    case "benefit_balance_carryover_v1":
      return "이전 계정 미사용 잔액 복원";
    default:
      return "MEMBER GOLD 변동";
  }
}

function rewardMeta(key) {
  if (key === "welcome") {
    return { title: "회원가입", detail: "이메일 인증 완료 회원혜택", icon: Sparkles };
  }
  if (key === "marketingPush") {
    return { title: "금시세·혜택 알림", detail: "선택 알림 설정 회원혜택", icon: BellRing };
  }
  return { title: "금 퀵퀴즈", detail: "금 상식 5문제 완료 회원혜택", icon: CircleDollarSign };
}

export default function MemberGold() {
  const { memberUser: user } = useAuthContext() || {};
  const { balanceG, loading: balanceLoading } = useBonusGoldBalance(user?.uid);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerRetryKey, setLedgerRetryKey] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const refreshOverview = async () => {
    if (!user?.uid) return null;
    const next = await getMemberGoldOverview();
    setOverview(next);
    if (!selectedGroupId && Array.isArray(next?.eligibleGroups) && next.eligibleGroups.length > 0) {
      setSelectedGroupId(next.eligibleGroups[0].groupId);
    }
    return next;
  };

  useEffect(() => {
    trackProductEventOncePerSession("member_gold_view", {}, "member-gold-view");
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) return undefined;

    setLoading(true);
    setError("");
    getMemberGoldOverview()
      .then((next) => {
        if (cancelled) return;
        setOverview(next);
        if (Array.isArray(next?.eligibleGroups) && next.eligibleGroups.length > 0) {
          setSelectedGroupId(next.eligibleGroups[0].groupId);
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || "MEMBER GOLD 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setLedger([]);
      setLedgerLoading(false);
      setLedgerError("");
      return undefined;
    }

    setLedgerLoading(true);
    setLedgerError("");
    const ledgerQuery = query(
      collection(db, "users", user.uid, "ledger"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    return onSnapshot(
      ledgerQuery,
      (snapshot) => {
        setLedger(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLedgerLoading(false);
        setLedgerError("");
      },
      (snapshotError) => {
        console.warn("[MemberGold] ledger read failed:", snapshotError?.message || snapshotError);
        setLedgerLoading(false);
        setLedgerError("적립·사용 내역을 불러오지 못했습니다. 다시 시도해 주세요.");
      }
    );
  }, [user?.uid, ledgerRetryKey]);

  const rewards = overview?.rewards || {};
  const completedCount = [rewards.welcome, rewards.marketingPush, rewards.quiz]
    .filter((reward) => reward?.claimed).length;
  const walletBalanceG = balanceLoading
    ? Number(overview?.balanceG || 0)
    : Number(balanceG || 0);
  const request = overview?.request || null;
  const hasPendingRequest = request?.status === "requested";
  const availableBalanceG = hasPendingRequest
    ? Number(overview?.spendableG || 0)
    : walletBalanceG;
  const eligibleGroups = Array.isArray(overview?.eligibleGroups) ? overview.eligibleGroups : [];

  const nextAction = useMemo(() => {
    if (!rewards.marketingPush?.claimed) {
      return { to: "/settings", label: "알림 설정하고 MEMBER GOLD 0.01g 받기" };
    }
    if (!rewards.quiz?.claimed) {
      return { to: "/quiz/gold-bonus?next=%2Fmember-gold", label: "금 퀵퀴즈 풀고 MEMBER GOLD 0.01g 받기" };
    }
    return { to: "/gold-exchange", label: "GOLD TO GOLD에서 사용하기" };
  }, [rewards.marketingPush?.claimed, rewards.quiz?.claimed]);

  const onRequestUsage = async () => {
    if (!selectedGroupId || busy) return;
    setBusy(true);
    setError("");
    setActionMessage("");
    try {
      await requestBonusGoldUsage(selectedGroupId);
      await refreshOverview();
      setActionMessage("MEMBER GOLD 사용 신청이 연결되었습니다. 매장 방문 시 6자리 확인 코드를 보여주세요.");
      void trackProductEvent("member_gold_usage_requested", { source: "wallet" });
    } catch (actionError) {
      setError(actionError?.message || "MEMBER GOLD 사용 신청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onCancelUsage = async () => {
    if (busy || !window.confirm("MEMBER GOLD 사용 신청을 취소할까요?")) return;
    setBusy(true);
    setError("");
    setActionMessage("");
    try {
      await cancelBonusGoldUsage();
      await refreshOverview();
      setActionMessage("MEMBER GOLD 사용 신청을 취소했습니다.");
    } catch (actionError) {
      setError(actionError?.message || "MEMBER GOLD 사용 신청을 취소하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const usagePanel = (
      <Card>
        <CardHead>
          <h2>GOLD TO GOLD 사용</h2>
          <b>{walletBalanceG > 0 ? `${walletBalanceG.toFixed(2)}g 잔액` : "사용 가능 잔액 없음"}</b>
        </CardHead>

        {hasPendingRequest ? (
          <UsageBox aria-live="polite">
            <strong>매장 확인 대기 · {Number(request.amountG || 0).toFixed(2)}g</strong>
            {request.visitDate && <span>{request.visitDate} {request.visitTime || ""}</span>}
            <p>매장에서 아래 6자리 코드를 관리자에게 보여주세요.</p>
            <Code aria-label={`매장 확인 코드 ${request.requestCode}`}>{request.requestCode}</Code>
            <SecondaryAction type="button" onClick={onCancelUsage} disabled={busy}>
              {busy ? "처리 중…" : "사용 신청 취소"}
            </SecondaryAction>
          </UsageBox>
        ) : availableBalanceG <= 0 ? (
          <Notice>현재 사용할 수 있는 MEMBER GOLD가 없습니다. 회원혜택을 완료하면 순금이 적립됩니다.</Notice>
        ) : eligibleGroups.length > 0 ? (
          <>
            <Notice>현재 보유 MEMBER GOLD 전액을 선택한 예약에 연결합니다. 실제 차감은 매장에서 6자리 코드를 확인하고 교환을 확정할 때 이루어집니다.</Notice>
            <Select
              aria-label="MEMBER GOLD를 사용할 금교환 예약"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
            >
              {eligibleGroups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.visitDate || "방문일 미정"} {group.visitTime || ""} · {group.status === "requested" ? "접수" : group.status === "scheduled" ? "예약 승인" : "진행 중"}
                </option>
              ))}
            </Select>
            <SecondaryAction type="button" onClick={onRequestUsage} disabled={busy || !selectedGroupId}>
              {busy ? "연결 중…" : `MEMBER GOLD ${availableBalanceG.toFixed(2)}g 사용 신청`}
            </SecondaryAction>
          </>
        ) : (
          <Action to="/gold-exchange" onClick={() => void trackProductEvent("member_gold_exchange_cta_clicked", { source: "wallet" })}>
            <span>금교환 예약 후 MEMBER GOLD 사용하기</span>
            <ChevronRight aria-hidden />
          </Action>
        )}
      </Card>
  );

  return (
    <Page>
      <Hero>
        <Eyebrow>MEMBER GOLD</Eyebrow>
        <HeroTitle>금교환에 사용하는 회원 혜택</HeroTitle>
        <BalanceLabel>현재 사용 가능 잔액</BalanceLabel>
        <Balance>
          {loading && balanceLoading ? "확인 중" : availableBalanceG.toFixed(2)}
          {!(loading && balanceLoading) && <span>g</span>}
        </Balance>
        <Lead>
          MY GOLD는 내가 가진 금의 기록, MEMBER GOLD는 교환에 적용할 수 있는 별도 혜택입니다. 현장 확인 후 사용이 확정됩니다.
        </Lead>
      </Hero>

      {loading && <Notice>MEMBER GOLD 상태를 확인하고 있습니다.</Notice>}
      {error && <Notice $error role="alert">{error}</Notice>}
      {actionMessage && <Notice role="status">{actionMessage}</Notice>}

      {hasPendingRequest && usagePanel}

      <Card>
        <CardHead>
          <h2>회원혜택 현황</h2>
          <b>{completedCount}/3 완료</b>
        </CardHead>
        <RewardGrid>
          {["welcome", "marketingPush", "quiz"].map((key) => {
            const reward = rewards[key] || {};
            const meta = rewardMeta(key);
            const Icon = reward.claimed ? Check : meta.icon;
            return (
              <RewardRow key={key} $done={!!reward.claimed}>
                <span><Icon aria-hidden /></span>
                <div>
                  <strong>{meta.title}</strong>
                  <small>{meta.detail}</small>
                </div>
                <b>
                  {reward.claimed
                    ? reward.previouslyClaimed
                      ? "이전 가입에서 완료"
                      : `+${Number(reward.creditedG || 0).toFixed(2)}g`
                    : "+0.01g"}
                </b>
              </RewardRow>
            );
          })}
        </RewardGrid>

        {!loading && !hasPendingRequest && (
          <Action
            to={nextAction.to}
            onClick={() => void trackProductEvent("member_gold_reward_cta_clicked", {
              action: nextAction.to.startsWith("/gold-exchange") ? "exchange" : nextAction.to.startsWith("/settings") ? "marketing_push" : "quiz",
            })}
          >
            <span>{nextAction.label}</span>
            <ChevronRight aria-hidden />
          </Action>
        )}
      </Card>

      {!hasPendingRequest && usagePanel}

      <Card>
        <CardHead>
          <h2>최근 내역</h2>
          <b><History size={15} aria-hidden /> 최근 20건</b>
        </CardHead>
        {ledgerError ? (
          <>
            <Notice $error role="alert">{ledgerError}</Notice>
            <SecondaryAction type="button" onClick={() => setLedgerRetryKey((key) => key + 1)}>
              내역 다시 불러오기
            </SecondaryAction>
          </>
        ) : ledgerLoading ? (
          <Notice role="status">적립·사용 내역을 불러오는 중입니다.</Notice>
        ) : ledger.length === 0 ? (
          <Notice>아직 MEMBER GOLD 적립·사용 내역이 없습니다.</Notice>
        ) : (
          <LedgerList>
            {ledger.map((entry) => {
              const amountG = Number.isFinite(Number(entry.amountMilliGrams))
                ? Number(entry.amountMilliGrams) / 1000
                : Number(entry.amountG || 0);
              const isCredit = String(entry.direction || "") !== "debit";
              return (
                <LedgerRow key={entry.id} $credit={isCredit}>
                  <div>
                    <strong>{ledgerLabel(entry)}</strong>
                    <small>{formatLedgerDate(entry.createdAt)}</small>
                  </div>
                  <b>{isCredit ? "+" : "−"}{Math.abs(amountG).toFixed(2)}g</b>
                </LedgerRow>
              );
            })}
          </LedgerList>
        )}
      </Card>

      {Number(overview?.restoredBalanceG || 0) > 0 && (
        <Notice>
          <RotateCcw size={15} aria-hidden /> 이전 계정에서 사용하지 않은 MEMBER GOLD {Number(overview.restoredBalanceG).toFixed(2)}g이 현재 계정 잔액으로 복원된 이력이 있습니다.
        </Notice>
      )}
    </Page>
  );
}
