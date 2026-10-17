//src/pages/admin/AdminGoldPrice.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  auth,
  db,
  callRefreshGoldPriceNow,
} from "@/firebase/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { buildGoldPriceHistoryCsv } from "@/lib/goldPriceHistoryCsv";
import { sendAdminNotification } from "@/services/adminNotificationClient";

const PRICE_FIELDS = [
  ["pureGoldSellPerDon", "순금 판매가"],
  ["gold18kSellPerDon", "18K 판매가"],
  ["gold14kSellPerDon", "14K 판매가"],
  ["pureGoldBuyPerDon", "순금 매입가"],
  ["gold18kBuyPerDon", "18K 매입가"],
  ["gold14kBuyPerDon", "14K 매입가"],
];

const emptyMarket = Object.fromEntries(PRICE_FIELDS.map(([key]) => [key, ""]));

const Page = styled.div`
  padding: 0 0 28px;
`;

const H1 = styled.h1`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text};
`;

const Lead = styled.p`
  margin: 0 0 22px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.65;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
  gap: 18px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Card = styled.section`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
`;

const CardTitle = styled.h2`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.2rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;

  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;

const Field = styled.label`
  display: grid;
  gap: 7px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .84rem;
  font-weight: 750;

  input, select {
    width: 100%;
    min-height: 42px;
    padding: 8px 11px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 9px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Check = styled.label`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 15px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  input { width: 18px; height: 18px; flex: 0 0 auto; }
`;

const NotificationOption = styled.div`
  margin-top: 16px;
  padding: 14px 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const NotificationCheck = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    margin: 2px 0 0;
    flex: 0 0 auto;
  }

  span {
    display: grid;
    gap: 3px;
  }

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
    font-weight: 600;
    line-height: 1.5;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`;

const Button = styled.button`
  min-height: 42px;
  padding: 9px 15px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 9px;
  background: ${({ $primary, theme }) => $primary ? theme.colors.primary : theme.colors.surface};
  color: ${({ $primary, theme }) => $primary ? theme.colors.white : theme.colors.primary};
  font-weight: 850;
  cursor: pointer;

  &:disabled { opacity: .55; cursor: not-allowed; }
`;

const Status = styled.div`
  display: grid;
  gap: 10px;

  div {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding-bottom: 9px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  span { color: ${({ theme }) => theme.colors.textSecondary}; }
  strong { text-align: right; color: ${({ theme }) => theme.colors.text}; }
`;

const Message = styled.p`
  margin: 14px 0 0;
  padding: 11px 13px;
  border-radius: 9px;
  background: ${({ theme, $error }) => $error ? theme.semantic.alertErrorBg : theme.colors.surfaceAlt};
  color: ${({ theme, $error }) => $error ? theme.semantic.alertErrorText : theme.colors.text};
  font-size: .85rem;
`;


const PreviewCard = styled(Card)`
  margin-top: 18px;
  padding: 0;
  overflow: hidden;
`;

const PreviewHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 18px 13px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 620px) {
    flex-direction: column;
    gap: 5px;
  }
`;

const PreviewTitle = styled.div`
  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
  }

  small {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .75rem;
    line-height: 1.45;
  }
`;

const PreviewMeta = styled.div`
  text-align: right;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .72rem;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }

  @media (max-width: 620px) {
    text-align: left;
  }
`;

const PreviewTable = styled.div`
  width: 100%;
`;

const PreviewHeader = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) minmax(0, 1fr);
  min-height: 42px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 420px) {
    grid-template-columns: 54px minmax(0, 1fr) minmax(0, 1fr);
  }
`;

const PreviewRow = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) minmax(0, 1fr);
  min-height: 58px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 420px) {
    grid-template-columns: 54px minmax(0, 1fr) minmax(0, 1fr);
    min-height: 54px;
  }
`;

const PreviewCell = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 7px 6px;
  border-left: ${({ $first, theme }) =>
    $first ? "0" : `1px solid ${theme.colors.border}`};
  text-align: center;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .94rem;
    font-weight: 900;
    line-height: 1.2;
    white-space: nowrap;
  }

  small {
    display: block;
    margin-top: 2px;
    font-size: .62rem;
    font-weight: 800;
    line-height: 1.3;
    white-space: nowrap;
  }

  @media (max-width: 420px) {
    padding: 6px 3px;

    strong {
      font-size: .82rem;
    }

    small {
      font-size: .57rem;
    }
  }
`;

const PreviewHeaderCell = styled(PreviewCell)`
  color: ${({ theme }) => theme.colors.primary};
  font-size: .74rem;
  font-weight: 900;

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 700;
  }
`;

const PreviewKind = styled.strong`
  font-size: .84rem !important;
`;

const PreviewDelta = styled.small`
  color: ${({ $direction, theme }) => {
    if ($direction === "up") return theme.colors.error;
    if ($direction === "down") return theme.colors.info;
    return theme.colors.textLight;
  }};
`;

const PreviewNote = styled.p`
  margin: 0;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  font-size: .66rem;
  line-height: 1.45;
`;

const Hint = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .8rem;
  line-height: 1.6;
`;

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function inputDate(value) {
  const text = String(value || "");
  return /^\d{8}$/.test(text)
    ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
    : "";
}

function compactDate(value) {
  return String(value || "").replace(/-/g, "");
}

function dateText(value) {
  const text = String(value || "");
  return /^\d{8}$/.test(text)
    ? `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`
    : text || "-";
}

function timestampText(value) {
  const date = value?.toDate?.();
  return date instanceof Date
    ? date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "-";
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function numberValue(value) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function validPrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}


function getDirection(currentValue, previousValue) {
  const current = Number(currentValue);
  const previous = Number(previousValue);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return "flat";
  const delta = current - previous;
  return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
}

function changeText(currentValue, previousValue) {
  const current = Number(currentValue);
  const previous = Number(previousValue);

  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return "전일 비교 없음";
  }

  const amount = Math.round(current - previous);
  const percent = (amount / previous) * 100;
  const symbol = amount > 0 ? "▲" : amount < 0 ? "▼" : "－";

  return `${symbol} ${Math.abs(amount).toLocaleString("ko-KR")}원 · ${Math.abs(percent).toFixed(2)}%`;
}

function readableError(error) {
  const code = String(error?.code || "").replace(/^functions\//, "").replace(/^firestore\//, "");
  const message = String(error?.message || "").trim();
  if (code === "permission-denied") return "관리자 권한을 확인해 주세요. 로그아웃 후 다시 로그인하면 권한 토큰이 갱신됩니다.";
  if (code === "unauthenticated") return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  return message || code || "처리 중 오류가 발생했습니다.";
}

export default function AdminGoldPrice() {
  const [enabled, setEnabled] = useState(false);
  const [display14kSellPrice, setDisplay14kSellPrice] = useState(false);
  const [sourceDate, setSourceDate] = useState(inputDate(todayKey()));
  const [market, setMarket] = useState(emptyMarket);
  const [loadedMarket, setLoadedMarket] = useState(emptyMarket);
  const [loadedDate, setLoadedDate] = useState("");
  const [dateLoadState, setDateLoadState] = useState("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [current, setCurrent] = useState(null);
  const [historicalPrevious, setHistoricalPrevious] = useState(null);
  const [krxReference, setKrxReference] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sendPriceNotification, setSendPriceNotification] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [exportStart, setExportStart] = useState(inputDate(todayKey().slice(0, 4) + "0101"));
  const [exportEnd, setExportEnd] = useState(inputDate(todayKey()));
  const [selectedYear, setSelectedYear] = useState(todayKey().slice(0, 4));

  useEffect(() => onSnapshot(
    doc(db, "goldPricePublic", "config"),
    (snap) => {
      const value = snap.exists() ? snap.data() : {};
      setEnabled(value.enabled === true);
      setDisplay14kSellPrice(value.display14kSellPrice === true);
    },
    (listenerError) => setError(readableError(listenerError))
  ), []);

  useEffect(() => onSnapshot(
    doc(db, "goldPrices", "current"),
    (snap) => {
      if (!snap.exists()) {
        setCurrent(null);
        return;
      }
      // 실시간 공개 시세는 미리보기에만 반영합니다.
      // 관리자가 선택한 날짜와 편집 중인 가격은 절대 덮어쓰지 않습니다.
      setCurrent(snap.data());
    },
    (listenerError) => setError(readableError(listenerError))
  ), []);

  // 기준일을 바꾸면 자동으로 그 날짜의 최종 시세를 조회합니다.
  // 먼저 입력값을 비워 이전 날짜의 가격이 다른 날짜에 저장되는 일을 막습니다.
  useEffect(() => {
    let active = true;
    const key = compactDate(sourceDate);
    setLoadedDate("");
    setDateLoadState("loading");
    setMarket({ ...emptyMarket });
    setLoadedMarket({ ...emptyMarket });

    if (!/^\d{8}$/.test(key) || key > todayKey()) {
      setDateLoadState("invalid");
      return () => { active = false; };
    }

    const fetchDate = async () => {
      try {
        const history = await getDoc(doc(db, "goldPriceHistory", key));
        let value = history.exists() ? history.data() : null;
        let state = history.exists() ? "ready" : "missing";

        // 오늘 기록이 아직 없으면 마지막 공개 시세를 입력 시작값으로 사용합니다.
        // 과거 날짜에 기록이 없을 때는 다른 날짜 가격을 대신 보여주지 않습니다.
        if (!value && key === todayKey()) {
          const live = await getDoc(doc(db, "goldPrices", "current"));
          if (live.exists() && live.data()?.market) {
            value = live.data();
            state = "todayCarry";
          }
        }
        if (!active) return;
        const nextMarket = Object.fromEntries(PRICE_FIELDS.map(([field]) => [
          field, validPrice(value?.market?.[field]) ? String(value.market[field]) : "",
        ]));
        setMarket(nextMarket);
        setLoadedMarket(nextMarket);
        setLoadedDate(key);
        setDateLoadState(state);
      } catch (loadError) {
        if (!active) return;
        setDateLoadState("error");
        setError(`선택 날짜 시세 조회 실패: ${readableError(loadError)}`);
      }
    };
    fetchDate();
    return () => { active = false; };
  }, [sourceDate, loadAttempt]);

  useEffect(() => onSnapshot(
    doc(db, "goldPrices", "pending"),
    (snap) => setKrxReference(snap.exists() ? snap.data() : null),
    () => setKrxReference(null)
  ), []);

  useEffect(() => {
    let active = true;
    setHistoricalPrevious(null);
    const key = compactDate(sourceDate);
    if (key >= todayKey() || !/^\d{8}$/.test(key)) return;
    getDocs(query(collection(db, "goldPriceHistory"), where("sourceDate", "<", key), orderBy("sourceDate", "desc"), limit(1)))
      .then(snapshot => { if (active) setHistoricalPrevious(snapshot.docs[0]?.data()?.market || null); })
      .catch(e => { if (active) setError(readableError(e)); });
    return () => { active = false; };
  }, [sourceDate, current]);

  const previewPreviousMarket = useMemo(
    () =>
      compactDate(sourceDate) < todayKey() ? historicalPrevious : current?.sourceDate === compactDate(sourceDate)
        ? current?.previousMarket || null
        : current?.market || null,
    [current, sourceDate, historicalPrevious]
  );

  const previewRows = useMemo(
    () => [
      { label: "순금", sellKey: "pureGoldSellPerDon", buyKey: "pureGoldBuyPerDon" },
      { label: "18K", sellKey: "gold18kSellPerDon", buyKey: "gold18kBuyPerDon" },
      { label: "14K", sellKey: "gold14kSellPerDon", buyKey: "gold14kBuyPerDon" },
    ],
    []
  );

  const dateReady = loadedDate === compactDate(sourceDate) &&
    ["ready", "missing", "todayCarry"].includes(dateLoadState);
  const priceChanged = dateReady && PRICE_FIELDS.some(([key]) =>
    String(market[key] ?? "") !== String(loadedMarket[key] ?? "")
  );

  const changeSourceDate = (nextDate) => {
    if (nextDate === sourceDate) return;
    if (priceChanged && !window.confirm(
      "저장하지 않은 금시세 수정 내용이 있습니다. 날짜를 바꾸면 입력 중인 가격이 사라집니다. 계속할까요?"
    )) return;
    setSourceDate(nextDate);
    setSendPriceNotification(false);
    setMessage("");
    setError("");
    setLoadedDate("");
    setDateLoadState("loading");
    setMarket({ ...emptyMarket });
  };

  const run = async (action, successText) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await action();
      setMessage(result?.message || successText);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  };

  const saveAndPublish = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("로그인이 필요합니다.");

    const dateKey = compactDate(sourceDate);
    if (!dateReady) throw new Error("선택한 날짜의 시세 조회가 완료된 후 저장해 주세요.");
    if (!/^\d{8}$/.test(dateKey)) throw new Error("기준일을 올바르게 선택해 주세요.");

    if (dateKey > todayKey()) throw new Error("오늘 또는 과거 날짜를 선택해 주세요.");

    const normalizedMarket = Object.fromEntries(
      PRICE_FIELDS.map(([key, label]) => {
        const value = numberValue(market[key]);
        if (value <= 0) throw new Error(`${label}를 입력해 주세요.`);
        return [key, value];
      })
    );

    if (dateKey < todayKey()) {
      const changes = PRICE_FIELDS.filter(([key]) =>
        Number(loadedMarket[key]) !== normalizedMarket[key]
      ).map(([key, label]) =>
        `${label}: ${money(loadedMarket[key])} → ${money(normalizedMarket[key])}`
      );
      const confirmed = window.confirm([
        `${dateText(dateKey)} 과거 금시세를 저장하시겠습니까?`,
        "",
        ...(changes.length ? changes : ["가격 변경 없음 (선택 날짜 재저장)"]),
        "",
        "다음에 직접 시세를 변경한 날짜 전날까지 가격이 함께 적용될 수 있습니다.",
      ].join("\n"));
      if (!confirmed) return { message: "과거 시세 저장을 취소했습니다." };
    }

    const save = httpsCallable(getFunctions(undefined, "asia-northeast3"), "saveDailyGoldPrice");
    const result = await save({ date: dateKey, market: normalizedMarket, enabled, display14kSellPrice });
    setLoadedMarket(Object.fromEntries(PRICE_FIELDS.map(([key]) => [key, String(normalizedMarket[key])])));
    setDateLoadState("ready");
    if (dateKey < todayKey()) return { message: `${dateText(dateKey)} 시세를 저장했습니다. 다음 변경일 전까지 같은 시세로 적용했습니다.${result.data.updatedCurrent ? " 현재 공개 시세도 반영했습니다." : ""}` };

    if (!sendPriceNotification) {
      return { message: "금시세를 저장하고 공개했습니다." };
    }

    try {
      const notificationResult = await sendAdminNotification({
        targetType: "goldNews",
        category: "goldNews",
        title: "오늘의 금시세가 업데이트되었습니다",
        body: "한국골드마켓에서 최신 금시세를 확인해 보세요.",
        link: "/gold-price",
      });

      setSendPriceNotification(false);

      const recipientCount = Number(notificationResult?.recipientCount || 0);
      return {
        message: `금시세를 저장하고 공개했습니다. 금시세 알림 ${recipientCount.toLocaleString("ko-KR")}명 발송을 요청했습니다.`,
      };
    } catch (notificationError) {
      const detail = readableError(notificationError);
      throw new Error(
        `금시세 저장·공개는 완료되었지만 알림 발송에 실패했습니다. ${detail}`
      );
    }
  };

  const downloadHistory = async () => {
    const start = compactDate(exportStart);
    const end = compactDate(exportEnd);
    // Validate before issuing a Firestore query; missing days remain explicit in the file.
    buildGoldPriceHistoryCsv(start, end, []);
    if (end > todayKey()) throw new Error("미래 날짜는 내려받을 수 없습니다.");
    const snapshot = await getDocs(query(collection(db, "goldPriceHistory"),
      where("sourceDate", ">=", start), where("sourceDate", "<=", end), orderBy("sourceDate")));
    const result = buildGoldPriceHistoryCsv(start, end, snapshot.docs.map(item => item.data()));
    const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `한국골드마켓_일별금시세_${start}_${end}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { message: `${result.count}일의 금시세를 내려받았습니다.${result.missing ? ` 기록 없는 날짜 ${result.missing}일은 빈 가격으로 표시했습니다.` : ""}` };
  };

  const selectExportYear = () => {
    if (!/^\d{4}$/.test(selectedYear) || Number(selectedYear) < 2000 || selectedYear > todayKey().slice(0, 4)) {
      setError("2000년부터 올해 사이의 연도를 입력하세요.");
      return;
    }
    setError("");
    setExportStart(`${selectedYear}-01-01`);
    setExportEnd(selectedYear === todayKey().slice(0, 4) ? inputDate(todayKey()) : `${selectedYear}-12-31`);
  };

  const saveDisplaySettings = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("로그인이 필요합니다.");
    await setDoc(doc(db, "goldPricePublic", "config"), {
      enabled,
      display14kSellPrice,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    }, { merge: true });
  };


  return (
    <Page>
      <H1>금시세 관리</H1>
      <Lead>
        홈페이지 금시세는 관리자가 직접 입력합니다. 판매가는 VAT가 포함된 최종가격을 입력하며,
        금교환 중량 적용률과는 완전히 별개입니다.
      </Lead>

      <Grid>
        <Card>
          <CardTitle>금시세 직접 입력</CardTitle>
          <Check>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            홈페이지에 금시세 표시
          </Check>

          <FormGrid>
            <Field>
              기준일
              <input
                type="date"
                value={sourceDate}
                max={inputDate(todayKey())}
                disabled={busy}
                onChange={(e) => changeSourceDate(e.target.value)}
              />
            </Field>
            <Field>
              14K 살 때 표시 방식
              <select
                value={display14kSellPrice ? "price" : "market"}
                onChange={(e) => setDisplay14kSellPrice(e.target.value === "price")}
              >
                <option value="market">제품 시세 적용</option>
                <option value="price">입력한 판매가격 표시</option>
              </select>
            </Field>

            {PRICE_FIELDS.map(([key, label], index) => (
              <Field key={key}>
                {label}{index < 3 ? " (VAT 포함)" : ""}
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={busy || !dateReady}
                  value={market[key]}
                  placeholder="예: 848000"
                  onChange={(e) => {setMarket((prev) => ({
                    ...prev,
                    [key]: e.target.value.replace(/[^0-9]/g, ""),
                  }));}}
                />
              </Field>
            ))}
          </FormGrid>

          <Hint aria-live="polite" role="status">
            {dateLoadState === "loading" && "선택 날짜의 금시세를 불러오는 중입니다..."}
            {dateLoadState === "error" && "시세를 불러오지 못했습니다. 다시 조회를 눌러 주세요."}
            {dateLoadState === "invalid" && "오늘 또는 과거 날짜를 선택해 주세요."}
            {dateLoadState === "missing" && "선택 날짜에 저장된 시세가 없습니다. 새로 기록하려면 6개 가격을 직접 입력한 후 저장하세요."}
            {dateLoadState === "todayCarry" && "오늘 날짜의 기록은 아직 없습니다. 마지막 공개 시세를 불러왔으며, 저장하면 오늘 가격으로 기록됩니다."}
            {dateLoadState === "ready" && `${dateText(loadedDate)}에 저장된 금시세를 불러왔습니다. 수정 후 시세 저장을 눌러 주세요.`}
          </Hint>
          <Hint>
            기준일을 선택하면 해당 날짜의 시세가 자동으로 표시됩니다. 저장한 날짜부터 다음 직접 변경일 전날까지 같은 시세가 적용될 수 있습니다.
          </Hint>

          <NotificationOption>
            <NotificationCheck>
              <input
                type="checkbox"
                checked={sendPriceNotification}
                disabled={busy || compactDate(sourceDate) !== todayKey()}
                onChange={(e) => setSendPriceNotification(e.target.checked)}
              />
              <span>
                저장 후 금시세 알림 보내기
                <small>
                  광고성 정보 수신에 동의하고 금시세·혜택 알림이 활성화된 회원에게만 발송합니다.
                  오늘 시세를 저장할 때만 보낼 수 있습니다. 과거 날짜 저장은 알림을 보내지 않습니다.
                </small>
              </span>
            </NotificationCheck>
          </NotificationOption>

          <Actions>
            <Button
              $primary
              disabled={busy || !dateReady}
              onClick={() => run(saveAndPublish, "금시세를 저장하고 공개했습니다.")}
            >
              {sendPriceNotification && compactDate(sourceDate) === todayKey() ? "시세 저장 + 알림 발송" : "시세 저장"}
            </Button>
            <Button disabled={busy} onClick={() => run(saveDisplaySettings, "표시 설정을 저장했습니다.")}>표시 설정만 저장</Button>
            {dateLoadState === "error" && (
              <Button disabled={busy} onClick={() => { setError(""); setLoadAttempt((count) => count + 1); }}>
                선택 날짜 다시 조회
              </Button>
            )}
          </Actions>
          {message && <Message>{message}</Message>}
          {error && <Message $error>{error}</Message>}
        </Card>

        <div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <PreviewHead>
              <PreviewTitle>
                <strong>홈페이지 시세표</strong>
                <small>입력값이 즉시 반영됩니다. 저장하면 홈페이지에 공개됩니다.</small>
              </PreviewTitle>

              <PreviewMeta>
                <div>
                  기준일 <strong>{dateText(compactDate(sourceDate))}</strong>
                </div>
                <div>
                  공개 <strong>{enabled ? "ON" : "OFF"}</strong>
                </div>
                <div>
                  현재 공개 <strong>{dateText(current?.sourceDate)}</strong>
                </div>
              </PreviewMeta>
            </PreviewHead>

            <PreviewTable>
              <PreviewHeader>
                <PreviewHeaderCell $first>종류</PreviewHeaderCell>
                <PreviewHeaderCell>
                  내가 살 때
                  <small>VAT 포함</small>
                </PreviewHeaderCell>
                <PreviewHeaderCell>내가 팔 때</PreviewHeaderCell>
              </PreviewHeader>

              {previewRows.map((row) => {
                const sellValue = numberValue(market[row.sellKey]);
                const buyValue = numberValue(market[row.buyKey]);
                const previousSell = previewPreviousMarket?.[row.sellKey];
                const previousBuy = previewPreviousMarket?.[row.buyKey];

                const showProductText =
                  row.sellKey === "gold14kSellPerDon" &&
                  display14kSellPrice !== true;

                return (
                  <PreviewRow key={`current-${row.label}`}>
                    <PreviewCell $first>
                      <PreviewKind>{row.label}</PreviewKind>
                    </PreviewCell>

                    <PreviewCell>
                      <strong>
                        {showProductText ? "제품 시세 적용" : money(sellValue)}
                      </strong>

                      {!showProductText && (
                        <PreviewDelta
                          $direction={getDirection(sellValue, previousSell)}
                        >
                          {changeText(sellValue, previousSell)}
                        </PreviewDelta>
                      )}
                    </PreviewCell>

                    <PreviewCell>
                      <strong>{money(buyValue)}</strong>
                      <PreviewDelta
                        $direction={getDirection(buyValue, previousBuy)}
                      >
                        {changeText(buyValue, previousBuy)}
                      </PreviewDelta>
                    </PreviewCell>
                  </PreviewRow>
                );
              })}
            </PreviewTable>

            <PreviewNote>
              1돈(3.75g) 기준 · 현재 공개 시각 {timestampText(current?.publishedAt)}
            </PreviewNote>
          </Card>

          <Card style={{ marginTop: 14, padding: 16 }}>
            <CardTitle style={{ marginBottom: 10 }}>KRX 참고 시세</CardTitle>
            <Status>
              <div><span>기준일</span><strong>{dateText(krxReference?.sourceDate)}</strong></div>
              <div><span>KRX 1g</span><strong>{money(krxReference?.krx?.pricePerGram)}</strong></div>
              <div><span>KRX 1돈</span><strong>{money(krxReference?.krx?.pricePerDon)}</strong></div>
              <div><span>조회 시각</span><strong>{timestampText(krxReference?.fetchedAt)}</strong></div>
            </Status>
            <Actions>
              <Button disabled={busy} onClick={() => run(() => callRefreshGoldPriceNow(), "KRX 참고 시세를 조회했습니다.")}>KRX 참고 시세 조회</Button>
            </Actions>
            <Hint>KRX 조회값은 참고용이며 홈페이지 판매·매입가격을 자동으로 변경하지 않습니다.</Hint>
          </Card>
        </div>
      </Grid>
      <Card style={{ marginTop: 18 }}>
        <CardTitle>일별 금시세 보관 · CSV 다운로드</CardTitle>
        <Hint>변동이 없는 날도 날짜별 시세로 저장됩니다. 한국 시간 매일 00:05에 오늘 기록과 최근 366일의 누락 날짜를 채웁니다. 하루에 여러 번 저장하면 마지막 가격이 그날의 최종 시세입니다.</Hint>
        <FormGrid style={{ marginTop: 14 }}>
          <Field>시작일<input type="date" value={exportStart} max={inputDate(todayKey())} onChange={e => setExportStart(e.target.value)} /></Field>
          <Field>종료일<input type="date" value={exportEnd} max={inputDate(todayKey())} onChange={e => setExportEnd(e.target.value)} /></Field>
          <Field>연도<input type="number" min="2000" max={todayKey().slice(0, 4)} value={selectedYear} onChange={e => setSelectedYear(e.target.value)} /></Field>
        </FormGrid>
        <Actions>
          <Button disabled={busy} onClick={selectExportYear}>선택 연도 전체 기간</Button>
          <Button $primary disabled={busy} onClick={() => run(downloadHistory, "금시세를 내려받았습니다.")}>기간별 CSV 다운로드</Button>
        </Actions>
        <Hint>최대 366일씩 엑셀에서 열 수 있는 CSV로 보관할 수 있습니다. 기록이 없는 날짜는 빈 가격과 ‘기록 없음’으로 표시합니다. 자동 유지 가격은 실제 시장 변동을 확인한 가격이 아니므로 놓친 변동은 과거 보정으로 정정하세요.</Hint>
      </Card>

    </Page>
  );
}
