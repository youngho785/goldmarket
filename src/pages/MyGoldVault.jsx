// src/pages/MyGoldVault.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Gem, Minus, Plus, Save, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import { trackProductEventOncePerSession } from "@/analytics/productAnalytics";
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
  SummaryOverviewGrid,
  SummarySideStack,
  SummaryHead,
  SummaryItems,
  SummaryItem,
  GoalProgress,
  GoalTrack,
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
  GoldSeed,
  Empty,
  SaveFeedback,
  Notice,
  GuestSaveCard,
  GuestSaveCopy,
  GuestSaveAction,
} from "@/components/myGoldVault/MyGoldVault.styles";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import MyGoldValueTrend from "@/components/gold/MyGoldValueTrend";
import MyGoldAlertSummary from "@/components/gold/MyGoldAlertSummary";
import MyGoldImportPrompt from "@/components/gold/MyGoldImportPrompt";
import MyGoldItemsSection from "@/components/myGoldVault/MyGoldItemsSection";
import { DON_TO_GRAMS, findGoldProduct } from "@/lib/goldRates";
import {
  GOLD_VAULT_MAX_ITEMS,
  GOLD_VAULT_MAX_LABEL_LENGTH,
  GOLD_VAULT_MAX_NOTE_LENGTH,
  computeVaultMarketValueWon,
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
  const { memberUser: user } = useAuthContext();
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
  const isGuest = !user?.uid;
  const [guestRawItems, setGuestRawItems] = useState(() => readGuestMyGoldItems());
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const formDialogRef = useRef(null);
  const savingRef = useRef(false);
  savingRef.current = saving;
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
    const previousHideBottomNav = document.body.dataset.hideBottomNav;
    const previousFocus = document.activeElement;
    const dialog = formDialogRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    document.body.style.overflow = "hidden";
    document.body.dataset.hideBottomNav = "1";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !savingRef.current) {
        event.preventDefault();
        setFormOpen(false);
        setEditingId("");
        setForm(EMPTY_FORM);
        setError("");
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter(
        (element) => element.getAttribute("aria-hidden") !== "true"
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousHideBottomNav === undefined) {
        delete document.body.dataset.hideBottomNav;
      } else {
        document.body.dataset.hideBottomNav = previousHideBottomNav;
      }
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [formOpen]);

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
  const vaultLoading = isGuest ? false : itemsLoading;
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

    const quickGoldItem = location.state?.quickGoldItem;
    setForm(
      quickGoldItem
        ? {
            label: quickGoldItem.label || "",
            productId: quickGoldItem.productId || "",
            goldType: quickGoldItem.goldType || "",
            weightValue: String(quickGoldItem.weightG || ""),
            weightUnit: "g",
            note: quickGoldItem.note || "",
          }
        : EMPTY_FORM
    );
    setEditingId("");
    setError("");
    setFormOpen(true);
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true, state: null }
    );
  }, [
    addRequested,
    canAddMore,
    editingId,
    formOpen,
    location.pathname,
    location.search,
    location.state,
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

  // MY GOLD는 사용자가 실제로 보유한 금을 기록해 보는 개인 기록 공간입니다.
  // MEMBER GOLD(회원 혜택 적립금)는 별도 잔액이며 MY GOLD 가치/순금량에 합산하지 않습니다.
  const vaultValueWon = Number(activeSummary.estimatedValueWon || 0);
  const previousVaultValueWon = Number(activeSummary.previousEstimatedValueWon || 0);
  const vaultPureGoldG = Number(activeSummary.pureGoldG || 0);
  const hasVaultContent = activeSummary.itemCount > 0;
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
    return activeItems.reduce(
      (sum, item) => sum + computeVaultMarketValueWon(item, rates, historicalMeta.market),
      0
    );
  }, [activeItems, historicalMeta, historicalPrice, rates]);
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
      const wasFirstAccountRecord = !itemsLoading && items.length === 0; await createGoldVaultItems(user.uid, pendingItems); if (wasFirstAccountRecord) trackProductEventOncePerSession("mygold_first_item_created", { source: draft?.source === "guest-my-gold" ? "guest_import" : "calculator_import" }, "mygold-first-item-created");
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
        const wasFirstAccountRecord = items.length === 0; await createGoldVaultItem(user.uid, values); if (wasFirstAccountRecord) trackProductEventOncePerSession("mygold_first_item_created", { source: "manual" }, "mygold-first-item-created");
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
        <SummaryOverviewGrid aria-label="MY GOLD 요약">
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
                ? "MY GOLD의 오늘 참고가치를 불러오고 있습니다."
                : hasVaultContent && publicPriceEnabled
                  ? `${Number.isFinite(currentChange.percent) ? `어제보다 ${formatSignedWon(currentChange.amount)} · ` : ""}예상 순금 ${Number(activeSummary.pureGoldG || 0).toFixed(2)}g`
                  : "금 하나를 기록하면 오늘 참고가치와 변화가 이 작은 금빛에 이어집니다."
            }
            actionLabel={hasVaultContent ? "내 금 자세히 보기" : "첫 금 기록하기"}
            actionTo={hasVaultContent ? "/my-gold/items" : "/my-gold/items?add=1"}
          />
          <HeroKicker>
            <Gem size={15} aria-hidden /> {isGuest ? "MY GOLD · 체험" : "MY GOLD"}
          </HeroKicker>
          <HeroTitle id="my-vault-current-value-title">내 금의 오늘 참고가치</HeroTitle>
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
              내가 가진 금을 직접 기록한 정보를 기준으로 계산한 오늘 참고가치입니다.
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

          <HeroStats $hasBonus>
            <HeroStat>
              <span>기록 중량</span>
              <strong>{Number(activeSummary.totalWeightG || 0).toFixed(2)}g</strong>
            </HeroStat>
            <HeroStat>
              <span>예상 순금</span>
              <strong>{Number(activeSummary.pureGoldG || 0).toFixed(2)}g</strong>
            </HeroStat>
            <HeroStat>
              <span>기록한 금</span>
              <strong>{Number(activeSummary.itemCount || 0)}개</strong>
            </HeroStat>
          </HeroStats>

          <HeroActions>
            <HeroAddAction
              type="button"
              onClick={() => navigate("/my-gold/items?add=1")}
              disabled={!canAddMore}
            >
              <Plus aria-hidden /> 금 추가
            </HeroAddAction>
            <HeroExchangeAction to="/my-gold/items" aria-label="내가 기록한 금 전체 관리">
              <Gem aria-hidden />
              내 금 관리
              <ArrowRight aria-hidden />
            </HeroExchangeAction>
            <HeroExchangeAction to="/my-gold/trend" aria-label="내 금 참고가치 변화 자세히 보기">
              <TrendingUp aria-hidden />
              가치 변화
              <ArrowRight aria-hidden />
            </HeroExchangeAction>
          </HeroActions>
          {isGuest && (
            <GuestModeNote>
              로그인 없이 MY GOLD를 체험할 수 있습니다. 실제 계정 저장과 푸시 알림은 로그인 후 연결됩니다.
            </GuestModeNote>
          )}
          </VaultHero>
          <SummarySideStack>
          <VaultSection aria-labelledby="my-gold-summary-items-title">
            <SummaryHead>
              <strong id="my-gold-summary-items-title">{isGuest ? "체험 중인 금" : "내가 기록한 금"}</strong>
              {sortedItems.length > 0 && (
                <Link to="/my-gold/items">
                  {sortedItems.length}개 전체 관리 <ChevronRight size={14} aria-hidden />
                </Link>
              )}
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
                <span>금 하나를 기록하면 오늘 참고가치와 가격 변화를 바로 확인할 수 있습니다.</span>
              </Empty>
            )}
          </VaultSection>
          {hasVaultContent && (
            <ReadinessPanel
              to="/gold-exchange?mode=vault&auto=1"
              state={{ source: "my-gold", vaultProducts: exchangeProducts }}
              aria-label="MY GOLD 기록 기준 예상 교환량 확인 페이지 열기"
            >
              <div>
                <small>GOLD TO GOLD · 기록 기준 예상</small>
                <strong>기록한 금으로 예상 교환량 확인</strong>
                <p>
                  {barReadiness?.available
                    ? `현재 기록 기준으로 ${barReadiness.label} 교환 가능 예상 · 실제 교환은 매장 실측 후 확정`
                    : `1g 골드바 예상량까지 약 ${Number(barReadiness?.neededG || 0).toFixed(2)}g 더 필요`}
                </p>
                {nextBarTarget && (
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
          )}
          </SummarySideStack>
        </SummaryOverviewGrid>
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

          {isGuest && hasPersonalizedGuestVault && activeSummary.itemCount > 0 && (
            <GuestSaveCard aria-label="MY GOLD 회원가입 저장 안내">
              <GuestSaveCopy>
                <h2>오늘 확인한 내 금, MY GOLD에 이어두세요.</h2>
                <p>지금 입력한 금 기록을 그대로 저장하면 다음에도 오늘 참고가치와 변화, 예상 순금량을 이어서 확인할 수 있습니다.</p>
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
              bonusOnly={false}
              bonusGoldG={0}
              items={activeItems}
              rates={rates}
              compact
              detailsTo="/my-gold/trend"
            />
          )}


          <MyGoldAlertSummary uid={user?.uid} demoMode={isGuest} compact />
        </>
      )}

      {isItemsView && (
        <ViewPanel key="items">
          <ViewIntro>
            <div>
              <h1>{isGuest ? "체험 중인 금 관리" : "내가 기록한 금"}</h1>
              <p>금마다 이름을 붙이고 종류와 중량을 기록해 오늘 참고가치와 예상 순금량을 관리합니다.</p>
            </div>
            <AddGoldButton type="button" onClick={openAddForm} disabled={!canAddMore}>
              <Plus size={15} aria-hidden /> 금 추가
            </AddGoldButton>
          </ViewIntro>

          <MyGoldItemsSection
            isGuest={isGuest}
            sortedItems={sortedItems}
            activeSummary={activeSummary}
            rates={rates}
            publicPriceEnabled={publicPriceEnabled}
            vaultLoading={vaultLoading}
            error={error}
            formOpen={formOpen}
            exchangeProducts={exchangeProducts}
            maxExchangeProducts={GOLD_EXCHANGE_MAX_PRODUCTS}
            onError={setError}
            onAdd={openAddForm}
            onEdit={startEdit}
            onRemove={remove}
            onResetGuest={resetGuestDemo}
          />

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
              bonusOnly={false}
              bonusGoldG={0}
              items={activeItems}
              rates={rates}
            />
          ) : (
            <Empty>
              <TrendingUp size={28} aria-hidden />
              <strong>참고가치 변화를 보려면 먼저 금을 기록해 주세요.</strong>
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
                    aria-label="내 금 참고가치 비교 기준 날짜"
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
          <>체험 중 입력한 금 기록은 이 기기에만 임시 보관되며 <strong>MY GOLD 기록 저장</strong> 전에는 계정에 저장되지 않습니다. MY GOLD는 <strong>실물 금을 보관·예치하는 서비스가 아닙니다.</strong> 기록한 금의 참고가치와 예상 순금량을 확인하는 개인 기록 공간이며, 실제 교환량은 매장 실측 후 확정됩니다.</>
        ) : (
          <>MY GOLD는 <strong>실물 금을 보관·예치하는 서비스가 아닙니다.</strong> 기록한 금의 참고가치와 예상 순금량을 확인하는 개인 기록 공간이며, 실제 교환량은 매장 실측 후 확정됩니다. <strong>MEMBER GOLD는 별도 회원혜택으로 MY GOLD 참고가치에 포함되지 않습니다.</strong></>
        )}
      </Notice>

      {formOpen && (
        <FormOverlay onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <FormSheet ref={formDialogRef} role="dialog" aria-modal="true" aria-labelledby="my-vault-form-title" onMouseDown={(event) => event.stopPropagation()}>
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
                    <strong>현재 교환 기준의 예상 순금량과 오늘 참고가치가 MY GOLD에 바로 반영됩니다.</strong>
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
