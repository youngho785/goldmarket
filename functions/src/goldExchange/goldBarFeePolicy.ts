/** Canonical server-side snapshot of the gold-bar making fee schedule. */
import { HttpsError } from "firebase-functions/v2/https";
import feeDefaults from "../goldBarFees.defaults.json" with { type: "json" };

const FEE_DEFAULTS = feeDefaults.fees as Record<string, number>;
export const BAR_FEE_KEYS = Object.keys(FEE_DEFAULTS).sort();

export function validateBarFeeTable(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpsError("invalid-argument", "제작공임표 형식을 확인해 주세요.");
  }
  const values = raw as Record<string, unknown>;
  if (Object.keys(values).length !== BAR_FEE_KEYS.length || BAR_FEE_KEYS.some((key) => !Object.hasOwn(values, key))) {
    throw new HttpsError("invalid-argument", "공임표 규격 목록이 현재 기준과 다릅니다.");
  }
  return Object.fromEntries(BAR_FEE_KEYS.map((key) => {
    const value = values[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2_000_000) {
      throw new HttpsError("invalid-argument", `${key}: 공임은 0~2,000,000원의 정수여야 합니다.`);
    }
    return [key, value];
  }));
}

export function readBarFeePolicy(data: FirebaseFirestore.DocumentData | undefined): { fees: Record<string, number>; version: number } {
  if (!data) return { fees: { ...FEE_DEFAULTS }, version: 0 };
  const version = data.version;
  if (!Number.isInteger(version) || version < 1) {
    throw new HttpsError("failed-precondition", "현재 제작공임표 버전을 확인할 수 없습니다.");
  }
  try {
    return { fees: validateBarFeeTable(data.fees), version };
  } catch {
    throw new HttpsError("failed-precondition", "제작공임표 설정이 올바르지 않습니다. 매장에 문의해 주세요.");
  }
}

function findBarFeeKey(grams: number, don: number): string {
  const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  for (const g of [1, 2, 3, 5, 10, 20, 30, 50, 100, 500]) if (eq(grams, g)) return `g-${g}`;
  for (const d of [1, 2, 3, 5, 10, 15, 20, 50]) if (eq(don, d)) return `d-${d}`;
  return "";
}

/** Only the server-validated bar selection is accepted, never the caller's fee. */
export function calculateBookedBarFee(
  validatedPlan: Record<string, unknown>,
  policy: { fees: Record<string, number>; version: number }
): { estimatedGoldBarFeeWon: number; feePolicyVersion: number } {
  const selected = validatedPlan.selected as Record<string, unknown> | undefined;
  const grams = Number(selected?.grams);
  const don = Number(selected?.don);
  const qty = Number(selected?.qty);
  const key = findBarFeeKey(grams, don);
  if (!key || !Number.isInteger(qty) || qty < 1 || qty > 10_000) {
    throw new HttpsError("failed-precondition", "제작공임을 계산할 골드바 규격을 확인할 수 없습니다.");
  }
  const fee = policy.fees[key];
  if (!Number.isInteger(fee) || fee < 0) {
    throw new HttpsError("failed-precondition", "현재 제작공임표에서 해당 규격을 찾지 못했습니다.");
  }
  return { estimatedGoldBarFeeWon: fee * qty, feePolicyVersion: policy.version };
}
