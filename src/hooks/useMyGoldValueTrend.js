// src/hooks/useMyGoldValueTrend.js
import { useEffect, useMemo, useState } from "react";

import { computeVaultValueWon } from "@/lib/goldVaultCatalog";
import {
  getGoldPriceAtOrBefore,
  getGoldPriceHistoryRange,
} from "@/services/goldPriceHistoryService";

export const MY_GOLD_TREND_PERIODS = Object.freeze([
  { key: "7d", label: "1주", days: 7 },
  { key: "30d", label: "1개월", days: 30 },
  { key: "90d", label: "3개월", days: 90 },
  { key: "365d", label: "1년", days: 365 },
]);

function koreaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function koreaDateKey(date = new Date()) {
  const parts = koreaDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return dateKey;
  const utc = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

function compact(dateKey) {
  return String(dateKey || "").replace(/-/g, "");
}

function valueChange(current, previous) {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  const amount = currentValue > 0 && previousValue > 0 ? currentValue - previousValue : 0;
  return {
    amount,
    percent: previousValue > 0 ? (amount / previousValue) * 100 : null,
    direction: amount > 0 ? "up" : amount < 0 ? "down" : previousValue > 0 ? "same" : "unknown",
  };
}

export default function useMyGoldValueTrend({
  pureGoldG,
  currentPricePerDon,
  enabled,
  defaultPeriod = "30d",
}) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [historyRows, setHistoryRows] = useState([]);
  const [weeklyReference, setWeeklyReference] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = useMemo(() => koreaDateKey(), []);
  const selectedPeriod =
    MY_GOLD_TREND_PERIODS.find((option) => option.key === period) || MY_GOLD_TREND_PERIODS[1];
  const startDate = shiftDateKey(today, -selectedPeriod.days);
  const weeklyDate = shiftDateKey(today, -7);

  useEffect(() => {
    if (!enabled) {
      setWeeklyReference(null);
      return undefined;
    }

    let active = true;
    getGoldPriceAtOrBefore(weeklyDate)
      .then((row) => {
        if (active) setWeeklyReference(row || null);
      })
      .catch((loadError) => {
        console.warn("[MY GOLD] 7-day reference price load failed:", loadError?.message || loadError);
        if (active) setWeeklyReference(null);
      });

    return () => {
      active = false;
    };
  }, [enabled, weeklyDate]);

  useEffect(() => {
    if (!enabled) {
      setHistoryRows([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");

    getGoldPriceHistoryRange(startDate, today)
      .then((rows) => {
        if (active) setHistoryRows(rows || []);
      })
      .catch((loadError) => {
        console.warn("[MY GOLD] trend price history load failed:", loadError?.message || loadError);
        if (active) {
          setHistoryRows([]);
          setError("가치 변화 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, startDate, today]);

  const currentValueWon = useMemo(
    () => computeVaultValueWon(pureGoldG, currentPricePerDon),
    [pureGoldG, currentPricePerDon]
  );

  const points = useMemo(() => {
    if (!enabled || Number(pureGoldG) <= 0) return [];

    const mapped = historyRows.map((row) => ({
      date: row.sourceDate,
      pricePerDon: row.pureGoldBuyPerDon,
      valueWon: computeVaultValueWon(pureGoldG, row.pureGoldBuyPerDon),
    }));

    const todayCompact = compact(today);
    if (Number(currentPricePerDon) > 0) {
      const last = mapped[mapped.length - 1];
      if (!last || last.date !== todayCompact) {
        mapped.push({
          date: todayCompact,
          pricePerDon: Number(currentPricePerDon),
          valueWon: currentValueWon,
        });
      } else {
        mapped[mapped.length - 1] = {
          ...last,
          pricePerDon: Number(currentPricePerDon),
          valueWon: currentValueWon,
        };
      }
    }

    return mapped;
  }, [currentPricePerDon, currentValueWon, enabled, historyRows, pureGoldG, today]);

  const rangeChange = useMemo(() => {
    const first = points[0]?.valueWon || 0;
    const last = points[points.length - 1]?.valueWon || currentValueWon;
    return valueChange(last, first);
  }, [currentValueWon, points]);

  const weeklyValueWon = useMemo(
    () =>
      weeklyReference?.pureGoldBuyPerDon
        ? computeVaultValueWon(pureGoldG, weeklyReference.pureGoldBuyPerDon)
        : 0,
    [pureGoldG, weeklyReference]
  );

  const weeklyChange = useMemo(
    () => valueChange(currentValueWon, weeklyValueWon),
    [currentValueWon, weeklyValueWon]
  );

  const extrema = useMemo(() => {
    if (!points.length) return { low: 0, high: 0 };
    const values = points.map((point) => point.valueWon).filter(Number.isFinite);
    return {
      low: Math.min(...values),
      high: Math.max(...values),
    };
  }, [points]);

  return {
    period,
    setPeriod,
    selectedPeriod,
    points,
    currentValueWon,
    rangeChange,
    weeklyChange,
    weeklyReference,
    weeklyValueWon,
    extrema,
    loading,
    error,
  };
}
