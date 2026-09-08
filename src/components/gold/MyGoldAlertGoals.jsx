// src/components/gold/MyGoldAlertGoals.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Bell, BellRing, CheckCircle2, Save } from "lucide-react";

import {
  EMPTY_MY_GOLD_ALERT_GOALS,
  MY_GOLD_ALERT_BAR_OPTIONS,
  getMyGoldAlertGoals,
  saveMyGoldAlertGoals,
} from "@/services/myGoldAlertGoalsService";

const Card = styled.section`
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.96rem;
    font-weight: 950;
  }
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  min-height: 27px;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ $ready, theme }) =>
    $ready ? theme.semantic.alertSuccessBg : theme.colors.surfaceAlt};
  color: ${({ $ready, theme }) =>
    $ready ? theme.semantic.alertSuccessText : theme.colors.textSecondary};
  font-size: 0.6rem;
  font-weight: 900;
`;

const Current = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 1px;
`;

const CurrentItem = styled.div`
  flex: 1 0 142px;
  display: grid;
  gap: 2px;
  padding: 8px 9px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.56rem;
    font-weight: 800;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.75rem;
    font-weight: 950;
  }
`;

const Fields = styled.div`
  display: grid;
  gap: 8px;
`;

const GoalRow = styled.label`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(155px, 210px);
  gap: 10px;
  align-items: center;
  padding: 10px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.71rem;
    font-weight: 900;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.58rem;
    line-height: 1.35;
    word-break: keep-all;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const InputWrap = styled.div`
  display: grid;
  gap: 6px;

  .price-target {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 6px;
  }

  input,
  select {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: 10px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.72rem;
    font-weight: 800;
  }

  @media (max-width: 390px) {
    .price-target {
      grid-template-columns: 1fr;
    }
  }
`;

const PushNotice = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 10px;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.61rem;
  line-height: 1.4;

  span { flex: 1; }

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 900;
    text-decoration: none;
    white-space: nowrap;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const SaveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-height: 42px;
  padding: 8px 13px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 0.69rem;
  font-weight: 950;
  cursor: pointer;

  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const ClearButton = styled.button`
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.67rem;
  font-weight: 850;
  cursor: pointer;
`;

const Message = styled.p`
  margin: 0;
  color: ${({ $error, theme }) => ($error ? theme.colors.error : theme.colors.success)};
  font-size: 0.64rem;
  font-weight: 800;
  line-height: 1.5;
`;

const Details = styled.details`
  padding: 8px 9px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.59rem;
  line-height: 1.55;

  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 900;
  }

  p { margin: 7px 0 0; word-break: keep-all; }
`;

function formatWon(value, fallback = "-") {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return `${Math.round(number).toLocaleString("ko-KR")}원`;
}

function formatGrams(value) {
  const number = Number(value) || 0;
  return `${number < 1 ? number.toFixed(3) : number.toFixed(2)}g`;
}

function toInput(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(Math.round(number)) : "";
}

function toBarInput(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(number) : "";
}

export default function MyGoldAlertGoals({
  uid,
  currentValueWon,
  currentPricePerDon,
  exchangeReadyG,
  registeredItemCount,
  bonusGoldG,
  publicPriceEnabled = true,
  loadingMetrics = false,
}) {
  const [form, setForm] = useState({
    valueTargetWon: "",
    priceTargetPerDon: "",
    priceDirection: "up",
    targetGoldBarG: "",
  });
  const [pushReady, setPushReady] = useState(false);
  const [loading, setLoading] = useState(!!uid);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return undefined;
    let active = true;
    setLoading(true);
    getMyGoldAlertGoals(uid)
      .then((result) => {
        if (!active) return;
        const goals = result.goals || EMPTY_MY_GOLD_ALERT_GOALS;
        setForm({
          valueTargetWon: toInput(goals.valueTargetWon),
          priceTargetPerDon: toInput(goals.priceTargetPerDon),
          priceDirection: goals.priceDirection === "down" ? "down" : "up",
          targetGoldBarG: toBarInput(goals.targetGoldBarG),
        });
        setPushReady(result.pushReady === true);
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message || "알림 설정을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [uid]);

  const hasAnyGoal = useMemo(
    () => !!(form.valueTargetWon || form.priceTargetPerDon || form.targetGoldBarG),
    [form]
  );

  const save = async () => {
    if (!uid || saving) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await saveMyGoldAlertGoals({
        enabled: hasAnyGoal,
        valueTargetWon: form.valueTargetWon ? Number(form.valueTargetWon) : null,
        priceTargetPerDon: form.priceTargetPerDon ? Number(form.priceTargetPerDon) : null,
        priceDirection: form.priceDirection === "down" ? "down" : "up",
        targetGoldBarG: form.targetGoldBarG ? Number(form.targetGoldBarG) : null,
      });
      setPushReady(result.pushReady === true);
      if (result.notified && Array.isArray(result.reached) && result.reached.length) {
        setMessage(`저장 완료 · 현재 이미 ${result.reached.join(" · ")}에 도달했습니다.`);
      } else if (hasAnyGoal) {
        setMessage("저장했습니다. 목표에 처음 도달하면 알려드릴게요.");
      } else {
        setMessage("내금고 알림을 해제했습니다.");
      }
    } catch (saveError) {
      setError(saveError?.message || "알림을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setForm({ valueTargetWon: "", priceTargetPerDon: "", priceDirection: "up", targetGoldBarG: "" });
    setMessage("");
    setError("");
    setSaving(true);
    try {
      const result = await saveMyGoldAlertGoals({ ...EMPTY_MY_GOLD_ALERT_GOALS });
      setPushReady(result.pushReady === true);
      setMessage("내금고 알림을 모두 해제했습니다.");
    } catch (clearError) {
      setError(clearError?.message || "알림을 해제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const bonusOnly = Number(registeredItemCount) === 0 && Number(bonusGoldG) > 0;
  const metricsUnavailable = loadingMetrics || !publicPriceEnabled;

  return (
    <Card id="my-gold-alert-goals" aria-labelledby="my-gold-alert-goals-title">
      <Head>
        <h2 id="my-gold-alert-goals-title">알림 설정</h2>
        <Status $ready={pushReady}>
          {pushReady ? <BellRing size={13} aria-hidden /> : <Bell size={13} aria-hidden />}
          {pushReady ? "푸시 ON" : "푸시 OFF"}
        </Status>
      </Head>

      <Current aria-label="현재 내금고 알림 기준">
        <CurrentItem>
          <span>{bonusOnly ? "혜택 순금 가치" : "현재 내금고"}</span>
          <strong>{metricsUnavailable ? "확인 중" : formatWon(currentValueWon)}</strong>
        </CurrentItem>
        <CurrentItem>
          <span>순금 1돈 참고시세</span>
          <strong>{metricsUnavailable ? "확인 중" : formatWon(currentPricePerDon)}</strong>
        </CurrentItem>
        <CurrentItem>
          <span>교환 사용 가능 예상</span>
          <strong>{formatGrams(exchangeReadyG)}</strong>
        </CurrentItem>
      </Current>

      <Fields>
        <GoalRow>
          <div>
            <strong>내 금 가치</strong>
            <small>원하는 금액에 도달하면 알려드려요.</small>
          </div>
          <InputWrap>
            <input
              type="number"
              min="1000"
              step="1000"
              inputMode="numeric"
              placeholder="예: 10000000"
              value={form.valueTargetWon}
              onChange={(event) => setForm((prev) => ({ ...prev, valueTargetWon: event.target.value }))}
              aria-label="내금고 가치 목표 원"
            />
          </InputWrap>
        </GoalRow>

        <GoalRow>
          <div>
            <strong>순금 1돈 가격</strong>
            <small>오를 때 또는 내릴 때 원하는 가격에 닿으면 알려드려요.</small>
          </div>
          <InputWrap>
            <div className="price-target">
              <select
                value={form.priceDirection}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  priceDirection: event.target.value === "down" ? "down" : "up",
                }))}
                aria-label="순금 가격 알림 방향"
              >
                <option value="up">상승 도달</option>
                <option value="down">하락 도달</option>
              </select>
              <input
                type="number"
                min="10000"
                step="1000"
                inputMode="numeric"
                placeholder={form.priceDirection === "down" ? "예: 900000" : "예: 1000000"}
                value={form.priceTargetPerDon}
                onChange={(event) => setForm((prev) => ({ ...prev, priceTargetPerDon: event.target.value }))}
                aria-label={`순금 1돈 ${form.priceDirection === "down" ? "하락" : "상승"} 목표 원`}
              />
            </div>
          </InputWrap>
        </GoalRow>

        <GoalRow>
          <div>
            <strong>골드바 교환</strong>
            <small>선택한 규격으로 바꿀 수 있을 때 알려드려요.</small>
          </div>
          <InputWrap>
            <select
              value={form.targetGoldBarG}
              onChange={(event) => setForm((prev) => ({ ...prev, targetGoldBarG: event.target.value }))}
              aria-label="골드바 교환 가능 목표 규격"
            >
              <option value="">목표 규격 선택 안 함</option>
              {MY_GOLD_ALERT_BAR_OPTIONS.map((option) => (
                <option key={option.grams} value={option.grams}>{option.label}</option>
              ))}
            </select>
          </InputWrap>
        </GoalRow>
      </Fields>

      {!pushReady && (
        <PushNotice>
          <Bell size={15} aria-hidden />
          <span>자동 푸시를 받으려면 앱푸시 수신 설정이 필요합니다.</span>
          <Link to="/settings">알림 설정</Link>
        </PushNotice>
      )}

      <Actions>
        <SaveButton type="button" onClick={save} disabled={loading || saving}>
          {message && !error ? <CheckCircle2 size={15} aria-hidden /> : <Save size={15} aria-hidden />}
          {saving ? "저장 중..." : "알림 저장"}
        </SaveButton>
        <ClearButton type="button" onClick={clear} disabled={loading || saving || !hasAnyGoal}>
          모두 해제
        </ClearButton>
      </Actions>

      {error && <Message $error role="alert">{error}</Message>}
      {!error && message && <Message>{message}</Message>}

      <Details>
        <summary>알림 계산 기준 보기</summary>
        <p>
          내금고 가치는 등록 실물 금의 교환기준 예상 순금과 회원혜택 적립 순금의 참고가치를 함께 반영합니다.
          골드바 목표도 두 금량을 합산해 확인합니다.
        </p>
        <p>
          순금 가격은 상승 도달이면 목표가 이상, 하락 도달이면 목표가 이하가 되는 순간을 확인합니다.
          설정값마다 처음 도달할 때 1회 알림을 보내며, 저장 시 즉시 확인하고 이후 매일 오후 4시 20분(한국시간)에 자동 점검합니다.
          실제 금교환 순금량은 매장 실측 후 확정됩니다.
        </p>
      </Details>
    </Card>
  );
}
