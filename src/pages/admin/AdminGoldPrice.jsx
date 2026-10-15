//src/pages/admin/AdminGoldPrice.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  collection,
  doc,
  getDoc,
  getDocs,
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
  const [current, setCurrent] = useState(null);
  const [krxReference, setKrxReference] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sendPriceNotification, setSendPriceNotification] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionPreview, setCorrectionPreview] = useState(null);
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
      const value = snap.data();
      setCurrent(value);

      /*
       * 관리 화면을 새로 열 때 기준일은 항상 한국시간 "오늘"로 맞춥니다.
       * 마지막 공개 시세의 가격은 그대로 불러오므로 변동이 없는 날에도
       * 저장하면 오늘 날짜의 goldPriceHistory 문서가 생성됩니다.
       *
       * 과거 날짜를 직접 선택해 불러오는 동작은 아래 loadDate()가 담당합니다.
       */
      setCorrectionPreview(null);
      setSourceDate(inputDate(todayKey()));
      setMarket(Object.fromEntries(
        PRICE_FIELDS.map(([key]) => [key, validPrice(value.market?.[key]) ? String(value.market[key]) : ""])
      ));
    },
    (listenerError) => setError(readableError(listenerError))
  ), []);

  useEffect(() => onSnapshot(
    doc(db, "goldPrices", "pending"),
    (snap) => setKrxReference(snap.exists() ? snap.data() : null),
    () => setKrxReference(null)
  ), []);

  const previewPreviousMarket = useMemo(
    () =>
      current?.sourceDate === compactDate(sourceDate)
        ? current?.previousMarket || null
        : current?.market || null,
    [current, sourceDate]
  );

  const previewRows = useMemo(
    () => [
      { label: "순금", sellKey: "pureGoldSellPerDon", buyKey: "pureGoldBuyPerDon" },
      { label: "18K", sellKey: "gold18kSellPerDon", buyKey: "gold18kBuyPerDon" },
      { label: "14K", sellKey: "gold14kSellPerDon", buyKey: "gold14kBuyPerDon" },
    ],
    []
  );

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
    if (!/^\d{8}$/.test(dateKey)) throw new Error("기준일을 올바르게 선택해 주세요.");

    if (dateKey !== todayKey()) throw new Error("과거 날짜는 아래 과거 금시세 연쇄 보정 기능을 이용하세요.");

    const normalizedMarket = Object.fromEntries(
      PRICE_FIELDS.map(([key, label]) => {
        const value = numberValue(market[key]);
        if (value <= 0) throw new Error(`${label}를 입력해 주세요.`);
        return [key, value];
      })
    );

    const save = httpsCallable(getFunctions(undefined, "asia-northeast3"), "saveDailyGoldPrice");
    await save({ date: dateKey, market: normalizedMarket, enabled, display14kSellPrice });

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

  const correctionMarket = () => Object.fromEntries(PRICE_FIELDS.map(([key,label]) => {
    const value = numberValue(market[key]);
    if(value<=0) throw new Error(`${label}를 입력해 주세요.`);
    return [key,value];
  }));
  const previewCorrection = async () => {
    const fn=httpsCallable(getFunctions(undefined,"asia-northeast3"),"previewGoldPriceCorrection");
    setCorrectionPreview(null);
    const result=await fn({date:compactDate(sourceDate),market:correctionMarket()});
    setCorrectionPreview(result.data);
    return {message:`${result.data.rows.length}일의 수정 예정 기록을 확인해 주세요.`};
  };
  const applyCorrection = async () => {
    if(!correctionPreview?.expected) throw new Error("먼저 수정 미리보기를 실행하세요.");
    if(!window.confirm(`${correctionPreview.rows.length}일의 과거 기록을 수정하시겠습니까?`)) return {message:"취소했습니다."};
    const fn=httpsCallable(getFunctions(undefined,"asia-northeast3"),"saveGoldPriceCorrection");
    const result=await fn({date:compactDate(sourceDate),market:correctionMarket(),reason:correctionReason,expected:correctionPreview.expected});
    setCorrectionPreview(null);
    return {message:`${result.data.count}일의 기록을 보정했습니다.${result.data.updatedCurrent ? " 현재 공개 시세의 가격 또는 전일 대비 기준도 반영했습니다." : ""} 확정 거래 내역은 변경하지 않았습니다.`};
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

  const loadDate = async () => {
    setCorrectionPreview(null);
    const key = compactDate(sourceDate);
    const snap = await getDoc(doc(db, "goldPriceHistory", key));
    if (!snap.exists()) throw new Error("선택한 날짜에 저장된 시세가 없습니다.");
    const value = snap.data();
    setMarket(Object.fromEntries(
      PRICE_FIELDS.map(([field]) => [field, validPrice(value.market?.[field]) ? String(value.market[field]) : ""])
    ));
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
              <input type="date" value={sourceDate} onChange={(e) => {setSourceDate(e.target.value);setCorrectionPreview(null);}} />
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
                  value={market[key]}
                  placeholder="예: 848000"
                  onChange={(e) => {setCorrectionPreview(null);setMarket((prev) => ({
                    ...prev,
                    [key]: e.target.value.replace(/[^0-9]/g, ""),
                  }));}}
                />
              </Field>
            ))}
          </FormGrid>

          <Hint>
            같은 기준일로 여러 번 저장하면 그날의 최종 시세가 갱신됩니다. 전일 대비는 이전에 저장된 가장 최근 날짜의 최종 시세를 기준으로 유지됩니다.
          </Hint>

          <NotificationOption>
            <NotificationCheck>
              <input
                type="checkbox"
                checked={sendPriceNotification}
                disabled={busy}
                onChange={(e) => setSendPriceNotification(e.target.checked)}
              />
              <span>
                저장 후 금시세 알림 보내기
                <small>
                  광고성 정보 수신에 동의하고 금시세·혜택 알림이 활성화된 회원에게만 발송합니다.
                  단순 수정이나 재저장 시에는 체크하지 않는 것을 권장합니다.
                </small>
              </span>
            </NotificationCheck>
          </NotificationOption>

          <Actions>
            <Button
              $primary
              disabled={busy}
              onClick={() => run(saveAndPublish, "금시세를 저장하고 공개했습니다.")}
            >
              {sendPriceNotification ? "저장·공개 + 알림 발송" : "저장 및 공개"}
            </Button>
            <Button disabled={busy} onClick={() => run(saveDisplaySettings, "표시 설정을 저장했습니다.")}>표시 설정만 저장</Button>
            <Button disabled={busy} onClick={() => run(loadDate, "선택한 날짜의 시세를 불러왔습니다.")}>선택 날짜 불러오기</Button>
          </Actions>
          <Card style={{marginTop:18}}>
            <CardTitle>과거 금시세 연쇄 보정</CardTitle>
            <Hint>선택 날짜는 직접 정정하고, 이후는 다음 직접 등록일 전날까지 함께 보정합니다. 이후 직접 등록한 가격은 유지하며 전일 대비 기준만 다시 계산합니다. 다음 직접 등록일이 없으면 오늘의 공개 시세도 반영합니다. 과거 보정은 알림을 보내지 않습니다.</Hint>
            <Field>수정 사유 (5~200자)
              <input value={correctionReason} maxLength={200} onChange={e=>setCorrectionReason(e.target.value)} placeholder="예: 10월 3일 실제 변동 확인" />
            </Field>
            <Actions>
              <Button disabled={busy} onClick={()=>run(previewCorrection,"미리보기를 확인하세요.")}>보정 미리보기</Button>
              <Button $primary disabled={busy||!correctionPreview} onClick={()=>run(applyCorrection,"기록을 수정했습니다.")}>확인 후 보정 저장</Button>
            </Actions>
            {correctionPreview && <div style={{maxHeight:260,overflow:"auto",marginTop:12}}>
              <strong>변경 예정 {correctionPreview.rows.length}일 / 다음 직접 등록일: {correctionPreview.stopDate ? dateText(correctionPreview.stopDate) : "없음"}</strong>
              {correctionPreview.rows.map(row=><div key={row.date} style={{padding:"6px 0",borderBottom:"1px solid #ddd"}}>
                {dateText(row.date)} · {row.kind==="manual"?"직접 등록":"자동 유지"} · {PRICE_FIELDS.some(([key]) => Number(row.before?.[key]) !== Number(row.after?.[key])) ? "가격 변경" : "동일 가격"}
                <details>
                  <summary>6종 가격 변경 보기</summary>
                  {PRICE_FIELDS.map(([key, label]) => <div key={key}>{label}: {money(row.before?.[key])} → {money(row.after?.[key])}</div>)}
                </details>
              </div>)}
              <Hint>{correctionPreview.updatesCurrent ? "현재 공개 시세의 가격 또는 전일 대비 기준도 반영됩니다." : "현재 공개 시세의 가격은 유지됩니다."}</Hint>
            </div>}
          </Card>
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
