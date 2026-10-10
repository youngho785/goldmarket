import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import defaults from "../../functions/src/goldBarFees.defaults.json";

export const DEFAULT_GOLD_BAR_FEES = Object.freeze({ ...defaults.fees });
export const GOLD_BAR_FEE_KEYS = Object.freeze(Object.keys(DEFAULT_GOLD_BAR_FEES));

export function normalizeGoldBarFees(data) {
  if (!data || typeof data !== "object") return null;
  const version = Number(data.version);
  const entries = data.fees;
  if (!Number.isInteger(version) || version < 1 || !entries || typeof entries !== "object" || Array.isArray(entries)) return null;
  if (Object.keys(entries).length !== GOLD_BAR_FEE_KEYS.length) return null;
  const fees = {};
  for (const key of GOLD_BAR_FEE_KEYS) {
    const amount = entries[key];
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0 || amount > 2_000_000) return null;
    fees[key] = amount;
  }
  return { fees, version };
}

export function useGoldBarFeeConfig() {
  const [state, setState] = useState({
    fees: null,
    version: 0,
    status: "loading",
    error: "",
    updatedAt: null,
  });

  useEffect(() => onSnapshot(
    doc(db, "appConfig", "goldBarFees"),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!snapshot.exists()) {
        if (snapshot.metadata.fromCache) {
          setState({ fees: null, version: 0, status: "loading", error: "", updatedAt: null });
          return;
        }
        setState({ fees: { ...DEFAULT_GOLD_BAR_FEES }, version: 0, status: "defaults", error: "", updatedAt: null });
        return;
      }
      const normalized = normalizeGoldBarFees(snapshot.data());
      if (!normalized) {
        setState({ fees: null, version: 0, status: "error", error: "공임 설정이 올바르지 않습니다. 관리자 확인이 필요합니다.", updatedAt: null });
        return;
      }
      setState({
        ...normalized,
        status: snapshot.metadata.fromCache ? "cached" : "ready",
        error: "",
        updatedAt: snapshot.get("updatedAt") || null,
      });
    },
    (error) => setState({ fees: null, version: 0, status: "error", error: error?.message || "공임 설정을 확인하지 못했습니다.", updatedAt: null })
  ), []);
  return state;
}
