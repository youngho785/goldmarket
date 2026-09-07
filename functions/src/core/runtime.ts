// Shared Firebase runtime, validation rules, and common gold/exchange helpers.
// Extracted from the original monolithic index.ts without changing behavior.
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { HttpsError } from "firebase-functions/v2/https";
import { isRecentAuthentication } from "../accountDeletionSafety.js";
import goldRatesDefaults from "../goldRates.defaults.json" with { type: "json" };
import { bookingBlockReason } from "../bookingPolicy.js";

/* ── App init (중복 방지) */
if (!getApps().length) initializeApp();

/* ── Lazy getters */
export const db = (): Firestore => getFirestore();
export const msg = () => getMessaging();
export const IN_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";
export const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === "true";

export function hasAdminClaim(token: Record<string, unknown> | undefined): boolean {
  return token?.admin === true || token?.superAdmin === true;
}

export async function loadCurrentAuthUser(uid: string | undefined): Promise<UserRecord> {
  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  try {
    const userRecord = await getAuth().getUser(uid);
    if (userRecord.disabled) {
      throw new HttpsError("permission-denied", "사용이 중지된 계정입니다.");
    }
    return userRecord;
  } catch (error) {
    if (error instanceof HttpsError) throw error;

    const code = String((error as { code?: string })?.code || "");
    if (code === "auth/user-not-found") {
      throw new HttpsError("unauthenticated", "계정 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
    }
    console.error("[loadCurrentAuthUser] 사용자 확인 실패", { uid, code });
    throw new HttpsError("unavailable", "계정 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export async function requireCurrentAdmin(uid: string | undefined): Promise<string> {
  const userRecord = await loadCurrentAuthUser(uid);
  if (!hasAdminClaim(userRecord.customClaims as Record<string, unknown> | undefined)) {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
  return userRecord.uid;
}

export async function requireCurrentSuperAdmin(uid: string | undefined): Promise<string> {
  const userRecord = await loadCurrentAuthUser(uid);
  if (userRecord.customClaims?.superAdmin !== true) {
    throw new HttpsError("permission-denied", "최고 관리자 권한이 필요합니다.");
  }
  return userRecord.uid;
}

export const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;

/**
 * 계정 영구 삭제는 로그인 여부만으로 허용하지 않고,
 * Firebase ID 토큰의 auth_time이 최근 재인증 시각인지 서버에서 다시 검증합니다.
 */
export function requireRecentAuthentication(
  token: Record<string, unknown> | undefined
): void {
  if (
    !isRecentAuthentication(
      token?.auth_time,
      Math.floor(Date.now() / 1000),
      RECENT_AUTH_MAX_AGE_SECONDS
    )
  ) {
    throw new HttpsError(
      "failed-precondition",
      "보안을 위해 비밀번호를 다시 확인한 뒤 계정 탈퇴를 진행해 주세요."
    );
  }
}

/**
 * 예약/보너스처럼 중요한 상태 변경은 Firebase Auth의 현재 계정 상태를 직접 확인합니다.
 * 이메일 인증은 회원가입 시 한 번만 하면 되며, 이후 호출에서는 저장된 인증 완료 상태만 확인합니다.
 */
export async function requireVerifiedUserRecord(uid: string | undefined): Promise<UserRecord> {
  const userRecord = await loadCurrentAuthUser(uid);
  if (!userRecord.emailVerified) {
    throw new HttpsError(
      "failed-precondition",
      "이메일 인증을 완료한 회원만 이용할 수 있습니다."
    );
  }
  return userRecord;
}

export async function requireVerifiedUser(uid: string | undefined): Promise<string> {
  return (await requireVerifiedUserRecord(uid)).uid;
}

/* ── 공통 상수/유틸 */
export const DON_TO_GRAMS = goldRatesDefaults.donToGrams;
export const DEFAULT_PURITY: Record<string, number> = goldRatesDefaults.purity;
export const DEFAULT_EXCHANGE: Record<string, number> = goldRatesDefaults.exchange;
export const DEFAULT_GOLD_RATES_VERSION = goldRatesDefaults.version;

export const roundTo3 = (n: number): number => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8);
  let thousands = Math.floor(t / 10);
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};

export const BOOKING_TIME_SLOTS = new Set([
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]);
export const CUSTOMER_EDITABLE_EXCHANGE_STATUSES = new Set(["requested", "scheduled"]);
export const ACTIVE_EXCHANGE_STATUSES = new Set([
  "requested",
  "scheduled",
  "in_progress",
  "교환중",
]);

export const MAX_BOOKING_DAYS_AHEAD = 60;
export const MAX_ACTIVE_BOOKING_GROUPS_PER_USER = 3;
export const MAX_PRODUCTS_PER_BOOKING = 20;
export const MAX_PRODUCT_GRAMS = 10_000;
export const MAX_TOTAL_PRODUCT_GRAMS = 20_000;
export const MAX_NAME_LENGTH = 40;
export const MAX_PHONE_LENGTH = 20;
export const MAX_CONSENT_VERSION_LENGTH = 50;

export const ALLOWED_GOLD_TYPES = new Set(Object.keys(DEFAULT_PURITY));
export const ALLOWED_EXCHANGE_TYPES = new Set(Object.keys(DEFAULT_EXCHANGE));

export const ALLOWED_BAR_DENOMS = [
  { label: "1g 골드바", grams: 1 },
  { label: "3g 골드바", grams: 3 },
  { label: "5g 골드바", grams: 5 },
  { label: "10g 골드바", grams: 10 },
  { label: "20g 골드바", grams: 20 },
  { label: "30g 골드바", grams: 30 },
  { label: "50g 골드바", grams: 50 },
  { label: "100g 골드바", grams: 100 },
  { label: "500g 골드바", grams: 500 },
  { label: "1돈 (3.75g) 골드바", grams: 3.75 },
  { label: "2돈 (7.5g) 골드바", grams: 7.5 },
  { label: "3돈 (11.25g) 골드바", grams: 11.25 },
  { label: "5돈 (18.75g, 약 19g) 골드바", grams: 18.75 },
  { label: "10돈 (37.5g) 골드바", grams: 37.5 },
  { label: "15돈 (56.25g) 골드바", grams: 56.25 },
  { label: "20돈 (75g) 골드바", grams: 75 },
] as const;

export function koreaDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export const BOOKING_AVAILABILITY_REF = "appConfig/bookingAvailability";

export function assertBookingOpen(availabilityData: unknown, visitDate: string, visitTime: string): void {
  const reason = bookingBlockReason(availabilityData, visitDate, visitTime, BOOKING_TIME_SLOTS);
  if (reason) {
    throw new HttpsError("failed-precondition", reason);
  }
}

export function validateBookingSchedule(visitDate: string, visitTime: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || !BOOKING_TIME_SLOTS.has(visitTime)) {
    throw new HttpsError("invalid-argument", "방문 날짜와 시간을 올바르게 선택해 주세요.");
  }

  const [year, month, day] = visitDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isValidDate || parsed.getUTCDay() === 0) {
    throw new HttpsError("invalid-argument", "일요일을 제외한 올바른 방문 날짜를 선택해 주세요.");
  }

  const today = koreaDateKey();
  if (visitDate <= today) {
    throw new HttpsError("failed-precondition", "방문 날짜는 내일부터 선택할 수 있습니다.");
  }
  if (visitDate > addDaysToDateKey(today, MAX_BOOKING_DAYS_AHEAD)) {
    throw new HttpsError(
      "failed-precondition",
      `방문 예약은 오늘부터 ${MAX_BOOKING_DAYS_AHEAD}일 이내만 가능합니다.`
    );
  }
}

export function normalizeRequiredString(
  value: unknown,
  fieldName: string,
  maxLength: number,
  minLength = 1
): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${fieldName}을(를) 올바르게 입력해 주세요.`);
  }
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName}은(는) ${minLength}자 이상 ${maxLength}자 이하로 입력해 주세요.`
    );
  }
  return normalized;
}

export function normalizePhone(value: unknown): string {
  const phone = normalizeRequiredString(value, "전화번호", MAX_PHONE_LENGTH, 9);
  if (!/^[0-9+()\-\s]+$/.test(phone)) {
    throw new HttpsError(
      "invalid-argument",
      "전화번호에는 숫자, 공백, +, -, 괄호만 사용할 수 있습니다."
    );
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    throw new HttpsError("invalid-argument", "전화번호 형식을 다시 확인해 주세요.");
  }
  return phone;
}

export type ValidatedProduct = {
  goldType: string;
  quantity: number;
  inputUnit: "g" | "don";
  exchangeType: string;
  grams: number;
};

export function validateProducts(value: unknown): ValidatedProduct[] {
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "제품 목록 형식이 올바르지 않습니다.");
  }
  if (value.length > MAX_PRODUCTS_PER_BOOKING) {
    throw new HttpsError(
      "invalid-argument",
      `한 예약에는 제품을 최대 ${MAX_PRODUCTS_PER_BOOKING}개까지 등록할 수 있습니다.`
    );
  }

  let totalGrams = 0;
  const validated = value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new HttpsError("invalid-argument", `${index + 1}번째 제품 정보가 올바르지 않습니다.`);
    }
    const product = raw as Record<string, unknown>;
    const goldType = String(product.goldType || "").trim();
    const exchangeType = String(product.exchangeType || "").trim();
    const inputUnit: "g" | "don" | null =
      product.inputUnit === "don" ? "don" : product.inputUnit === "g" ? "g" : null;
    const quantity = Number(product.quantity);

    if (!ALLOWED_GOLD_TYPES.has(goldType)) {
      throw new HttpsError("invalid-argument", `${index + 1}번째 제품 종류가 허용되지 않습니다.`);
    }
    if (!ALLOWED_EXCHANGE_TYPES.has(exchangeType)) {
      throw new HttpsError("invalid-argument", `${index + 1}번째 교환 유형이 허용되지 않습니다.`);
    }
    if (!inputUnit) {
      throw new HttpsError("invalid-argument", `${index + 1}번째 제품의 중량 단위가 올바르지 않습니다.`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new HttpsError("invalid-argument", `${index + 1}번째 제품 중량은 0보다 커야 합니다.`);
    }

    const grams = roundTo3(inputUnit === "don" ? quantity * DON_TO_GRAMS : quantity);
    if (grams <= 0 || grams > MAX_PRODUCT_GRAMS) {
      throw new HttpsError(
        "invalid-argument",
        `${index + 1}번째 제품 중량은 ${MAX_PRODUCT_GRAMS.toLocaleString("ko-KR")}g 이하여야 합니다.`
      );
    }

    totalGrams = roundTo3(totalGrams + grams);
    return { goldType, quantity, inputUnit, exchangeType, grams };
  });

  if (totalGrams > MAX_TOTAL_PRODUCT_GRAMS) {
    throw new HttpsError(
      "invalid-argument",
      `한 예약의 총 입력 중량은 ${MAX_TOTAL_PRODUCT_GRAMS.toLocaleString("ko-KR")}g 이하여야 합니다.`
    );
  }
  return validated;
}

export function buildValidatedBarsPlan(
  raw: unknown,
  totalFinalGrams: number
): Record<string, unknown> | null {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpsError("invalid-argument", "골드바 선택 정보가 올바르지 않습니다.");
  }
  if (totalFinalGrams <= 0) {
    throw new HttpsError("invalid-argument", "환산 중량이 없는 예약에는 골드바 계획을 저장할 수 없습니다.");
  }

  const plan = raw as Record<string, unknown>;
  const category = plan.category === "don" ? "don" : plan.category === "grams" ? "grams" : null;
  const selected = plan.selected;
  if (!category || !selected || typeof selected !== "object" || Array.isArray(selected)) {
    throw new HttpsError("invalid-argument", "골드바 규격과 수량을 확인해 주세요.");
  }

  const selectedData = selected as Record<string, unknown>;
  const label = String(selectedData.label || "").trim();
  const grams = Number(selectedData.grams);
  const qty = Number(selectedData.qty);
  const denom = ALLOWED_BAR_DENOMS.find(
    (item) => item.label === label && Math.abs(item.grams - grams) < 0.0001
  );

  if (!denom) {
    throw new HttpsError("invalid-argument", "허용되지 않은 골드바 규격입니다.");
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > 10_000) {
    throw new HttpsError("invalid-argument", "골드바 수량은 1 이상의 정수여야 합니다.");
  }

  // 추가 선택은 현재 예상 중량의 바로 위 규격까지만 허용합니다.
  // 낮은 규격을 여러 개 선택하는 경우에도, 현재 중량을 넘기는 첫 수량까지만 허용합니다.
  const categoryDenoms = ALLOWED_BAR_DENOMS.filter((item) =>
    category === "don" ? item.label.includes("돈") : !item.label.includes("돈")
  );
  const selectedIndex = categoryDenoms.findIndex((item) => item.label === denom.label);
  const topUpIndex = categoryDenoms.findIndex((item) => item.grams > totalFinalGrams + 1e-9);
  const maxAllowedIndex = topUpIndex >= 0 ? topUpIndex : categoryDenoms.length - 1;
  if (selectedIndex < 0 || selectedIndex > maxAllowedIndex) {
    throw new HttpsError(
      "failed-precondition",
      "추가 선택은 현재 예상 중량의 바로 위 골드바 규격까지만 가능합니다."
    );
  }
  const maxAllowedQty = Math.max(1, Math.ceil((totalFinalGrams - 1e-9) / denom.grams));
  if (qty > maxAllowedQty) {
    throw new HttpsError(
      "failed-precondition",
      `선택 가능한 최대 수량은 ${maxAllowedQty}개입니다.`
    );
  }

  const usedGrams = roundTo3(denom.grams * qty);
  // 선택한 골드바가 예상 환산량보다 크면, 초과분을 고객이 추가할 순금량으로 계산합니다.
  // 클라이언트가 보낸 topUp 값은 신뢰하지 않고 서버에서 다시 산출합니다.
  const topUpGrams = roundTo3(Math.max(0, usedGrams - totalFinalGrams));
  const topUpDon = roundTo3(topUpGrams / DON_TO_GRAMS);
  const leftoverGrams = roundTo3(Math.max(0, totalFinalGrams - usedGrams));
  let remain = leftoverGrams;
  const autoBreakdown: Array<Record<string, unknown>> = [];
  [...ALLOWED_BAR_DENOMS]
    .sort((a, b) => b.grams - a.grams)
    .forEach((item) => {
      const itemQty = Math.floor((remain + 1e-9) / item.grams);
      if (itemQty > 0) {
        autoBreakdown.push({
          label: item.label,
          grams: item.grams,
          don: roundTo3(item.grams / DON_TO_GRAMS),
          qty: itemQty,
        });
        remain = roundTo3(Math.max(0, remain - item.grams * itemQty));
      }
    });

  return {
    category,
    totalGrams: roundTo3(totalFinalGrams),
    totalDon: roundTo3(totalFinalGrams / DON_TO_GRAMS),
    selected: {
      label: denom.label,
      grams: denom.grams,
      don: roundTo3(denom.grams / DON_TO_GRAMS),
      qty,
      usedGrams,
      usedDon: roundTo3(usedGrams / DON_TO_GRAMS),
    },
    requiresTopUp: topUpGrams > 0,
    topUpGrams,
    topUpDon,
    leftoverGrams,
    leftoverDon: roundTo3(leftoverGrams / DON_TO_GRAMS),
    autoBreakdown,
    planVersion: 3,
  };
}

export function normalizeCustomerReason(value: unknown): string {
  const reason = String(value || "").trim().slice(0, 200);
  if (!reason) {
    throw new HttpsError("invalid-argument", "변경 또는 취소 사유를 입력해 주세요.");
  }
  return reason;
}

export function reservedTimesForDate(raw: Record<string, unknown>, dateKey: string): Set<string> {
  const times = new Set<string>();
  const value = raw[dateKey];
  if (Array.isArray(value)) {
    value.forEach((time) => {
      if (typeof time === "string") times.add(time);
    });
  } else if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([time, reserved]) => {
      if (reserved) times.add(time);
    });
  }
  Object.entries(raw).forEach(([key, reserved]) => {
    if (!reserved) return;
    if (key.startsWith(`${dateKey}.`) || key.startsWith(`${dateKey} `)) {
      const time = key.slice(dateKey.length + 1);
      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) times.add(time);
    }
  });
  return times;
}

export function setReservedTime(
  raw: Record<string, unknown>,
  dateKey: string,
  time: string,
  reserved: boolean
): Record<string, unknown> {
  const next = { ...raw };
  const times = reservedTimesForDate(next, dateKey);
  if (reserved) times.add(time);
  else times.delete(time);
  next[dateKey] = Object.fromEntries([...times].sort().map((item) => [item, true]));
  delete next[`${dateKey}.${time}`];
  delete next[`${dateKey} ${time}`];
  return next;
}

export function computeFinalWeightFromRates(params: {
  grams: number;
  goldType?: string;
  exchangeType?: string;
  purity?: Record<string, number>;
  exchange?: Record<string, number>;
}): number {
  const { grams, goldType, exchangeType, purity, exchange } = params;
  const p =
    typeof purity?.[goldType ?? ""] === "number"
      ? (purity as Record<string, number>)[goldType as string]
      : (DEFAULT_PURITY[goldType ?? ""] ?? 0);
  const e =
    typeof exchange?.[exchangeType ?? ""] === "number"
      ? (exchange as Record<string, number>)[exchangeType as string]
      : (DEFAULT_EXCHANGE[exchangeType ?? ""] ?? 1);
  return roundTo3(grams * p * e);
}

export async function addNotificationForUser(
  uid: string | undefined,
  payload: {
    type: string;
    title: string;
    body: string;
    link?: string;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  if (!uid) return;
  const ref = db().collection("notifications").doc(uid).collection("items").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  });
}

export async function addNotificationForAdmins(payload: {
  type: string;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
}): Promise<number> {
  const users = db().collection("users");
  const snapshots = await Promise.all([
    users.where("role", "in", ["admin", "superAdmin"]).get(),
    users.where("admin", "==", true).get(),
    users.where("superAdmin", "==", true).get(),
  ]);
  const adminUids = new Set<string>();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => adminUids.add(document.id));
  });
  if (adminUids.size === 0) {
    console.warn("[addNotificationForAdmins] 알림을 받을 관리자 계정을 찾지 못했습니다.");
    return 0;
  }

  const batch = db().batch();
  adminUids.forEach((uid) => {
    const ref = db().collection("notifications").doc(uid).collection("items").doc();
    batch.set(ref, {
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
  });
  await batch.commit();
  return adminUids.size;
}

export async function addUniqueNotificationForAdmins(
  notificationId: string,
  payload: {
    type: string;
    title: string;
    body: string;
    link?: string;
    meta?: Record<string, unknown>;
  }
): Promise<number> {
  const users = db().collection("users");
  const snapshots = await Promise.all([
    users.where("role", "in", ["admin", "superAdmin"]).get(),
    users.where("admin", "==", true).get(),
    users.where("superAdmin", "==", true).get(),
  ]);
  const adminUids = new Set<string>();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => adminUids.add(document.id));
  });
  if (adminUids.size === 0) {
    console.warn("[addUniqueNotificationForAdmins] 알림을 받을 관리자 계정을 찾지 못했습니다.");
    return 0;
  }

  const batch = db().batch();
  adminUids.forEach((uid) => {
    const ref = db()
      .collection("notifications")
      .doc(uid)
      .collection("items")
      .doc(notificationId);
    batch.set(ref, {
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
  });
  await batch.commit();
  return adminUids.size;
}

