// src/pages/MyGoldVault.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Gem, Minus, Plus, Save, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import {
  Page,
  VaultHero,
  HeroGoldMark,
  HeroKicker,
  HeroTitle,
  HeroAmount,
  HeroValueNote,
  HeroChangeGroup,
  HeroChange,
  HeroStats,
  HeroStat,
  ReadinessPanel,
  HeroActions,
  HeroAddAction,
  HeroExchangeAction,
  GuestModeNote,
  VaultSection,
  ViewTabs,
  ViewTab,
  ViewPanel,
  ViewIntro,
  SummaryHead,
  SummaryItems,
  SummaryItem,
  GoalProgress,
  GoalTrack,
  SectionHead,
  SectionActions,
  AddGoldButton,
  FormOverlay,
  FormSheet,
  FormSheetHead,
  FoldPanel,
  FoldSummary,
  FoldBody,
  CompareRow,
  DateInput,
  CompareButton,
  ComparisonResult,
  CompareError,
  ExchangeCta,
  Form,
  Field,
  Input,
  Select,
  WeightRow,
  UnitToggle,
  UnitButton,
  WeightConversion,
  WeightHint,
  BonusStrip,
  Textarea,
  Buttons,
  Button,
  GhostButton,
  ErrorText,
  ItemList,
  ItemCard,
  ItemMain,
  ItemMetrics,
  ItemActions,
  GoldSeed,
  Empty,
  SaveFeedback,
  Notice,
  GuestSaveCard,
  GuestSaveCopy,
  GuestSaveAction,
} from "@/components/myGoldVault/MyGoldVault.styles";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import MyGoldValueTrend from "@/components/gold/MyGoldValueTrend";
import MyGoldAlertSummary from "@/components/gold/MyGoldAlertSummary";
import MyGoldImportPrompt from "@/components/gold/MyGoldImportPrompt";
import { DON_TO_GRAMS, findGoldProduct } from "@/lib/goldRates";
import {
  GOLD_VAULT_MAX_ITEMS,
  GOLD_VAULT_MAX_LABEL_LENGTH,
  GOLD_VAULT_MAX_NOTE_LENGTH,
  computeVaultMarketValueWon,
  computeVaultValueWon,
  enrichGoldVaultItems,
  getGoldVaultProductOptions,
  getGoldVaultTypeLabel,
  summarizeGoldVaultItems,
  validateGoldVaultValues,
} from "@/lib/goldVaultCatalog";
import {
  createGoldVaultItem,
  createGoldVaultItems,
  deleteGoldVaultItem,
  updateGoldVaultItem,
} from "@/services/goldVaultService";
import {
  compactGoldPriceDate,
  getGoldPriceAtOrBefore,
} from "@/services/goldPriceHistoryService";
import {
  clearGoldVaultImportDraft,
  readGoldVaultImportDraft,
  saveGoldVaultGuestDraft,
} from "@/lib/goldVaultImportDraft";
import {
  DEFAULT_GUEST_MY_GOLD_ITEMS,
  GUEST_MY_GOLD_BONUS_G,
  clearGuestMyGoldDemo,
  readGuestMyGoldItems,
  resetGuestMyGoldItems,
  saveGuestMyGoldItems,
} from "@/lib/myGoldGuestDemo";


const EMPTY_FORM = { label: "", productId: "", goldType: "", weightValue: "", weightUnit: "g", note: "" };


const GOLD_EXCHANGE_MAX_PRODUCTS = 20;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function weightInputToGrams(form) {
  const value = Number(form?.weightValue);
  if (!Number.isFinite(value)) return Number.NaN;
  return form?.weightUnit === "don" ? value * DON_TO_GRAMS : value;
}

function formatGramsAndDon(value) {
  const grams = Number(value);
  if (!Number.isFinite(grams) || grams <= 0) return "-";
  return `${grams.toFixed(2)}g · ${(grams / DON_TO_GRAMS).toFixed(2)}돈`;
}

function formatDateKey(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return text || "-";
  return `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`;
}

function koreaTodayInputDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getValueChange(currentValue, previousValue) {
  const current = Number(currentValue);
  const previous = Number(previousValue);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || current <= 0 || previous <= 0) {
    return { amount: 0, percent: null, direction: "unknown" };
  }

  const amount = current - previous;
  return {
    amount,
    percent: (amount / previous) * 100,
    direction: amount > 0 ? "up" : amount < 0 ? "down" : "same",
  };
}

function formatSignedWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "0원";
  return `${number > 0 ? "+" : "-"}${Math.abs(Math.round(number)).toLocaleString("ko-KR")}원`;
}

function formatSignedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "비교 준비 중";
  if (number === 0) return "0.00%";
  return `${number > 0 ? "+" : "-"}${Math.abs(number).toFixed(2)}%`;
}

function guestVaultFingerprint(items) {
  return JSON.stringify(
    (Array.isArray(items) ? items : []).map((item) => ({
      label: String(item?.label || "").trim(),
      goldType: String(item?.goldType || "").trim(),
      weightG: Number(item?.weightG || 0),
      note: String(item?.note || "").trim(),
    }))
  );
}

const MY_GOLD_BAR_DENOMS = Object.freeze([
  { grams: 500, label: "500g 골드바" },
  { grams: 100, label: "100g 골드바" },
  { grams: 75, label: "20돈(75g) 골드바" },
  { grams: 56.25, label: "15돈(56.25g) 골드바" },
  { grams: 50, label: "50g 골드바" },
  { grams: 37.5, label: "10돈(37.5g) 골드바" },
  { grams: 30, label: "30g 골드바" },
  { grams: 20, label: "20g 골드바" },
  { grams: 18.75, label: "5돈(18.75g) 골드바" },
  { grams: 11.25, label: "3돈(11.25g) 골드바" },
  { grams: 10, label: "10g 골드바" },
  { grams: 7.5, label: "2돈(7.5g) 골드바" },
  { grams: 5, label: "5g 골드바" },
  { grams: 3.75, label: "1돈(3.75g) 골드바" },
  { grams: 3, label: "3g 골드바" },
  { grams: 1, label: "1g 골드바" },
]);

function getGoldBarReadiness(pureGoldG) {
  const grams = Number(pureGoldG) || 0;
  if (grams <= 0) return null;
  const available = MY_GOLD_BAR_DENOMS.find((item) => item.grams <= grams + 1e-9);
  if (available) {
    return {
      available: true,
      label: available.label,
      grams: available.grams,
      remainingG: Math.max(0, grams - available.grams),
    };
  }
  return {
    available: false,
    label: "1g 골드바",
    grams: 1,
    neededG: Math.max(0, 1 - grams),
  };
}

export default function MyGoldVault() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    items,
    itemsLoading,
    publicPriceEnabled,
    market,
    previousMarket,
    pureGoldSellPricePerDon,
    customerSellPricePerDon,
    previousCustomerSellPricePerDon,
    rates,
    summary,
  } = useGoldVaultDashboard(user?.uid);
  const bonus = useBonusGoldBalance(user?.uid);
  const isGuest = !user?.uid;
  const [guestRawItems, setGuestRawItems] = useState(() => readGuestMyGoldItems());
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [compareDate, setCompareDate] = useState("");
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [historicalMeta, setHistoricalMeta] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [weeklyTrendChange, setWeeklyTrendChange] = useState(null);
  const view = location.pathname === "/my-gold/items"
    ? "items"
    : location.pathname === "/my-gold/trend"
      ? "trend"
      : "summary";
  const isSummaryView = view === "summary";
  const isItemsView = view === "items";
  const isTrendView = view === "trend";
  const importKind = new URLSearchParams(location.search).get("import");
  const addRequested = new URLSearchParams(location.search).get("add") === "1";
  const importRequested = importKind === "calculator" || importKind === "guest";
  const importSource = importKind === "guest" ? "guest-my-gold" : "gold-exchange-calculator";
  const [importDraft, setImportDraft] = useState(() =>
    importRequested ? readGoldVaultImportDraft(importSource) : null
  );
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");

  useEffect(() => {
    if (!importRequested) return;
    setImportDraft(readGoldVaultImportDraft(importSource));
    setImportError("");
  }, [importRequested, importSource]);

  useEffect(() => {
    if (!saveFeedback) return undefined;
    const timer = window.setTimeout(() => setSaveFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [saveFeedback]);

  useEffect(() => {
    if (!formOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        setFormOpen(false);
        setEditingId("");
        setForm(EMPTY_FORM);
        setError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [formOpen, saving]);

  const guestItems = useMemo(
    () =>
      enrichGoldVaultItems(guestRawItems, {
        rates,
        market,
        previousMarket,
        publicPriceEnabled,
        pureGoldBuyPricePerDon: customerSellPricePerDon,
        previousPureGoldBuyPricePerDon: previousCustomerSellPricePerDon,
        pureGoldSellPricePerDon,
      }),
    [
      customerSellPricePerDon,
      guestRawItems,
      market,
      previousCustomerSellPricePerDon,
      previousMarket,
      publicPriceEnabled,
      pureGoldSellPricePerDon,
      rates,
    ]
  );

  const guestSummary = useMemo(
    () => summarizeGoldVaultItems(guestItems),
    [guestItems]
  );

  const activeItems = isGuest ? guestItems : items;
  const activeSummary = isGuest ? guestSummary : summary;
  const hasPersonalizedGuestVault = useMemo(() => {
    if (!isGuest || guestRawItems.length === 0) return false;
    return guestVaultFingerprint(guestRawItems) !== guestVaultFingerprint(DEFAULT_GUEST_MY_GOLD_ITEMS);
  }, [guestRawItems, isGuest]);
  const bonusBalanceG = isGuest ? GUEST_MY_GOLD_BONUS_G : Number(bonus.balanceG || 0);
  const vaultLoading = isGuest ? false : itemsLoading || bonus.loading;
  const canAddMore = activeItems.length < GOLD_VAULT_MAX_ITEMS || !!editingId;

  useEffect(() => {
    if (!addRequested || formOpen || editingId) return;

    const params = new URLSearchParams(location.search);
    params.delete("add");
    const nextSearch = params.toString();

    if (!canAddMore) {
      setError(`MY GOLD에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다.`);
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
        { replace: true }
      );
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId("");
    setError("");
    setFormOpen(true);
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true }
    );
  }, [
    addRequested,
    canAddMore,
    editingId,
    formOpen,
    location.pathname,
    location.search,
    navigate,
  ]);

  const sortedItems = useMemo(() => activeItems, [activeItems]);
  const myGoldProductOptions = useMemo(
    () => getGoldVaultProductOptions(rates),
    [rates]
  );
  const exchangeProducts = useMemo(
    () =>
      sortedItems.slice(0, GOLD_EXCHANGE_MAX_PRODUCTS).map((item) => ({
        productId: item.productId || "",
        goldType: item.goldType,
        quantity: Number(item.weightG || 0),
        inputUnit: "g",
        exchangeType: "999.9골드바",
        sourceItemId: item.id,
        sourceLabel: item.label || "금제품",
      })),
    [sortedItems]
  );
  const weightReference = useMemo(() => {
    const value = Number(form.weightValue);
    if (!Number.isFinite(value) || value <= 0) return "";

    if (form.weightUnit === "don") {
      return `${value.toFixed(2)}돈 = ${(value * DON_TO_GRAMS).toFixed(2)}g`;
    }

    return `${value.toFixed(2)}g = ${(value / DON_TO_GRAMS).toFixed(2)}돈`;
  }, [form.weightUnit, form.weightValue]);

  const bonusCurrentValueWon =
    publicPriceEnabled && bonusBalanceG > 0
      ? computeVaultValueWon(bonusBalanceG, customerSellPricePerDon)
      : 0;
  const bonusPreviousValueWon =
    publicPriceEnabled && bonusBalanceG > 0
      ? computeVaultValueWon(bonusBalanceG, previousCustomerSellPricePerDon)
      : 0;
  const vaultValueWon = Number(activeSummary.estimatedValueWon || 0) + bonusCurrentValueWon;
  const previousVaultValueWon =
    Number(activeSummary.previousEstimatedValueWon || 0) + bonusPreviousValueWon;
  const vaultPureGoldG = Number(activeSummary.pureGoldG || 0) + bonusBalanceG;
  const hasVaultContent = activeSummary.itemCount > 0 || bonusBalanceG > 0;
  const barReadiness = useMemo(
    () => getGoldBarReadiness(activeSummary.pureGoldG),
    [activeSummary.pureGoldG]
  );
  const nextBarTarget = useMemo(() => {
    const grams = Number(activeSummary.pureGoldG) || 0;
    if (grams <= 0) return MY_GOLD_BAR_DENOMS[MY_GOLD_BAR_DENOMS.length - 1];
    const larger = MY_GOLD_BAR_DENOMS.filter((item) => item.grams > grams + 1e-9);
    return larger.length > 0 ? larger[larger.length - 1] : null;
  }, [activeSummary.pureGoldG]);
  const nextBarProgress = useMemo(() => {
    const grams = Number(activeSummary.pureGoldG) || 0;
    const target = Number(nextBarTarget?.grams) || 0;
    if (target <= 0) return 100;
    return Math.max(0, Math.min(100, (grams / target) * 100));
  }, [activeSummary.pureGoldG, nextBarTarget]);
  const previewItems = useMemo(() => sortedItems.slice(0, 2), [sortedItems]);
  const handleWeeklyTrendChange = useCallback((next) => {
    setWeeklyTrendChange(next || null);
  }, []);

  const currentChange = getValueChange(vaultValueWon, previousVaultValueWon);
  const CurrentChangeIcon =
    currentChange.direction === "up"
      ? TrendingUp
      : currentChange.direction === "down"
        ? TrendingDown
        : Minus;
  const historicalValueWon = useMemo(() => {
    if (!historicalMeta?.market || !historicalPrice || historicalPrice <= 0) return 0;
    const registeredValue = activeItems.reduce(
      (sum, item) => sum + computeVaultMarketValueWon(item, rates, historicalMeta.market),
      0
    );
    const bonusValue = computeVaultValueWon(
      Math.max(0, Number(bonusBalanceG) || 0),
      Number(historicalMeta.market.pureGoldBuyPerDon) || 0
    );
    return registeredValue + bonusValue;
  }, [activeItems, bonusBalanceG, historicalMeta, historicalPrice, rates]);
  const historicalChange = historicalPrice
    ? getValueChange(vaultValueWon, historicalValueWon)
    : null;

  const confirmCalculatorImport = async () => {
    if (!user?.uid || importSaving) return;

    const draft = importDraft || readGoldVaultImportDraft(importSource);
    const pendingItems = Array.isArray(draft?.items) ? draft.items : [];
    if (!pendingItems.length) {
      setImportDraft(null);
      setImportError(
        importKind === "guest"
          ? "저장할 MY GOLD 체험 정보가 없습니다. MY GOLD 체험에서 다시 만들어 주세요."
          : "저장할 계산 정보가 없습니다. 금교환 계산기에서 다시 계산해 주세요."
      );
      return;
    }

    if (itemsLoading) {
      setImportError("현재 MY GOLD 기록을 확인하고 있습니다. 잠시 후 다시 눌러 주세요.");
      return;
    }

    if (items.length + pendingItems.length > GOLD_VAULT_MAX_ITEMS) {
      setImportError(
        `MY GOLD는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다. 현재 ${items.length}개가 있어 ${pendingItems.length}개를 모두 추가할 공간이 부족합니다.`
      );
      return;
    }

    setImportSaving(true);
    setImportError("");
    try {
      await createGoldVaultItems(user.uid, pendingItems);
      clearGoldVaultImportDraft();
      if (draft?.source === "guest-my-gold") clearGuestMyGoldDemo();
      setImportDraft(null);
      navigate("/my-gold", {
        replace: true,
        state: {
          myGoldImportSuccess: pendingItems.length,
          myGoldImportSource: draft?.source || "gold-exchange-calculator",
        },
      });
    } catch (saveError) {
      setImportError(saveError?.message || "MY GOLD에 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setImportSaving(false);
    }
  };

  const cancelCalculatorImport = () => {
    clearGoldVaultImportDraft();
    setImportDraft(null);
    setImportError("");
    navigate("/my-gold", { replace: true });
  };

  const openSingleItemExchange = (item) => {
    if (!item) return;
    navigate("/gold-exchange", {
      state: {
        source: "my-gold",
        vaultProducts: [
          {
            productId: item.productId || "",
            goldType: item.goldType,
            quantity: Number(item.weightG || 0),
            inputUnit: "g",
            exchangeType: "999.9골드바",
            sourceItemId: item.id,
            sourceLabel: item.label || "금제품",
          },
        ],
      },
    });
  };

  const openAllItemsExchange = () => {
    if (sortedItems.length === 0) return;
    if (sortedItems.length > GOLD_EXCHANGE_MAX_PRODUCTS) {
      setError(
        `\uAE08\uAD50\uD658\uC740 \uD55C \uBC88\uC5D0 \uCD5C\uB300 ${GOLD_EXCHANGE_MAX_PRODUCTS}\uAC1C\uAE4C\uC9C0 \uC9C4\uD589\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uAE30\uB85D\uC744 ${GOLD_EXCHANGE_MAX_PRODUCTS}\uAC1C \uC774\uD558\uB85C \uC815\uB9AC\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.`
      );
      return;
    }

    setError("");
    navigate("/gold-exchange", {
      state: {
        source: "my-gold",
        vaultProducts: exchangeProducts,
      },
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setError("");
  };

  const openAddForm = () => {
    if (!canAddMore) {
      setError(`MY GOLD에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다.`);
      return;
    }
    resetForm();
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    resetForm();
    setFormOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!canAddMore) {
      setError(`MY GOLD에는 최대 ${GOLD_VAULT_MAX_ITEMS}개까지 기록할 수 있습니다.`);
      return;
    }

    const wasEditing = Boolean(editingId);
    setSaving(true);
    setError("");
    try {
      const values = {
        label: form.label,
        productId: form.productId,
        goldType: form.goldType,
        weightG: weightInputToGrams(form),
        note: form.note,
      };

      if (isGuest) {
        const normalized = validateGoldVaultValues(values, rates);
        const nextItem = {
          id: editingId || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...normalized,
        };
        const nextItems = editingId
          ? guestRawItems.map((item) => item.id === editingId ? nextItem : item)
          : [nextItem, ...guestRawItems];
        const savedItems = saveGuestMyGoldItems(nextItems);
        setGuestRawItems(savedItems);
      } else if (editingId) {
        await updateGoldVaultItem(user.uid, editingId, values);
      } else {
        await createGoldVaultItem(user.uid, values);
      }
      resetForm();
      setFormOpen(false);
      setSaveFeedback(
        wasEditing
          ? "MY GOLD 기록을 업데이트했어요."
          : isGuest
            ? "MY GOLD 체험에 이어졌어요."
            : "MY GOLD에 이어졌어요."
      );
    } catch (submitError) {
      setError(submitError?.message || "저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    const policy = findGoldProduct(rates, { productId: item.productId, goldType: item.goldType });
    setForm({
      label: item.label || "",
      productId: policy?.id || item.productId || "",
      goldType: item.goldType || policy?.legacyGoldType || policy?.displayName || "",
      weightValue: String(item.weightG || ""),
      weightUnit: "g",
      note: item.note || "",
    });
    setError("");
    setFormOpen(true);
  };

  const remove = async (item) => {
    if (!window.confirm(`“${item.label || "금제품"}”을 ${isGuest ? "MY GOLD 체험" : "MY GOLD"}에서 삭제할까요?`)) return;
    try {
      if (isGuest) {
        const savedItems = saveGuestMyGoldItems(
          guestRawItems.filter((current) => current.id !== item.id)
        );
        setGuestRawItems(savedItems);
      } else {
        await deleteGoldVaultItem(user.uid, item.id);
      }
      if (editingId === item.id) resetForm();
    } catch (deleteError) {
      setError(deleteError?.message || "삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const resetGuestDemo = () => {
    if (!isGuest) return;
    if (!window.confirm("MY GOLD 체험을 처음 예시 상태로 되돌릴까요?")) return;
    setGuestRawItems(resetGuestMyGoldItems());
    resetForm();
    setCompareDate("");
    setHistoricalPrice(null);
    setHistoricalMeta(null);
    setCompareError("");
  };

  const saveGuestVaultToAccount = () => {
    if (!isGuest || guestRawItems.length === 0) return;
    try {
      saveGoldVaultGuestDraft(guestRawItems);
      navigate("/login?next=%2Fmy-gold%3Fimport%3Dguest", {
        state: {
          from: "/my-gold?import=guest",
          intent: "save-guest-my-gold",
        },
      });
    } catch (draftError) {
      setError(draftError?.message || "MY GOLD 체험 기록을 임시 저장하지 못했습니다.");
    }
  };

  const compareHistory = async () => {
    const key = compactGoldPriceDate(compareDate);
    setCompareError("");
    setHistoricalPrice(null);
    setHistoricalMeta(null);

    if (!/^\d{8}$/.test(key)) {
      setCompareError("비교할 날짜를 선택해 주세요.");
      return;
    }

    setCompareLoading(true);
    try {
      const selected = await getGoldPriceAtOrBefore(key);
      const price =
        Number(selected?.market?.pureGoldBuyPerDon) ||
        Number(selected?.pureGoldBuyPerDon) ||
        0;
      if (!selected || price <= 0) {
        setCompareError("선택한 날짜까지 저장된 공개 시세가 없습니다.");
        return;
      }

      setHistoricalPrice(price);
      setHistoricalMeta(selected);
    } catch (historyError) {
      console.warn("[MyGoldVault] 과거 가치 비교 실패:", historyError?.message || historyError);
      setCompareError("과거 시세를 불러오지 못했습니다.");
    } finally {
      setCompareLoading(false);
    }
  };

  const resetComparison = () => {
    setCompareDate("");
    setHistoricalPrice(null);
    setHistoricalMeta(null);
    setCompareError("");
  };

  useEffect(() => {
    const supportedTargets = new Set(["#my-gold-value-trend"]);
    if (!supportedTargets.has(location.hash)) return;
    const targetId = location.hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [location.hash, user?.uid]);

  return (
    <Page>
      {saveFeedback && (
        <SaveFeedback role="status" aria-live="polite">
          <Sparkles aria-hidden /> {saveFeedback}
        </SaveFeedback>
      )}

      <ViewTabs aria-label="MY GOLD 화면 선택">
        <ViewTab to="/my-gold" $active={isSummaryView} aria-current={isSummaryView ? "page" : undefined}>요약</ViewTab>
        <ViewTab to="/my-gold/items" $active={isItemsView} aria-current={isItemsView ? "page" : undefined}>내 금</ViewTab>
        <ViewTab to="/my-gold/trend" $active={isTrendView} aria-current={isTrendView ? "page" : undefined}>가치 변화</ViewTab>
      </ViewTabs>

      {isSummaryView && (
        <VaultHero aria-labelledby="my-vault-current-value-title">
          <HeroGoldMark
            size={62}
            delay={80}
            hint
            ariaLabel="Living Gold로 오늘 MY GOLD 보기"
            title={hasVaultContent ? "오늘의 MY GOLD" : "첫 금빛을 이어보세요."}
            value={
              vaultLoading
                ? "가치를 확인하고 있어요"
                : hasVaultContent && publicPriceEnabled
                  ? formatWon(vaultValueWon)
                  : undefined
            }
            description={
              vaultLoading
                ? "MY GOLD의 오늘 가치를 불러오고 있습니다."
                : hasVaultContent && publicPriceEnabled
                  ? `${Number.isFinite(currentChange.percent) ? `어제보다 ${formatSignedWon(currentChange.amount)} · ` : ""}예상 순금 ${Number(activeSummary.pureGoldG || 0).toFixed(2)}g`
                  : "금 하나를 기록하면 오늘 가치와 변화가 이 작은 금빛에 이어집니다."
            }
            actionLabel={hasVaultContent ? "내 금 자세히 보기" : "첫 금 기록하기"}
            actionTo={hasVaultContent ? "/my-gold/items" : "/my-gold/items?add=1"}
          />
          <HeroKicker>
            <Gem size={15} aria-hidden /> {isGuest ? "MY GOLD · 체험" : "MY GOLD"}
          </HeroKicker>
          <HeroTitle id="my-vault-current-value-title">내 금의 오늘 가치</HeroTitle>
          <HeroAmount $empty={!vaultLoading && !hasVaultContent}>
            {vaultLoading
              ? "불러오는 중"
              : !hasVaultContent
                ? "첫 금을 기록해 보세요"
                : publicPriceEnabled
                  ? formatWon(vaultValueWon)
                  : "시세 공개 대기"}
          </HeroAmount>
          {!vaultLoading && hasVaultContent && publicPriceEnabled && (
            <HeroValueNote>
              {bonusBalanceG > 0
                ? "MY GOLD에 기록한 금과 MEMBER GOLD를 합산한 오늘 참고가치입니다."
                : "MY GOLD에 기록한 금의 오늘 참고가치입니다."}
            </HeroValueNote>
          )}
          {!vaultLoading && activeSummary.itemCount > 0 && publicPriceEnabled && Number(activeSummary.replacementValueWon) > 0 && (
            <HeroValueNote>
              기록한 금의 예상 순금과 같은 양의 999.9를 오늘 새로 구입하면 {formatWon(activeSummary.replacementValueWon)} · 골드바 공임 제외
            </HeroValueNote>
          )}

          {!vaultLoading && hasVaultContent && publicPriceEnabled && (
            <HeroChangeGroup>
              <HeroChange $direction={currentChange.direction}>
                <CurrentChangeIcon aria-hidden />
                {Number.isFinite(currentChange.percent)
                  ? `오늘 ${formatSignedWon(currentChange.amount)} · ${formatSignedPercent(currentChange.percent)}`
                  : "전일 비교 준비 중"}
              </HeroChange>
              {weeklyTrendChange && Number.isFinite(weeklyTrendChange.percent) && (
                <HeroChange $direction={weeklyTrendChange.direction}>
                  {weeklyTrendChange.direction === "up" ? (
                    <TrendingUp aria-hidden />
                  ) : weeklyTrendChange.direction === "down" ? (
                    <TrendingDown aria-hidden />
                  ) : (
                    <Minus aria-hidden />
                  )}
                  7일 {formatSignedWon(weeklyTrendChange.amount)} · {formatSignedPercent(weeklyTrendChange.percent)}
                </HeroChange>
              )}
            </HeroChangeGroup>
          )}

          <HeroStats $hasBonus={bonusBalanceG > 0}>
            <HeroStat>
              <span>기록 중량</span>
              <strong>{Number(activeSummary.totalWeightG || 0).toFixed(2)}g</strong>
            </HeroStat>
            <HeroStat>
              <span>예상 순금</span>
              <strong>{Number(activeSummary.pureGoldG || 0).toFixed(2)}g</strong>
            </HeroStat>
            {bonusBalanceG > 0 && (
              <HeroStat>
                <span>MEMBER GOLD</span>
                <strong>{bonusBalanceG.toFixed(3)}g</strong>
              </HeroStat>
            )}
          </HeroStats>

          <HeroActions>
            <HeroAddAction
              type="button"
              onClick={() => navigate("/my-gold/items?add=1")}
              disabled={!canAddMore}
            >
              <Plus aria-hidden /> 금 추가
            </HeroAddAction>
            <HeroExchangeAction to="/my-gold/trend" aria-label="내 금 가치 변화 자세히 보기">
              <TrendingUp aria-hidden />
              가치 변화 보기
              <ArrowRight aria-hidden />
            </HeroExchangeAction>
          </HeroActions>
          {isGuest && (
            <GuestModeNote>
              로그인 없이 MY GOLD를 체험할 수 있습니다. 실제 계정 저장과 푸시 알림은 로그인 후 연결됩니다.
            </GuestModeNote>
          )}
        </VaultHero>
      )}

      {Number(location.state?.myGoldImportSuccess || 0) > 0 && (
        <Notice role="status">
          {location.state?.myGoldImportSource === "guest-my-gold"
            ? `체험에서 만든 금 ${Number(location.state.myGoldImportSuccess)}개를 MY GOLD에 저장했습니다.`
            : `금교환 계산에서 가져온 금 ${Number(location.state.myGoldImportSuccess)}개를 MY GOLD에 저장했습니다.`}
          {" "}현재 시세와 교환 기준으로 가치가 자동 계산됩니다.
        </Notice>
      )}

      {!isGuest && importRequested && (
        <MyGoldImportPrompt
          draft={importDraft}
          source={importSource}
          currentCount={items.length}
          maxItems={GOLD_VAULT_MAX_ITEMS}
          loading={itemsLoading}
          saving={importSaving}
          error={importError}
          onConfirm={confirmCalculatorImport}
          onCancel={cancelCalculatorImport}
        />
      )}

      {isSummaryView && (
        <>
          <VaultSection aria-labelledby="my-gold-summary-items-title">
            <SummaryHead>
              <strong id="my-gold-summary-items-title">{isGuest ? "체험 중인 금" : "내가 기록한 금"}</strong>
              <Link to="/my-gold/items">
                {sortedItems.length > 0 ? `${sortedItems.length}개 전체 관리` : "금 기록하기"} <ChevronRight size={14} aria-hidden />
              </Link>
            </SummaryHead>

            {vaultLoading ? (
              <Empty>MY GOLD 기록을 불러오는 중입니다.</Empty>
            ) : previewItems.length > 0 ? (
              <SummaryItems>
                {previewItems.map((item) => (
                  <SummaryItem key={item.id}>
                    <div className="copy">
                      <strong>{item.label}</strong>
                      <small>{getGoldVaultTypeLabel(item.goldType, rates, item.productId)} · {Number(item.weightG || 0).toFixed(2)}g</small>
                    </div>
                    <span className="value">{publicPriceEnabled ? formatWon(item.estimatedValueWon) : `${Number(item.pureGoldG || 0).toFixed(2)}g`}</span>
                  </SummaryItem>
                ))}
              </SummaryItems>
            ) : (
              <Empty>
                <GoldSeed aria-hidden />
                <strong>아직 기록한 금이 없습니다.</strong>
                <span>금 하나를 기록하면 오늘 가치와 가격 변화를 바로 확인할 수 있습니다.</span>
                <AddGoldButton type="button" onClick={() => navigate("/my-gold/items?add=1")}>
                  <Plus size={15} aria-hidden /> 첫 금 기록하기
                </AddGoldButton>
              </Empty>
            )}
          </VaultSection>

          {isGuest && hasPersonalizedGuestVault && activeSummary.itemCount > 0 && (
            <GuestSaveCard aria-label="MY GOLD 회원가입 저장 안내">
              <GuestSaveCopy>
                <h2>오늘 확인한 내 금, MY GOLD에 이어두세요.</h2>
                <p>지금 입력한 금 기록을 그대로 저장하면 다음에도 오늘 가치와 변화, 예상 순금량을 이어서 확인할 수 있습니다.</p>
              </GuestSaveCopy>
              <GuestSaveAction type="button" onClick={saveGuestVaultToAccount}>
                <Save aria-hidden /> MY GOLD 기록 저장하기 <ArrowRight aria-hidden />
              </GuestSaveAction>
            </GuestSaveCard>
          )}

          {hasVaultContent && publicPriceEnabled && (
            <MyGoldValueTrend
              pureGoldG={vaultPureGoldG}
              currentPricePerDon={customerSellPricePerDon}
              currentMarket={market}
              enabled={!vaultLoading && hasVaultContent && publicPriceEnabled}
              onWeeklyChange={handleWeeklyTrendChange}
              bonusOnly={activeSummary.itemCount === 0 && bonusBalanceG > 0}
              bonusGoldG={bonusBalanceG}
              items={activeItems}
              rates={rates}
              compact
              detailsTo="/my-gold/trend"
            />
          )}

          <ReadinessPanel
            to="/gold-exchange"
            state={{ source: "my-gold", vaultProducts: exchangeProducts }}
            aria-label="MY GOLD 예상 순금량으로 금교환 페이지 열기"
          >
            <div>
              <small>GOLD TO GOLD</small>
              <strong>
                {activeSummary.itemCount > 0
                  ? barReadiness?.available
                    ? `${barReadiness.label} 교환 가능`
                    : `1g 골드바까지 약 ${Number(barReadiness?.neededG || 0).toFixed(2)}g 더 필요`
                  : "금 하나를 기록하면 교환 가능한 999.9 GOLD를 확인합니다."}
              </strong>
              {activeSummary.itemCount > 0 && nextBarTarget && (
                <GoalProgress>
                  <div className="labels">
                    <span>현재 {Number(activeSummary.pureGoldG || 0).toFixed(2)}g</span>
                    <span>다음 {nextBarTarget.label}까지 {Math.max(0, Number(nextBarTarget.grams) - Number(activeSummary.pureGoldG || 0)).toFixed(2)}g</span>
                  </div>
                  <GoalTrack $progress={nextBarProgress} aria-hidden><span /></GoalTrack>
                </GoalProgress>
              )}
            </div>
            <ChevronRight aria-hidden />
          </ReadinessPanel>

          <ExchangeCta to={isGuest ? "/register" : "/profile"} aria-label="MEMBER GOLD 회원 혜택 보기">
            <div>
              <small><Sparkles size={12} aria-hidden /> MEMBER GOLD{isGuest ? " · 체험" : ""}</small>
              <strong>순금 {bonusBalanceG.toFixed(2)}g</strong>
              <p>{isGuest ? "회원 혜택 순금이 MY GOLD 가치에 반영되는 모습을 체험하고 있습니다." : "회원 혜택으로 적립된 금이며 MY GOLD 오늘 참고가치와 가치 변화에 함께 반영됩니다."}</p>
            </div>
            <ChevronRight aria-hidden />
          </ExchangeCta>

          <MyGoldAlertSummary uid={user?.uid} demoMode={isGuest} compact />
        </>
      )}

      {isItemsView && (
        <ViewPanel key="items">
          <ViewIntro>
            <div>
              <h1>{isGuest ? "체험 중인 금 관리" : "내가 기록한 금"}</h1>
              <p>금마다 이름을 붙이고 종류와 중량을 기록해 오늘 가치와 예상 순금량을 관리합니다.</p>
            </div>
            <AddGoldButton type="button" onClick={openAddForm} disabled={!canAddMore}>
              <Plus size={15} aria-hidden /> 금 추가
            </AddGoldButton>
          </ViewIntro>

          <VaultSection aria-labelledby="my-vault-items-title">
            <SectionHead>
              <div>
                <h2 id="my-vault-items-title">기록 목록</h2>
                <p>
                  {isGuest
                    ? "예시 금을 수정하거나 내 금을 새로 기록해 보세요. 변경한 내용이 MY GOLD 요약과 가치 변화에 바로 반영됩니다."
                    : `현재 ${sortedItems.length}개 · 기록 중량 ${Number(activeSummary.totalWeightG || 0).toFixed(2)}g · 예상 순금 ${Number(activeSummary.pureGoldG || 0).toFixed(2)}g`}
                </p>
              </div>
              <SectionActions>
                {sortedItems.length > 0 && (
                  <AddGoldButton
                    type="button"
                    onClick={openAllItemsExchange}
                    aria-label={"\uAE30\uB85D\uB41C \uAE08 \uC804\uCCB4\uB97C \uAE08\uAD50\uD658\uC73C\uB85C \uB118\uAE30\uAE30"}
                  >
                    {"\uC804\uCCB4 \uAD50\uD658"} ({sortedItems.length})
                  </AddGoldButton>
                )}
                {isGuest && <AddGoldButton type="button" onClick={resetGuestDemo}>예시 초기화</AddGoldButton>}
              </SectionActions>
            </SectionHead>

            {error && !formOpen && <ErrorText role="alert">{error}</ErrorText>}

            {vaultLoading ? (
              <Empty>MY GOLD 기록을 불러오는 중입니다.</Empty>
            ) : sortedItems.length > 0 ? (
              <ItemList>
                {sortedItems.map((item) => (
                  <ItemCard key={item.id}>
                    <ItemMain>
                      <h3>{item.label}</h3>
                      <p>{getGoldVaultTypeLabel(item.goldType, rates, item.productId)}{item.note ? ` · ${item.note}` : ""}</p>
                      <ItemMetrics>
                        <span>기록 <strong>{formatGramsAndDon(item.weightG)}</strong></span>
                        <span>예상 순금량 <strong>{Number(item.pureGoldG || 0).toFixed(2)}g</strong></span>
                        {publicPriceEnabled && <span>오늘 가치 <strong>{formatWon(item.estimatedValueWon)}</strong></span>}
                        {publicPriceEnabled && Number(item.replacementValueWon) > 0 && (
                          <span>같은 양의 999.9 신규구매가 <strong>{formatWon(item.replacementValueWon)}</strong></span>
                        )}
                      </ItemMetrics>
                    </ItemMain>
                    <ItemActions>
                      <button type="button" data-variant="exchange" onClick={() => openSingleItemExchange(item)} aria-label={`${item.label} 금교환 계산`} title="금교환 계산">교환</button>
                      <button type="button" onClick={() => startEdit(item)} aria-label={`${item.label} 수정`} title="수정">수정</button>
                      <button type="button" data-variant="danger" onClick={() => remove(item)} aria-label={`${item.label} 삭제`} title="삭제">삭제</button>
                    </ItemActions>
                  </ItemCard>
                ))}
              </ItemList>
            ) : (
              <Empty>
                <GoldSeed aria-hidden />
                <strong>아직 기록한 금이 없습니다.</strong>
                <span>금 하나를 기록하면 오늘 가치와 가격 변화를 바로 확인할 수 있습니다.</span>
                <AddGoldButton type="button" onClick={openAddForm}><Plus size={15} aria-hidden /> 첫 금 기록하기</AddGoldButton>
              </Empty>
            )}
          </VaultSection>

          {isGuest && hasPersonalizedGuestVault && activeSummary.itemCount > 0 && (
            <GuestSaveCard aria-label="MY GOLD 회원가입 저장 안내">
              <GuestSaveCopy>
                <h2>기록한 금을 계정에 그대로 이어두세요.</h2>
                <p>회원가입 후에도 지금 만든 금 이름·종류·중량이 그대로 MY GOLD에 이어집니다.</p>
              </GuestSaveCopy>
              <GuestSaveAction type="button" onClick={saveGuestVaultToAccount}>
                <Save aria-hidden /> MY GOLD 기록 저장하기 <ArrowRight aria-hidden />
              </GuestSaveAction>
            </GuestSaveCard>
          )}
        </ViewPanel>
      )}

      {isTrendView && (
        <ViewPanel key="trend">
          {hasVaultContent && publicPriceEnabled ? (
            <MyGoldValueTrend
              pureGoldG={vaultPureGoldG}
              currentPricePerDon={customerSellPricePerDon}
              currentMarket={market}
              enabled={!vaultLoading && hasVaultContent && publicPriceEnabled}
              onWeeklyChange={handleWeeklyTrendChange}
              bonusOnly={activeSummary.itemCount === 0 && bonusBalanceG > 0}
              bonusGoldG={bonusBalanceG}
              items={activeItems}
              rates={rates}
            />
          ) : (
            <Empty>
              <TrendingUp size={28} aria-hidden />
              <strong>가치 변화를 보려면 먼저 금을 기록해 주세요.</strong>
              <AddGoldButton type="button" onClick={() => navigate("/my-gold/items?add=1")}><Plus size={15} aria-hidden /> 금 기록하기</AddGoldButton>
            </Empty>
          )}

          {hasVaultContent && publicPriceEnabled && (
            <FoldPanel>
              <FoldSummary aria-controls="my-gold-history-content">
                <div>
                  <h2 id="my-gold-history-title">특정 날짜와 비교</h2>
                  <small>원하는 날짜 하나를 골라 그날의 공개 시세 기준 가치와 오늘을 비교합니다.</small>
                </div>
              </FoldSummary>
              <FoldBody id="my-gold-history-content" aria-labelledby="my-gold-history-title">
                <CompareRow>
                  <DateInput
                    type="date"
                    value={compareDate}
                    max={koreaTodayInputDate()}
                    aria-label="내 금 가치 비교 기준 날짜"
                    onChange={(event) => {
                      setCompareDate(event.target.value);
                      setHistoricalPrice(null);
                      setHistoricalMeta(null);
                      setCompareError("");
                    }}
                  />
                  <CompareButton type="button" disabled={compareLoading} onClick={compareHistory}>
                    {compareLoading ? "비교 중" : "비교"}
                  </CompareButton>
                  {(compareDate || historicalPrice) && (
                    <CompareButton type="button" data-variant="ghost" onClick={resetComparison}>초기화</CompareButton>
                  )}
                </CompareRow>
                {compareError && <CompareError role="alert">{compareError}</CompareError>}
                {historicalPrice && historicalMeta && historicalChange && (
                  <ComparisonResult>
                    <strong>{formatDateKey(historicalMeta.sourceDate || historicalMeta.lookupDate)}</strong> 참고가
                    {" "}<strong>{formatWon(historicalValueWon)}</strong> → 오늘
                    {" "}<strong>{formatWon(vaultValueWon)}</strong>
                    {" · "}{formatSignedWon(historicalChange.amount)}
                    {" · "}{formatSignedPercent(historicalChange.percent)}
                    {historicalMeta.carriedForward
                      ? ` · 선택일 이전의 가장 최근 공개 시세 ${formatDateKey(historicalMeta.sourceDate)} 적용`
                      : ""}
                  </ComparisonResult>
                )}
              </FoldBody>
            </FoldPanel>
          )}
        </ViewPanel>
      )}

      <Notice>
        {isGuest ? (
          <>체험 중 입력한 금 기록은 이 기기에만 임시 보관되며 <strong>MY GOLD 기록 저장</strong>을 선택하기 전에는 계정에 저장되지 않습니다. MY GOLD는 실물 금 보관 서비스가 아닙니다. 회원혜택 0.03g은 체험 예시이며, 예상 순금량과 금액은 참고값입니다. 실제 교환은 매장 실측 후 확정됩니다.</>
        ) : (
          <>MY GOLD는 <strong>실물 금 보관 서비스가 아닙니다.</strong> 기록한 금 정보는 사용자가 가진 금제품의 개인 기록이며, <strong>MEMBER GOLD</strong>는 한국골드마켓에서 적립된 별도 잔액입니다. 현재 가치는 제품별 공개 매입시세를 적용한 참고값이고, 예상 순금량은 한국골드마켓 교환기준을 적용한 참고값입니다. 실제 교환 순금량과 비용은 매장에서 순도·중량을 실측한 뒤 최종 확정합니다.</>
        )}
      </Notice>

      {formOpen && (
        <FormOverlay onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <FormSheet role="dialog" aria-modal="true" aria-labelledby="my-vault-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <FormSheetHead>
              <div>
                <small>{isGuest ? "MY GOLD · 체험" : "MY GOLD"}</small>
                <h2 id="my-vault-form-title">{editingId ? "기록한 금 수정" : "내 금 기록"}</h2>
              </div>
              <button type="button" onClick={closeForm} aria-label="금 기록 창 닫기" disabled={saving}><X size={19} aria-hidden /></button>
            </FormSheetHead>

            <Form onSubmit={submit}>
              <Field>
                이름
                <Input
                  value={form.label}
                  maxLength={GOLD_VAULT_MAX_LABEL_LENGTH}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="예: 엄마에게 받은 반지"
                  autoFocus
                  required
                />
              </Field>

              <Field>
                금 종류
                <Select value={form.productId} onChange={(e) => {
                  const option = myGoldProductOptions.find((item) => item.productId === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    productId: option?.productId || "",
                    goldType: option?.product?.legacyGoldType || option?.label || "",
                  }));
                }} required>
                  <option value="">선택해 주세요</option>
                  {myGoldProductOptions.map((item) => (
                    <option key={item.productId} value={item.productId}>{item.label}</option>
                  ))}
                </Select>
                <WeightHint>금교환 계산에서 사용하는 금 종류와 동일합니다. 기타·판단이 어려운 품목은 금교환의 현장 확인 예약을 이용해 주세요.</WeightHint>
              </Field>

              <Field>
                무게
                <WeightRow>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0.001"
                    max={form.weightUnit === "don" ? (10000 / DON_TO_GRAMS).toFixed(3) : "10000"}
                    step="0.001"
                    value={form.weightValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, weightValue: e.target.value }))}
                    placeholder={form.weightUnit === "don" ? "예: 2.00" : "예: 7.50"}
                    required
                  />
                  <UnitToggle aria-label="무게 단위 선택">
                    <UnitButton type="button" $active={form.weightUnit === "g"} aria-pressed={form.weightUnit === "g"} onClick={() => setForm((prev) => ({ ...prev, weightUnit: "g" }))}>g</UnitButton>
                    <UnitButton type="button" $active={form.weightUnit === "don"} aria-pressed={form.weightUnit === "don"} onClick={() => setForm((prev) => ({ ...prev, weightUnit: "don" }))}>돈</UnitButton>
                  </UnitToggle>
                </WeightRow>
                {weightReference && <WeightConversion aria-live="polite">{weightReference}</WeightConversion>}
                <WeightHint>1돈 = 3.75g · 입력한 무게는 반대 단위로도 바로 환산해 보여드립니다.</WeightHint>
              </Field>

              <Field>
                메모 (선택)
                <Textarea
                  value={form.note}
                  maxLength={GOLD_VAULT_MAX_NOTE_LENGTH}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="예: 결혼할 때 받은 반지"
                />
              </Field>

              {weightReference && form.goldType && (
                <BonusStrip aria-live="polite">
                  <div>
                    <small>기록 후 자동 계산</small>
                    <strong>현재 교환 기준의 예상 순금량과 오늘 가치가 MY GOLD에 바로 반영됩니다.</strong>
                  </div>
                  <ChevronRight size={20} aria-hidden />
                </BonusStrip>
              )}

              {error && <ErrorText role="alert">{error}</ErrorText>}

              <Buttons>
                <Button type="submit" disabled={saving || !canAddMore}>
                  {editingId ? <Save aria-hidden /> : <Plus aria-hidden />}
                  {saving
                    ? "저장 중..."
                    : editingId
                      ? isGuest ? "체험에 수정 반영" : "수정 저장"
                      : isGuest ? "체험 기록에 추가" : "MY GOLD에 저장"}
                </Button>
                <GhostButton type="button" onClick={closeForm} disabled={saving}><X aria-hidden /> 취소</GhostButton>
              </Buttons>
            </Form>
          </FormSheet>
        </FormOverlay>
      )}
    </Page>
  );
}
