// functions/src/index.ts
// Cloud Functions (ESM + TypeScript)
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type BatchResponse, type SendResponse } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functionsV1 from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";
import { createHash, randomInt } from "node:crypto";
import {
  cleanupExchangeGroupForDeletion,
  deleteCustomerNotificationCopies,
  isRecentAuthentication,
  runRequiredDeletionStages,
} from "./accountDeletionSafety.js";
import {
  checkNicknameAvailabilityForRequest,
  claimNicknameForUser,
  releaseNicknameOwnershipForDeletedUid,
} from "./nicknameSecurity.js";
import goldRatesDefaults from "./goldRates.defaults.json" with { type: "json" };
import {
  bookingBlockReason,
  canTransitionExchangeStatus,
  normalizeExchangeStatus,
  type ExchangeStatus,
} from "./bookingPolicy.js";

/* ── App init (중복 방지) */
if (!getApps().length) initializeApp();

/* ── Lazy getters */
const db = (): Firestore => getFirestore();
const msg = () => getMessaging();
const IN_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";
const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === "true";

function hasAdminClaim(token: Record<string, unknown> | undefined): boolean {
  return token?.admin === true || token?.superAdmin === true;
}

function requireAdmin(token: Record<string, unknown> | undefined): void {
  if (!hasAdminClaim(token)) {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
}

function requireSuperAdmin(token: Record<string, unknown> | undefined): void {
  if (token?.superAdmin !== true) {
    throw new HttpsError("permission-denied", "최고 관리자 권한이 필요합니다.");
  }
}

const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;

/**
 * 계정 영구 삭제는 로그인 여부만으로 허용하지 않고,
 * Firebase ID 토큰의 auth_time이 최근 재인증 시각인지 서버에서 다시 검증합니다.
 */
function requireRecentAuthentication(
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
async function requireVerifiedUser(uid: string | undefined): Promise<string> {
  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  try {
    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError("permission-denied", "사용이 중지된 계정입니다.");
    }

    if (!userRecord.emailVerified) {
      throw new HttpsError(
        "failed-precondition",
        "이메일 인증을 완료한 회원만 이용할 수 있습니다."
      );
    }

    return uid;
  } catch (error) {
    if (error instanceof HttpsError) throw error;

    const code = String((error as { code?: string })?.code || "");
    console.error("[requireVerifiedUser] 사용자 확인 실패", { uid, code });

    if (code === "auth/user-not-found") {
      throw new HttpsError("unauthenticated", "계정 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
    }

    throw new HttpsError(
      "unavailable",
      "회원 인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  }
}

/* ── 공통 상수/유틸 */
const DON_TO_GRAMS = goldRatesDefaults.donToGrams;
const DEFAULT_PURITY: Record<string, number> = goldRatesDefaults.purity;
const DEFAULT_EXCHANGE: Record<string, number> = goldRatesDefaults.exchange;
const DEFAULT_GOLD_RATES_VERSION = goldRatesDefaults.version;

const roundTo3 = (n: number): number => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8);
  let thousands = Math.floor(t / 10);
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};

const BOOKING_TIME_SLOTS = new Set([
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]);
const CUSTOMER_EDITABLE_EXCHANGE_STATUSES = new Set(["requested", "scheduled"]);
const ACTIVE_EXCHANGE_STATUSES = new Set([
  "requested",
  "scheduled",
  "in_progress",
  "교환중",
]);

const MAX_BOOKING_DAYS_AHEAD = 60;
const MAX_ACTIVE_BOOKING_GROUPS_PER_USER = 3;
const MAX_PRODUCTS_PER_BOOKING = 20;
const MAX_PRODUCT_GRAMS = 10_000;
const MAX_TOTAL_PRODUCT_GRAMS = 20_000;
const MAX_NAME_LENGTH = 40;
const MAX_PHONE_LENGTH = 20;
const MAX_CONSENT_VERSION_LENGTH = 50;

const ALLOWED_GOLD_TYPES = new Set(Object.keys(DEFAULT_PURITY));
const ALLOWED_EXCHANGE_TYPES = new Set(Object.keys(DEFAULT_EXCHANGE));

const ALLOWED_BAR_DENOMS = [
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

function koreaDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

const BOOKING_AVAILABILITY_REF = "appConfig/bookingAvailability";

function assertBookingOpen(availabilityData: unknown, visitDate: string, visitTime: string): void {
  const reason = bookingBlockReason(availabilityData, visitDate, visitTime, BOOKING_TIME_SLOTS);
  if (reason) {
    throw new HttpsError("failed-precondition", reason);
  }
}

function validateBookingSchedule(visitDate: string, visitTime: string): void {
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

function normalizeRequiredString(
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

function normalizePhone(value: unknown): string {
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

type ValidatedProduct = {
  goldType: string;
  quantity: number;
  inputUnit: "g" | "don";
  exchangeType: string;
  grams: number;
};

function validateProducts(value: unknown): ValidatedProduct[] {
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

function buildValidatedBarsPlan(
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

function normalizeCustomerReason(value: unknown): string {
  const reason = String(value || "").trim().slice(0, 200);
  if (!reason) {
    throw new HttpsError("invalid-argument", "변경 또는 취소 사유를 입력해 주세요.");
  }
  return reason;
}

function reservedTimesForDate(raw: Record<string, unknown>, dateKey: string): Set<string> {
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

function setReservedTime(
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

function computeFinalWeightFromRates(params: {
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

async function addNotificationForUser(
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

async function addNotificationForAdmins(payload: {
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

async function addUniqueNotificationForAdmins(
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

/* ─────────────────────────────────────────────────────────────
 * 2) 예약 슬롯 해제 (관리자 UI용)
 * ───────────────────────────────────────────────────────────── */
export const releaseReservedSlot = onCall<{ dateKey: string; time: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    const { dateKey, time } = (req.data || {}) as Partial<{ dateKey: string; time: string }>;
    if (
      !dateKey ||
      !time ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      throw new HttpsError("invalid-argument", "날짜와 시간을 올바른 형식으로 입력해 주세요.");
    }
    const ref = db().doc("appConfig/reservedSlots");

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.exists ? (snap.data() as Record<string, unknown>) : {};

      tx.set(ref, setReservedTime(raw, dateKey, time, false));
    });

    return { ok: true, removed: time, dateKey };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 관리자 역할 변경 (최고 관리자 전용)
 * ───────────────────────────────────────────────────────────── */
export const setUserRole = onCall<{ uid: string; role: "user" | "admin" }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const callerUid = req.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    requireSuperAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const uid = String(req.data?.uid || "").trim();
    const role = req.data?.role;
    if (!uid || !["user", "admin"].includes(String(role))) {
      throw new HttpsError("invalid-argument", "사용자와 역할을 확인해 주세요.");
    }
    if (uid === callerUid) {
      throw new HttpsError("failed-precondition", "현재 계정의 역할은 직접 변경할 수 없습니다.");
    }

    const target = await getAuth().getUser(uid);
    if (target.customClaims?.superAdmin === true) {
      throw new HttpsError("failed-precondition", "최고 관리자 역할은 이 기능으로 변경할 수 없습니다.");
    }

    const nextClaims: Record<string, unknown> = { ...(target.customClaims || {}) };
    if (role === "admin") nextClaims.admin = true;
    else delete nextClaims.admin;

    await getAuth().setCustomUserClaims(uid, nextClaims);
    await db().doc(`users/${uid}`).set(
      { role, roleUpdatedAt: FieldValue.serverTimestamp(), roleUpdatedBy: callerUid },
      { merge: true }
    );
    return { ok: true, uid, role };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 관리자 회원 조회 / 계정 상태 변경
 * ───────────────────────────────────────────────────────────── */
export const listAdminUsers = onCall<{ pageToken?: string; pageSize?: number }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const pageSize = Math.max(1, Math.min(Math.trunc(Number(req.data?.pageSize) || 50), 100));
    const pageToken = String(req.data?.pageToken || "").trim();
    if (pageToken.length > 2_000) {
      throw new HttpsError("invalid-argument", "페이지 정보를 확인해 주세요.");
    }

    const result = await getAuth().listUsers(pageSize, pageToken || undefined);
    const profileSnapshots = result.users.length
      ? await db().getAll(...result.users.map((user) => db().doc(`users/${user.uid}`)))
      : [];
    const profiles = new Map(
      profileSnapshots.map((snapshot) => [snapshot.id, snapshot.data() || {}])
    );

    return {
      users: result.users.map((user) => {
        const profile = profiles.get(user.uid) || {};
        const isSuperAdmin = user.customClaims?.superAdmin === true;
        const isAdmin = isSuperAdmin || user.customClaims?.admin === true;
        return {
          uid: user.uid,
          email: user.email || String(profile.email || ""),
          displayName:
            user.displayName ||
            String(profile.displayName || profile.nickname || ""),
          phoneNumber: user.phoneNumber || String(profile.phone || ""),
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          role: isSuperAdmin ? "superAdmin" : isAdmin ? "admin" : "user",
          createdAt: user.metadata.creationTime || null,
          lastSignInAt: user.metadata.lastSignInTime || null,
          bonusGoldG: Number(profile.bonusGoldG || 0),
        };
      }),
      nextPageToken: result.pageToken || null,
    };
  }
);

export const setAdminUserDisabled = onCall<{ uid: string; disabled: boolean }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const callerUid = req.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    requireSuperAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const uid = String(req.data?.uid || "").trim();
    const disabled = req.data?.disabled;
    if (!uid || typeof disabled !== "boolean") {
      throw new HttpsError("invalid-argument", "사용자와 계정 상태를 확인해 주세요.");
    }
    if (uid === callerUid) {
      throw new HttpsError("failed-precondition", "현재 사용 중인 계정은 정지할 수 없습니다.");
    }

    const target = await getAuth().getUser(uid);
    if (target.customClaims?.superAdmin === true) {
      throw new HttpsError("failed-precondition", "최고 관리자 계정 상태는 변경할 수 없습니다.");
    }

    await getAuth().updateUser(uid, { disabled });
    await Promise.all([
      db().doc(`users/${uid}`).set(
        {
          disabled,
          accountStatusUpdatedAt: FieldValue.serverTimestamp(),
          accountStatusUpdatedBy: callerUid,
        },
        { merge: true }
      ),
      db().collection("adminAuditLogs").add({
        action: disabled ? "user_disabled" : "user_enabled",
        targetUid: uid,
        actorUid: callerUid,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);
    return { ok: true, uid, disabled };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 금교환 환산율 변경 (관리자, 버전 충돌 방지 + 감사 이력)
 * ───────────────────────────────────────────────────────────── */
function normalizeRateTable(
  value: unknown,
  defaults: Record<string, number>,
  label: string
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", `${label} 형식이 올바르지 않습니다.`);
  }
  const raw = value as Record<string, unknown>;
  const expectedKeys = Object.keys(defaults);
  if (
    Object.keys(raw).length !== expectedKeys.length ||
    expectedKeys.some((key) => !(key in raw))
  ) {
    throw new HttpsError("invalid-argument", `${label} 항목이 기본 품목과 일치하지 않습니다.`);
  }

  return Object.fromEntries(
    expectedKeys.map((key) => {
      const rate = Number(raw[key]);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
        throw new HttpsError(
          "invalid-argument",
          `${key} 환산율은 0보다 크고 1 이하여야 합니다.`
        );
      }
      return [key, Math.round(rate * 100_000) / 100_000];
    })
  );
}

export const updateGoldRates = onCall<{
  purity: Record<string, number>;
  exchange: Record<string, number>;
  expectedVersion: number;
  reason: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    const actorUid = req.auth?.uid || "system";
    const purity = normalizeRateTable(req.data?.purity, DEFAULT_PURITY, "품목별 환산율");
    const exchange = normalizeRateTable(req.data?.exchange, DEFAULT_EXCHANGE, "교환율");
    const expectedVersion = Math.trunc(Number(req.data?.expectedVersion));
    const reason = String(req.data?.reason || "").trim();
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new HttpsError("invalid-argument", "현재 환산율 버전을 확인해 주세요.");
    }
    if (reason.length < 5 || reason.length > 200) {
      throw new HttpsError("invalid-argument", "변경 사유는 5자 이상 200자 이하로 입력해 주세요.");
    }

    const ratesRef = db().doc("appConfig/goldRates");
    const historyRef = db().collection("goldRateHistory").doc();
    const nextVersion = await db().runTransaction(async (tx) => {
      const snapshot = await tx.get(ratesRef);
      const before = snapshot.exists ? snapshot.data() || {} : {};
      const currentVersion = Number(before.version) || DEFAULT_GOLD_RATES_VERSION;
      if (currentVersion !== expectedVersion) {
        throw new HttpsError(
          "aborted",
          "다른 관리자가 먼저 환산율을 변경했습니다. 새로고침 후 다시 확인해 주세요."
        );
      }
      const version = currentVersion + 1;
      const updatedAt = FieldValue.serverTimestamp();
      tx.set(ratesRef, {
        purity,
        exchange,
        version,
        reason,
        updatedAt,
        updatedBy: actorUid,
      });
      tx.set(historyRef, {
        version,
        reason,
        actorUid,
        before: {
          purity: { ...DEFAULT_PURITY, ...(before.purity || {}) },
          exchange: { ...DEFAULT_EXCHANGE, ...(before.exchange || {}) },
          version: currentVersion,
        },
        after: { purity, exchange, version },
        createdAt: updatedAt,
      });
      return version;
    });

    return { ok: true, version: nextVersion };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 3) 그룹 생성 + 슬롯 선점 (사용자 제출)
 * ───────────────────────────────────────────────────────────── */
export const requestGoldExchangeGroup = onCall<{
  visitDate: string;
  visitTime: string;
  name: string;
  phone: string;
  privacyConsent: boolean;
  privacyConsentVersion: string;
  products?: Array<{
    goldType?: string;
    quantity?: number;
    inputUnit?: "g" | "don";
    exchangeType?: string;
  }>;
  barsPlan?: Record<string, unknown> | null;
}>({ region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const uid = await requireVerifiedUser(req.auth?.uid);

  const {
    visitDate,
    visitTime,
    name,
    phone,
    privacyConsent,
    privacyConsentVersion,
    products = [],
    barsPlan = null,
  } = (req.data || {}) as {
    visitDate?: string;
    visitTime?: string;
    name?: string;
    phone?: string;
    privacyConsent?: boolean;
    privacyConsentVersion?: string;
    products?: Array<{
      goldType?: string;
      quantity?: number;
      inputUnit?: "g" | "don";
      exchangeType?: string;
    }>;
    barsPlan?: Record<string, unknown> | null;
  };

  const normalizedVisitDate = normalizeRequiredString(visitDate, "방문 날짜", 10, 10);
  const normalizedVisitTime = normalizeRequiredString(visitTime, "방문 시간", 5, 5);
  const normalizedName = normalizeRequiredString(name, "성명", MAX_NAME_LENGTH, 2);
  const normalizedPhone = normalizePhone(phone);
  const normalizedConsentVersion = normalizeRequiredString(
    privacyConsentVersion,
    "개인정보 동의 버전",
    MAX_CONSENT_VERSION_LENGTH
  );
  const validatedProducts = validateProducts(products);

  validateBookingSchedule(normalizedVisitDate, normalizedVisitTime);
  if (privacyConsent !== true) {
    throw new HttpsError("invalid-argument", "개인정보 수집·이용 동의가 필요합니다.");
  }

  const ratesSnap = await db().doc("appConfig/goldRates").get();
  const rates = ratesSnap.exists
    ? (ratesSnap.data() as {
        purity?: Record<string, number>;
        exchange?: Record<string, number>;
        version?: number;
      })
    : {
        purity: DEFAULT_PURITY,
        exchange: DEFAULT_EXCHANGE,
        version: DEFAULT_GOLD_RATES_VERSION,
      };
  const rateVersion = Number(rates.version) || DEFAULT_GOLD_RATES_VERSION;

  const slotsRef = db().doc("appConfig/reservedSlots");
  const availabilityRef = db().doc(BOOKING_AVAILABILITY_REF);
  const exchanges = db().collection("goldExchanges");

  // 첫 문서 ref를 미리 만들어서 groupId로 사용
  const firstRef = exchanges.doc();
  const groupId = firstRef.id;
  const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
  const now = FieldValue.serverTimestamp();

  const calculatedProducts = validatedProducts.map((product) => {
    const finalWeight = computeFinalWeightFromRates({
      grams: product.grams,
      goldType: product.goldType,
      exchangeType: product.exchangeType,
      purity: rates.purity,
      exchange: rates.exchange,
    });
    return { ...product, finalWeight };
  });
  const totalFinalGrams = roundTo3(
    calculatedProducts.reduce((sum, product) => sum + product.finalWeight, 0)
  );
  const validatedBarsPlan =
    calculatedProducts.length > 0
      ? buildValidatedBarsPlan(barsPlan, totalFinalGrams)
      : null;

  await db().runTransaction(async (tx) => {
    const [sSnap, availabilitySnap, userBookingsSnapshot] = await Promise.all([
      tx.get(slotsRef),
      tx.get(availabilityRef),
      tx.get(exchanges.where("userId", "==", uid)),
    ]);
    const sData = sSnap.exists ? (sSnap.data() as Record<string, unknown>) : {};
    assertBookingOpen(
      availabilitySnap.exists ? availabilitySnap.data() : {},
      normalizedVisitDate,
      normalizedVisitTime
    );

    const activeGroupIds = new Set<string>();
    userBookingsSnapshot.docs.forEach((document) => {
      const row = document.data() || {};
      if (ACTIVE_EXCHANGE_STATUSES.has(String(row.status || "requested"))) {
        activeGroupIds.add(String(row.groupId || document.id));
      }
    });
    if (activeGroupIds.size >= MAX_ACTIVE_BOOKING_GROUPS_PER_USER) {
      throw new HttpsError(
        "resource-exhausted",
        `진행 중인 예약은 계정당 최대 ${MAX_ACTIVE_BOOKING_GROUPS_PER_USER}건까지 가능합니다.`
      );
    }

    const taken = reservedTimesForDate(sData, normalizedVisitDate).has(normalizedVisitTime);
    if (taken) throw new HttpsError("aborted", "이미 예약된 시간입니다.");

    tx.set(
      slotsRef,
      setReservedTime(sData, normalizedVisitDate, normalizedVisitTime, true)
    );

    if (calculatedProducts.length > 0) {
      for (let i = 0; i < calculatedProducts.length; i++) {
        const p = calculatedProducts[i];
        const docRef = i === 0 ? firstRef : exchanges.doc();
        tx.set(
          docRef,
          {
            userId: uid,
            groupId,
            createdAt: now,
            updatedAt: now,
            status: "requested",
            unknown: false,
            name: normalizedName,
            phone: normalizedPhone,
            visitDate: normalizedVisitDate,
            visitTime: normalizedVisitTime,
            privacyConsent: true,
            privacyConsentVersion: normalizedConsentVersion,
            privacyConsentAt: now,
            originalQuantity: p.quantity,
            inputUnit: p.inputUnit,
            quantity: p.grams,
            goldType: p.goldType,
            exchangeType: p.exchangeType,
            finalWeight: roundTo3(p.finalWeight),
            finalWeightDon: roundTo3(p.finalWeight / DON_TO_GRAMS),
            purityUsed: rates.purity?.[p.goldType] ?? DEFAULT_PURITY[p.goldType],
            exchangeRatioUsed:
              rates.exchange?.[p.exchangeType] ?? DEFAULT_EXCHANGE[p.exchangeType],
            calcVersion: 5,
            rateVersion,
            ...(validatedBarsPlan ? { barsPlan: validatedBarsPlan } : {}),
          } as FirebaseFirestore.DocumentData
        );
      }
    } else {
      // 현장 확인 only
      tx.set(
        firstRef,
        {
          userId: uid,
          groupId,
          createdAt: now,
          updatedAt: now,
          status: "requested",
          unknown: true,
          name: normalizedName,
          phone: normalizedPhone,
          visitDate: normalizedVisitDate,
          visitTime: normalizedVisitTime,
          privacyConsent: true,
          privacyConsentVersion: normalizedConsentVersion,
          privacyConsentAt: now,
          goldType: "미확인",
          exchangeType: "999.9골드바",
          originalQuantity: 0,
          inputUnit: "g",
          quantity: 0,
          finalWeight: 0,
          finalWeightDon: 0,
          calcVersion: 5,
          rateVersion,
        } as FirebaseFirestore.DocumentData
      );
    }

    // 고객/관리자 화면이 집계 트리거를 기다리지 않고 즉시 바뀌도록
    // 그룹 요약 문서도 같은 트랜잭션에서 함께 갱신합니다.
    tx.set(
      groupMetaRef,
      {
        ownerUid: uid,
        repStatus: "requested",
        visitDate: normalizedVisitDate,
        visitTime: normalizedVisitTime,
        totalG: totalFinalGrams,
        totalDon: roundTo3(totalFinalGrams / DON_TO_GRAMS),
        createdAt: now,
        updatedAt: now,
        ...(validatedBarsPlan ? { barsPlan: validatedBarsPlan } : {}),
      } as FirebaseFirestore.DocumentData,
      { merge: true }
    );
  });

  // 사용자와 관리자 알림은 예약 저장 성공 여부에 영향을 주지 않도록 분리합니다.
  const notificationResults = await Promise.allSettled([
    addNotificationForUser(uid, {
      type: "exchange_requested",
      title: "금교환 예약 신청이 접수되었습니다",
      body: `${normalizedVisitDate} ${normalizedVisitTime} 방문 예약 신청이 접수되었습니다. 관리자 확인 후 예약 확정 알림을 보내드립니다.`,
      link: "/my-exchanges",
      meta: { groupId },
    }),
    addNotificationForAdmins({
      type: "admin_exchange_requested",
      title: "새 금교환 예약 확인이 필요합니다",
      body: `${normalizedName}님 · ${normalizedVisitDate} ${normalizedVisitTime} 방문 예약 신청`,
      link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
      meta: {
        groupId,
        visitDate: normalizedVisitDate,
        visitTime: normalizedVisitTime,
        customerUid: uid,
      },
    }),
  ]);
  notificationResults.forEach((result) => {
    if (result.status === "rejected") {
      console.error("[requestGoldExchangeGroup] 알림 생성 실패", result.reason);
    }
  });

  return { ok: true, groupId };
});

type CustomerEditableGroup = {
  documents: FirebaseFirestore.DocumentSnapshot[];
  visitDate: string;
  visitTime: string;
  customerName: string;
};

async function getCustomerEditableGroup(
  tx: FirebaseFirestore.Transaction,
  groupId: string,
  uid: string
): Promise<CustomerEditableGroup> {
  const collection = db().collection("goldExchanges");
  const groupSnapshot = await tx.get(collection.where("groupId", "==", groupId));
  const documents: FirebaseFirestore.DocumentSnapshot[] = [...groupSnapshot.docs];
  if (documents.length === 0) {
    const single = await tx.get(collection.doc(groupId));
    if (single.exists) documents.push(single);
  }
  if (documents.length === 0) {
    throw new HttpsError("not-found", "금교환 예약을 찾을 수 없습니다.");
  }

  const rows = documents.map((document) => document.data() || {});
  if (rows.some((row) => String(row.userId || "") !== uid)) {
    throw new HttpsError("permission-denied", "본인의 예약만 변경하거나 취소할 수 있습니다.");
  }
  if (
    rows.some(
      (row) => !CUSTOMER_EDITABLE_EXCHANGE_STATUSES.has(String(row.status || "requested"))
    )
  ) {
    throw new HttpsError(
      "failed-precondition",
      "접수 대기 또는 예약 승인 상태에서만 일정 변경과 취소가 가능합니다."
    );
  }

  const visitDates = new Set(rows.map((row) => String(row.visitDate || "")).filter(Boolean));
  const visitTimes = new Set(rows.map((row) => String(row.visitTime || "")).filter(Boolean));
  if (visitDates.size !== 1 || visitTimes.size !== 1) {
    throw new HttpsError("failed-precondition", "현재 예약 일정을 확인할 수 없습니다.");
  }

  return {
    documents,
    visitDate: [...visitDates][0],
    visitTime: [...visitTimes][0],
    customerName: String(rows.find((row) => row.name)?.name || "고객"),
  };
}

export const rescheduleGoldExchangeGroup = onCall<{
  groupId: string;
  visitDate: string;
  visitTime: string;
  reason: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = await requireVerifiedUser(req.auth?.uid);

    const groupId = String(req.data?.groupId || "").trim();
    const visitDate = String(req.data?.visitDate || "").trim();
    const visitTime = String(req.data?.visitTime || "").trim();
    const reason = normalizeCustomerReason(req.data?.reason);
    if (!groupId) throw new HttpsError("invalid-argument", "예약 정보를 확인해 주세요.");
    validateBookingSchedule(visitDate, visitTime);

    const slotsRef = db().doc("appConfig/reservedSlots");
    const availabilityRef = db().doc(BOOKING_AVAILABILITY_REF);
    const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
    const now = FieldValue.serverTimestamp();
    const result = await db().runTransaction(async (tx) => {
      const group = await getCustomerEditableGroup(tx, groupId, uid);
      const [slotsSnapshot, availabilitySnapshot] = await Promise.all([
        tx.get(slotsRef),
        tx.get(availabilityRef),
      ]);
      const slots = slotsSnapshot.exists
        ? (slotsSnapshot.data() as Record<string, unknown>)
        : {};
      assertBookingOpen(
        availabilitySnapshot.exists ? availabilitySnapshot.data() : {},
        visitDate,
        visitTime
      );

      if (group.visitDate === visitDate && group.visitTime === visitTime) {
        throw new HttpsError("invalid-argument", "현재 예약과 다른 날짜 또는 시간을 선택해 주세요.");
      }
      if (reservedTimesForDate(slots, visitDate).has(visitTime)) {
        throw new HttpsError("aborted", "이미 예약된 시간입니다. 다른 시간을 선택해 주세요.");
      }

      const releasedSlots = setReservedTime(
        slots,
        group.visitDate,
        group.visitTime,
        false
      );
      tx.set(slotsRef, setReservedTime(releasedSlots, visitDate, visitTime, true));
      group.documents.forEach((document) => {
        tx.update(document.ref, {
          status: "requested",
          visitDate,
          visitTime,
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "rescheduled",
          scheduleChangeReason: reason,
          scheduleChangeRequestedAt: now,
          scheduleChangeRequestedBy: uid,
          scheduledAt: FieldValue.delete(),
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: uid,
        });
      });

      tx.set(
        groupMetaRef,
        {
          ownerUid: uid,
          repStatus: "requested",
          visitDate,
          visitTime,
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "rescheduled",
          scheduleChangeReason: reason,
          scheduleChangeRequestedAt: now,
          scheduleChangeRequestedBy: uid,
          scheduledAt: FieldValue.delete(),
          updatedAt: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      return {
        previousVisitDate: group.visitDate,
        previousVisitTime: group.visitTime,
        customerName: group.customerName,
      };
    });

    await reconcileBonusUsageForGroup({ groupId, targetStatus: "requested", adminUid: uid });
    const notificationResults = await Promise.allSettled([
      addNotificationForUser(uid, {
        type: "exchange_reschedule_requested",
        title: "예약 일정 변경 요청이 접수되었습니다",
        body: `${visitDate} ${visitTime} 일정으로 변경 요청이 접수되었습니다. 관리자 확인 후 변경된 예약 확정 알림을 보내드립니다.`,
        link: "/my-exchanges",
        meta: {
          groupId,
          previousVisitDate: result.previousVisitDate,
          previousVisitTime: result.previousVisitTime,
          visitDate,
          visitTime,
          reason,
        },
      }),
      addNotificationForAdmins({
        type: "admin_exchange_rescheduled",
        title: "예약 일정 변경 확인이 필요합니다",
        body: `${result.customerName}님 · ${result.previousVisitDate} ${result.previousVisitTime} → ${visitDate} ${visitTime} · ${reason}`,
        link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
        meta: {
          groupId,
          customerUid: uid,
          previousVisitDate: result.previousVisitDate,
          previousVisitTime: result.previousVisitTime,
          visitDate,
          visitTime,
          reason,
        },
      }),
    ]);
    notificationResults.forEach((notificationResult) => {
      if (notificationResult.status === "rejected") {
        console.error("[rescheduleGoldExchangeGroup] 알림 생성 실패", notificationResult.reason);
      }
    });

    return { ok: true, groupId, visitDate, visitTime };
  }
);

export const cancelGoldExchangeGroup = onCall<{ groupId: string; reason: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const groupId = String(req.data?.groupId || "").trim();
    const reason = normalizeCustomerReason(req.data?.reason);
    if (!groupId) throw new HttpsError("invalid-argument", "예약 정보를 확인해 주세요.");

    const slotsRef = db().doc("appConfig/reservedSlots");
    const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
    const now = FieldValue.serverTimestamp();
    const result = await db().runTransaction(async (tx) => {
      const group = await getCustomerEditableGroup(tx, groupId, uid);
      const slotsSnapshot = await tx.get(slotsRef);
      const slots = slotsSnapshot.exists
        ? (slotsSnapshot.data() as Record<string, unknown>)
        : {};
      tx.set(slotsRef, setReservedTime(slots, group.visitDate, group.visitTime, false));
      group.documents.forEach((document) => {
        tx.update(document.ref, {
          status: "canceled",
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "canceled",
          cancellationReason: reason,
          cancellationRequestedAt: now,
          cancellationRequestedBy: uid,
          canceledAt: now,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: uid,
        });
      });

      tx.set(
        groupMetaRef,
        {
          ownerUid: uid,
          repStatus: "canceled",
          visitDate: group.visitDate,
          visitTime: group.visitTime,
          previousVisitDate: group.visitDate,
          previousVisitTime: group.visitTime,
          scheduleChangeType: "canceled",
          cancellationReason: reason,
          cancellationRequestedAt: now,
          cancellationRequestedBy: uid,
          canceledAt: now,
          updatedAt: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      return {
        visitDate: group.visitDate,
        visitTime: group.visitTime,
        customerName: group.customerName,
      };
    });

    await reconcileBonusUsageForGroup({ groupId, targetStatus: "canceled", adminUid: uid });
    const notificationResults = await Promise.allSettled([
      addNotificationForUser(uid, {
        type: "exchange_canceled_by_customer",
        title: "금교환 예약이 취소되었습니다",
        body: `${result.visitDate} ${result.visitTime} 방문 예약이 취소되었습니다.`,
        link: "/my-exchanges",
        meta: { groupId, ...result, reason },
      }),
      addNotificationForAdmins({
        type: "admin_exchange_canceled_by_customer",
        title: "고객이 금교환 예약을 취소했습니다",
        body: `${result.customerName}님 · ${result.visitDate} ${result.visitTime} · ${reason}`,
        link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
        meta: { groupId, customerUid: uid, ...result, reason },
      }),
    ]);
    notificationResults.forEach((notificationResult) => {
      if (notificationResult.status === "rejected") {
        console.error("[cancelGoldExchangeGroup] 알림 생성 실패", notificationResult.reason);
      }
    });

    return { ok: true, groupId };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 4) 그룹 상태 일괄 변경 (관리자)
 * ───────────────────────────────────────────────────────────── */
export const setExchangeGroupStatus = onCall<{
  groupId: string;
  status: "requested" | "scheduled" | "in_progress" | "completed" | "canceled" | "rejected";
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const groupId = String(req.data?.groupId || "").trim();
    const status = String(req.data?.status || "").trim() as
      | "requested"
      | "scheduled"
      | "in_progress"
      | "completed"
      | "canceled"
      | "rejected";
    const allowedStatuses = new Set([
      "requested",
      "scheduled",
      "in_progress",
      "completed",
      "canceled",
      "rejected",
    ]);
    if (!groupId || !allowedStatuses.has(status)) {
      throw new HttpsError("invalid-argument", "교환 그룹과 변경 상태를 확인해 주세요.");
    }

    const groupMetaRef = db().doc(`goldExchangeGroups/${groupId}`);
    const groupMetaSnap = await groupMetaRef.get();
    const bonusUsageStatus = String(groupMetaSnap.get("bonusGoldUsageStatus") || "");
    if (status === "completed" && bonusUsageStatus === "requested") {
      throw new HttpsError(
        "failed-precondition",
        "적립 순금 사용 신청을 먼저 확정하거나 취소해 주세요."
      );
    }

    const col = db().collection("goldExchanges");
    const slotsRef = db().doc("appConfig/reservedSlots");
    const now = FieldValue.serverTimestamp();
    const adminUid = req.auth?.uid || "system";

    const result = await db().runTransaction(async (tx) => {
      const groupQuery = col.where("groupId", "==", groupId);
      const groupSnapshot = await tx.get(groupQuery);
      let documents: FirebaseFirestore.DocumentSnapshot[] = [...groupSnapshot.docs];

      if (documents.length === 0) {
        const single = await tx.get(col.doc(groupId));
        if (single.exists) documents = [single];
      }
      if (documents.length === 0) {
        throw new HttpsError("not-found", "그룹을 찾을 수 없습니다.");
      }

      const rows = documents.map((document) => document.data() || {});
      const visitDates = new Set(rows.map((row) => String(row.visitDate || "")).filter(Boolean));
      const visitTimes = new Set(rows.map((row) => String(row.visitTime || "")).filter(Boolean));
      if (visitDates.size !== 1 || visitTimes.size !== 1) {
        throw new HttpsError("failed-precondition", "예약 날짜와 시간이 일치하지 않습니다.");
      }

      const visitDate = [...visitDates][0];
      const visitTime = [...visitTimes][0];
      const currentStatuses = new Set(
        rows.map((row) => String(row.status || "requested"))
      );

      const normalizedCurrentStatuses = [...currentStatuses].map((value) =>
        normalizeExchangeStatus(value)
      );
      if (normalizedCurrentStatuses.some((value) => !value)) {
        throw new HttpsError("failed-precondition", "현재 예약 상태를 확인할 수 없습니다.");
      }
      const current = normalizedCurrentStatuses[0] as ExchangeStatus;
      if (normalizedCurrentStatuses.some((value) => value !== current)) {
        throw new HttpsError("failed-precondition", "그룹 내 예약 상태가 서로 달라 확인이 필요합니다.");
      }
      const target = status as ExchangeStatus;
      if (!canTransitionExchangeStatus(current, target)) {
        throw new HttpsError(
          "failed-precondition",
          `${current} 상태에서 ${target} 상태로 변경할 수 없습니다.`
        );
      }
      if (current === target) {
        return {
          targetUid: String(rows.find((row) => row.userId)?.userId || ""),
          visitDate,
          visitTime,
          scheduleChangeType: "",
          previousVisitDate: "",
          previousVisitTime: "",
          changed: false,
        };
      }

      const targetUid = String(rows.find((row) => row.userId)?.userId || "");
      const scheduleRow =
        rows.find((row) => String(row.scheduleChangeType || "") === "rescheduled") ||
        rows.find((row) => row.scheduleChangeType);
      const scheduleChangeType = String(scheduleRow?.scheduleChangeType || "");
      const previousVisitDate = String(scheduleRow?.previousVisitDate || "");
      const previousVisitTime = String(scheduleRow?.previousVisitTime || "");

      const [slotsSnapshot, availabilitySnapshot] = await Promise.all([
        tx.get(slotsRef),
        tx.get(db().doc(BOOKING_AVAILABILITY_REF)),
      ]);
      const slots = slotsSnapshot.exists
        ? (slotsSnapshot.data() as Record<string, unknown>)
        : {};

      let nextSlots = slots;
      if (status === "requested") {
        const isRestoringReleasedReservation = [...currentStatuses].some(
          (currentStatus) => currentStatus === "rejected"
        );
        if (isRestoringReleasedReservation) {
          assertBookingOpen(
            availabilitySnapshot.exists ? availabilitySnapshot.data() : {},
            visitDate,
            visitTime
          );
          if (reservedTimesForDate(slots, visitDate).has(visitTime)) {
            throw new HttpsError(
              "already-exists",
              "해당 시간은 이미 다른 고객이 예약했습니다. 다른 시간으로 변경한 뒤 복구해 주세요."
            );
          }
          nextSlots = setReservedTime(slots, visitDate, visitTime, true);
        }
      } else if (status === "canceled" || status === "rejected") {
        nextSlots = setReservedTime(slots, visitDate, visitTime, false);
      }

      if (nextSlots !== slots) {
        tx.set(slotsRef, nextSlots);
      }

      const extra: Record<string, unknown> = {};
      if (status === "scheduled") {
        extra.scheduledAt = now;
        if (scheduleChangeType === "rescheduled") {
          extra.scheduleChangeConfirmedAt = now;
        }
      }
      if (status === "in_progress") extra.startedAt = now;
      if (status === "completed") extra.completedAt = now;
      if (status === "canceled") extra.canceledAt = now;
      if (status === "rejected") extra.rejectedAt = now;

      documents.forEach((document) => {
        tx.update(document.ref, {
          status,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: adminUid,
          ...extra,
        } as FirebaseFirestore.DocumentData);
      });

      tx.set(
        groupMetaRef,
        {
          repStatus: status,
          visitDate,
          visitTime,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: adminUid,
          ...(scheduleChangeType
            ? {
                scheduleChangeType,
                previousVisitDate,
                previousVisitTime,
              }
            : {}),
          ...extra,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      return {
        targetUid,
        visitDate,
        visitTime,
        scheduleChangeType,
        previousVisitDate,
        previousVisitTime,
        changed: true,
      };
    });

    if (!result.changed) {
      return { ok: true, unchanged: true };
    }

    if (
      status === "canceled" ||
      status === "rejected" ||
      (status === "requested" && bonusUsageStatus === "used")
    ) {
      await reconcileBonusUsageForGroup({
        groupId,
        targetStatus: status,
        adminUid,
      });
    }

    if (result.targetUid) {
      const visitSchedule = [result.visitDate, result.visitTime].filter(Boolean).join(" ");
      const notifications = {
        requested: {
          type: "exchange_requested",
          title: "금교환 예약 확인 대기 상태입니다",
          body: visitSchedule
            ? `${visitSchedule} 방문 예약을 관리자 확인 중입니다.`
            : "방문 예약을 관리자 확인 중입니다.",
        },
        scheduled:
          result.scheduleChangeType === "rescheduled"
            ? {
                type: "exchange_reschedule_scheduled",
                title: "변경된 예약이 확정되었습니다",
                body: visitSchedule
                  ? `${visitSchedule} 원일귀금속 방문 예약으로 변경 확정되었습니다.`
                  : "변경 요청한 원일귀금속 방문 예약이 확정되었습니다.",
              }
            : {
                type: "exchange_scheduled",
                title: "금교환 예약이 확정되었습니다",
                body: visitSchedule
                  ? `${visitSchedule} 원일귀금속 방문 예약이 확정되었습니다.`
                  : "원일귀금속 방문 예약이 확정되었습니다.",
              },
        in_progress: {
          type: "exchange_in_progress",
          title: "금 교환을 확인하고 있습니다",
          body: "순도·중량과 골드바 교환 내용을 확인하고 있습니다.",
        },
        completed: {
          type: "exchange_completed",
          title: "금 교환이 완료되었습니다",
          body: "교환 내역을 확인하고 후기를 남길 수 있습니다.",
        },
        canceled: {
          type: "exchange_canceled",
          title: "금교환 예약이 취소되었습니다",
          body: visitSchedule
            ? `${visitSchedule} 방문 예약이 취소되었습니다.`
            : "방문 예약이 취소되었습니다.",
        },
        rejected: {
          type: "exchange_rejected",
          title: "금 교환 요청 확인이 필요합니다",
          body: "교환내역을 확인하거나 원일귀금속으로 문의해 주세요.",
        },
      } as const;
      const notification = notifications[status];

      await addNotificationForUser(result.targetUid, {
        ...notification,
        link: "/my-exchanges",
        meta: { groupId, newStatus: status },
      });
    }

    return { ok: true };
  }
);


/* ─────────────────────────────────────────────────────────────
 * 5) 그룹 요약 집계
 * ───────────────────────────────────────────────────────────── */
export const aggregateGoldExchangeGroup = onDocumentWritten(
  { region: "asia-northeast3", document: "goldExchanges/{docId}" },
  async (event) => {
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const groupId =
      (after?.["groupId"] as string | undefined) || (before?.["groupId"] as string | undefined);
    if (!groupId) return;

    const qs = await db().collection("goldExchanges").where("groupId", "==", groupId).get();
    if (qs.empty) {
      await db().doc(`goldExchangeGroups/${groupId}`).delete().catch(() => {});
      return;
    }

    const priority = [
      "rejected",
      "canceled",
      "completed",
      "scheduled",
      "in_progress",
      "requested",
    ] as const;

    let totalG = 0;
    let repStatus: (typeof priority)[number] = "requested";
    let createdAt: Date | null = null;
    let updatedAt: Date | null = null;
    let visitDate = "";
    let visitTime = "";
    let ownerUid: string | null = null;
    let scheduleChangeType = "";
    let previousVisitDate = "";
    let previousVisitTime = "";
    let scheduleChangeReason = "";
    let cancellationReason = "";
    let scheduleChangeRequestedAt: FirebaseFirestore.Timestamp | Date | null = null;
    let cancellationRequestedAt: FirebaseFirestore.Timestamp | Date | null = null;

    qs.docs.forEach((d) => {
      const x = (d.data() || {}) as {
        userId?: string;
        finalWeight?: number;
        status?: (typeof priority)[number];
        createdAt?: FirebaseFirestore.Timestamp | Date;
        updatedAt?: FirebaseFirestore.Timestamp | Date;
        visitDate?: string;
        visitTime?: string;
        scheduleChangeType?: string;
        previousVisitDate?: string;
        previousVisitTime?: string;
        scheduleChangeReason?: string;
        cancellationReason?: string;
        scheduleChangeRequestedAt?: FirebaseFirestore.Timestamp | Date;
        cancellationRequestedAt?: FirebaseFirestore.Timestamp | Date;
      };

      totalG += Number(x.finalWeight || 0);

      const idx = priority.indexOf((x.status || "requested") as (typeof priority)[number]);
      const ridx = priority.indexOf(repStatus);
      if (idx > -1 && (ridx === -1 || idx < ridx)) {
        repStatus = (x.status || "requested") as (typeof priority)[number];
      }

      const c =
        x.createdAt instanceof Date
          ? x.createdAt
          : (x.createdAt as FirebaseFirestore.Timestamp | undefined)?.toDate?.() ?? null;
      const u =
        x.updatedAt instanceof Date
          ? x.updatedAt
          : (x.updatedAt as FirebaseFirestore.Timestamp | undefined)?.toDate?.() ?? null;

      if (!createdAt || (c && c < createdAt)) createdAt = c;
      if (!updatedAt || (u && u > updatedAt)) updatedAt = u;

      if (!ownerUid && x.userId) ownerUid = x.userId;

      if (!visitDate && x.visitDate) visitDate = x.visitDate;
      if (!visitTime && x.visitTime) visitTime = x.visitTime;

      if (!scheduleChangeType && x.scheduleChangeType) {
        scheduleChangeType = String(x.scheduleChangeType);
        previousVisitDate = String(x.previousVisitDate || "");
        previousVisitTime = String(x.previousVisitTime || "");
        scheduleChangeReason = String(x.scheduleChangeReason || "");
        cancellationReason = String(x.cancellationReason || "");
        scheduleChangeRequestedAt = x.scheduleChangeRequestedAt || null;
        cancellationRequestedAt = x.cancellationRequestedAt || null;
      }
    });

    await db().doc(`goldExchangeGroups/${groupId}`).set(
      {
        totalG: roundTo3(totalG),
        totalDon: roundTo3(totalG / DON_TO_GRAMS),
        repStatus,
        createdAt: createdAt || FieldValue.serverTimestamp(),
        updatedAt: updatedAt || FieldValue.serverTimestamp(),
        visitDate,
        visitTime,
        ownerUid: ownerUid || null,
        ...(scheduleChangeType
          ? {
              scheduleChangeType,
              previousVisitDate,
              previousVisitTime,
              scheduleChangeReason,
              cancellationReason,
              ...(scheduleChangeRequestedAt ? { scheduleChangeRequestedAt } : {}),
              ...(cancellationRequestedAt ? { cancellationRequestedAt } : {}),
            }
          : {}),
      } as FirebaseFirestore.DocumentData,
      { merge: true }
    );
  }
);

type NotificationPreferences = { allEnabled: boolean; exchange: boolean; goldNews: boolean; benefits: boolean; };

function normalizeNotificationPreferences(raw: unknown): NotificationPreferences {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return { allEnabled: source.allEnabled !== false, exchange: source.exchange !== false, goldNews: source.goldNews !== false, benefits: source.benefits === true };
}

function notificationCategory(typeValue: unknown): "exchange" | "goldNews" | "benefits" | "other" {
  const type = String(typeValue || "").toLowerCase();
  if (type.startsWith("exchange_") || type.startsWith("bonus_gold_usage_")) return "exchange";
  if (type.startsWith("gold_price") || type.startsWith("gold_news") || type.startsWith("market_") || type === "notice") return "goldNews";
  if (type.startsWith("promo_") || type.startsWith("quiz_") || type === "promo_bonus" || type === "welcome_bonus" || type.startsWith("event_") || type.startsWith("benefit_")) return "benefits";
  return "other";
}

function marketingConsentAccepted(userData: FirebaseFirestore.DocumentData | undefined): boolean {
  return userData?.consents?.marketing?.accepted === true;
}

function marketingPushEnabled(
  userData: FirebaseFirestore.DocumentData | undefined,
  preferences: NotificationPreferences
): boolean {
  // 광고성 정보는 법적 동의와 기존 사용자 알림 선호를 모두 통과해야 합니다.
  // benefits 레거시 필드는 새 단일 스위치와 호환되지 않을 수 있어 goldNews를 공통 마케팅 푸시 선호로 사용합니다.
  return (
    marketingConsentAccepted(userData) &&
    preferences.allEnabled !== false &&
    preferences.goldNews !== false
  );
}

function shouldSendPushForUser(
  userData: FirebaseFirestore.DocumentData | undefined,
  preferences: NotificationPreferences,
  typeValue: unknown
): boolean {
  const category = notificationCategory(typeValue);

  // 예약·교환 등 이용자가 신청한 서비스 진행 안내는 마케팅 선택과 분리합니다.
  if (category === "exchange") return true;

  // 금시세·주요 소식·이벤트·혜택은 광고성 정보 수신동의가 있는 경우에만 발송합니다.
  if (category === "goldNews" || category === "benefits") {
    return marketingPushEnabled(userData, preferences);
  }

  // 일반 중요/서비스 알림은 광고 카테고리로 사용하지 않는 것을 전제로 합니다.
  return true;
}

/* ─────────────────────────────────────────────────────────────
 * 6) 관리자 예약 가능일/시간 관리
 * ───────────────────────────────────────────────────────────── */
export const setBookingAvailability = onCall<{
  dateKey: string;
  closed?: boolean;
  blockedSlots?: string[];
  reason?: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const dateKey = String(req.data?.dateKey || "").trim();
    const closed = req.data?.closed === true;
    const reason = String(req.data?.reason || "").trim().slice(0, 120);
    const blockedSlots = [...new Set(
      (Array.isArray(req.data?.blockedSlots) ? req.data.blockedSlots : [])
        .map((slot) => String(slot || "").trim())
        .filter((slot) => BOOKING_TIME_SLOTS.has(slot))
    )].sort();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new HttpsError("invalid-argument", "관리할 날짜를 확인해 주세요.");
    }
    const [year, month, day] = dateKey.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new HttpsError("invalid-argument", "관리할 날짜를 확인해 주세요.");
    }

    const ref = db().doc(BOOKING_AVAILABILITY_REF);
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() || {}) : {};
      const currentDates = data.dates && typeof data.dates === "object" && !Array.isArray(data.dates)
        ? { ...(data.dates as Record<string, unknown>) }
        : {};

      if (!closed && blockedSlots.length === 0) {
        delete currentDates[dateKey];
      } else {
        currentDates[dateKey] = { closed, blockedSlots, reason };
      }

      tx.set(ref, {
        version: 1,
        dates: currentDates,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: req.auth?.uid || "system",
      }, { merge: true });
    });

    return { ok: true, dateKey, closed, blockedSlots, reason };
  }
);

type PushDeviceInput = {
  label?: string;
  browser?: string;
  platform?: string;
};

function normalizePushDeviceText(
  value: unknown,
  fallback: string,
  maxLength = 80
): string {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return normalized || fallback;
}

function pushDeviceIdForToken(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex").slice(0, 20);
  return `d_${digest}`;
}

function readPushDevices(value: unknown): Record<string, FirebaseFirestore.DocumentData> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const result: Record<string, FirebaseFirestore.DocumentData> = {};

  Object.entries(source).forEach(([key, entry]) => {
    if (!key || !entry || typeof entry !== "object" || Array.isArray(entry)) return;
    result[key] = { ...(entry as FirebaseFirestore.DocumentData) };
  });

  return result;
}

function removePushDevicesForTokens(
  value: unknown,
  tokens: string[]
): Record<string, FirebaseFirestore.DocumentData> {
  const devices = readPushDevices(value);
  const badTokens = new Set(tokens.map((token) => String(token || "").trim()).filter(Boolean));

  if (!badTokens.size) return devices;

  Object.entries(devices).forEach(([key, entry]) => {
    const entryToken = String(entry?.token || "").trim();
    if (badTokens.has(entryToken)) {
      delete devices[key];
      return;
    }

    for (const token of badTokens) {
      if (key === pushDeviceIdForToken(token)) {
        delete devices[key];
        break;
      }
    }
  });

  return devices;
}

function inferWebPushDeviceFromUserAgent(userAgent: string): PushDeviceInput {
  const ua = String(userAgent || "").trim();
  if (!ua) return {};

  let browser = "";

  if (/SamsungBrowser/i.test(ua)) browser = "삼성인터넷";
  else if (/EdgA|EdgiOS|Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/CriOS|Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  let platform = "";

  if (/Android/i.test(ua)) platform = "Android";
  else if (/iPad|iPhone|iPod/i.test(ua)) platform = "iOS/iPadOS";
  else if (/Windows/i.test(ua)) platform = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) platform = "macOS";
  else if (/Linux/i.test(ua)) platform = "Linux";

  const fallbackBrowser = browser || "현재 브라우저";

  return {
    browser: browser || undefined,
    platform: platform || undefined,
    label: platform
      ? `${fallbackBrowser} · ${platform}`
      : browser || undefined,
  };
}

function normalizedPushDevice(
  native: boolean,
  input: PushDeviceInput | undefined,
  userAgent = ""
): {
  label: string;
  browser: string;
  platform: string;
  channel: "android-app" | "web";
} {
  if (native) {
    return {
      label: "한국골드마켓 앱",
      browser: "",
      platform: "Android",
      channel: "android-app",
    };
  }

  /*
   * 웹 브라우저는 callable 요청의 User-Agent를 우선 사용합니다.
   * 따라서 예전 웹 번들이 device 정보를 보내지 않더라도
   * 다음 토큰 재등록 시 삼성인터넷/Chrome 등을 식별할 수 있습니다.
   */
  const inferred = inferWebPushDeviceFromUserAgent(userAgent);

  const browser = normalizePushDeviceText(
    inferred.browser || input?.browser,
    "현재 브라우저",
    60
  );
  const platform = normalizePushDeviceText(
    inferred.platform || input?.platform,
    "알 수 없음",
    60
  );
  const defaultLabel =
    platform && platform !== "알 수 없음"
      ? `${browser} · ${platform}`
      : browser;

  return {
    label: normalizePushDeviceText(
      inferred.label || input?.label,
      defaultLabel,
      100
    ),
    browser,
    platform,
    channel: "web",
  };
}

/* ─────────────────────────────────────────────────────────────
 * 6) FCM 토큰 소유권 연결
 * - 같은 기기 토큰이 여러 회원에게 동시에 연결되지 않도록 서버에서 이전합니다.
 * - 로그아웃만으로는 토큰을 지우지 않지만, 다른 계정이 로그인하면 새 계정으로 소유권이 이동합니다.
 * ───────────────────────────────────────────────────────────── */
export const bindPushToken = onCall<{
  token: string;
  native?: boolean;
  device?: PushDeviceInput;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const token = String(req.data?.token || "").trim();
    const native = req.data?.native === true;

    if (token.length < 20 || token.length > 4_096) {
      throw new HttpsError("invalid-argument", "유효한 알림 토큰이 필요합니다.");
    }

    const requestUserAgent = String(
      req.rawRequest?.headers?.["user-agent"] || ""
    );
    const device = normalizedPushDevice(
      native,
      req.data?.device,
      requestUserAgent
    );
    const deviceId = pushDeviceIdForToken(token);
    const now = new Date();

    const users = db().collection("users");
    const targetRef = users.doc(uid);
    const ownersQuery = users.where("fcmTokens", "array-contains", token);

    const movedFrom = await db().runTransaction(async (tx) => {
      const [ownersSnapshot, targetSnapshot] = await Promise.all([
        tx.get(ownersQuery),
        tx.get(targetRef),
      ]);

      let previousOwners = 0;

      ownersSnapshot.docs.forEach((ownerDoc) => {
        if (ownerDoc.id === uid) return;

        previousOwners += 1;

        const ownerData = ownerDoc.data() || {};
        const ownerPushDevices = readPushDevices(ownerData.pushDevices);
        delete ownerPushDevices[deviceId];

        const patch: FirebaseFirestore.DocumentData = {
          fcmTokens: FieldValue.arrayRemove(token),
          nativeFcmTokens: FieldValue.arrayRemove(token),
          pushDevices: ownerPushDevices,
          pushTokensUpdatedAt: FieldValue.serverTimestamp(),
        };

        if (String(ownerData.marketingFcmToken || "").trim() === token) {
          patch.marketingFcmToken = null;
          patch.marketingFcmBrowser = "";
          patch.marketingFcmTokenUpdatedAt = FieldValue.serverTimestamp();
        }

        tx.set(ownerDoc.ref, patch, { merge: true });
      });

      const targetData = targetSnapshot.exists
        ? (targetSnapshot.data() || {})
        : {};
      const targetPushDevices = readPushDevices(targetData.pushDevices);
      const existingDevice =
        targetPushDevices[deviceId] &&
        typeof targetPushDevices[deviceId] === "object"
          ? targetPushDevices[deviceId]
          : {};

      targetPushDevices[deviceId] = {
        ...existingDevice,
        token,
        label: device.label,
        browser: device.browser,
        platform: device.platform,
        channel: device.channel,
        native,
        firstSeenAt: existingDevice.firstSeenAt || now,
        lastSeenAt: now,
      };

      const targetPatch: FirebaseFirestore.DocumentData = {
        fcmTokens: FieldValue.arrayUnion(token),
        pushDevices: targetPushDevices,
        pushTokensUpdatedAt: FieldValue.serverTimestamp(),
      };

      if (native) {
        targetPatch.nativeFcmTokens = FieldValue.arrayUnion(token);
      }

      if (!targetSnapshot.exists) {
        targetPatch.createdAt = FieldValue.serverTimestamp();
      }

      tx.set(targetRef, targetPatch, { merge: true });

      return previousOwners;
    });

    return {
      ok: true,
      native,
      movedFrom,
      deviceId,
      device,
    };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 6) 알림 문서 생성 시 FCM 발송
 * ───────────────────────────────────────────────────────────── */
export const onNotificationCreate = onDocumentCreated(
  { region: "asia-northeast3", document: "notifications/{uid}/items/{docId}" },
  async (event) => {
    try {
      if (IN_EMULATOR) return;

      const { uid } = event.params as { uid: string };
      const notif = (event.data?.data() || {}) as {
        title?: string;
        body?: string;
        type?: string;
        link?: string;
      };

      const userSnap = await db().doc(`users/${uid}`).get();

      const userData = userSnap.exists ? userSnap.data() : undefined;
      const preferences = normalizeNotificationPreferences(
        userSnap.get("notificationPreferences")
      );

      if (!shouldSendPushForUser(userData, preferences, notif.type)) {
        return;
      }

      const allTokens = [
        ...new Set(
          ((userSnap.get("fcmTokens") || []) as unknown[]).filter(
            (token): token is string =>
              typeof token === "string" && token.trim().length > 0
          )
        ),
      ];

      /*
       * Android Capacitor 앱에서 발급된 토큰은
       * users/{uid}.nativeFcmTokens[] 에도 함께 저장됩니다.
       *
       * 이 목록을 기준으로 Web Push 토큰과
       * Android Native FCM 토큰을 구분합니다.
       */
      const nativeTokenSet = new Set(
        ((userSnap.get("nativeFcmTokens") || []) as unknown[]).filter(
          (token): token is string =>
            typeof token === "string" && token.trim().length > 0
        )
      );

      const category = notificationCategory(notif.type);
      const isMarketingCategory =
        category === "goldNews" || category === "benefits";

      let tokens: string[] = allTokens;

      if (isMarketingCategory) {
        const hasExplicitMarketingTarget =
          !!userData &&
          Object.prototype.hasOwnProperty.call(
            userData,
            "marketingFcmToken"
          );

        const marketingFcmToken =
          typeof userData?.marketingFcmToken === "string"
            ? userData.marketingFcmToken.trim()
            : "";

        if (marketingFcmToken) {
          /*
           * 금시세·뉴스·이벤트·혜택은
           * 사용자가 지정한 대표 수신 기기 1개로만 보냅니다.
           *
           * 이 토큰이 Android Native 토큰인지 Web Push 토큰인지는
           * 아래 nativeTokenSet으로 자동 판별합니다.
           */
          tokens = [marketingFcmToken];
        } else if (hasExplicitMarketingTarget) {
          /*
           * null/빈 값이 명시되어 있으면
           * 아직 대표 수신 기기가 없는 상태입니다.
           */
          tokens = [];
        } else {
          /*
           * 기존 회원 마이그레이션:
           *
           * marketingFcmToken 필드가 아직 없는 기존 회원은
           * fcmTokens 전체에 보내지 않고 마지막 토큰 1개만 임시 사용합니다.
           *
           * 따라서 기존 Chrome + 삼성인터넷 중복 푸시도 방지됩니다.
           */
          tokens = allTokens.length
            ? [allTokens[allTokens.length - 1]]
            : [];
        }
      }

      if (!tokens.length) return;

      const title = String(notif.title || "알림");
      const body = String(notif.body || "");
      const link = String(notif.link || "/");
      const notificationId = String(event.params.docId || "");

      const data = {
        type: String(notif.type || "notification"),
        title,
        body,
        link,
        notificationId,
      };

      /*
       * 같은 회원의 fcmTokens[] 안에는
       * Web Push와 Android Native Push가 함께 존재할 수 있습니다.
       *
       * Web:
       *   data-only 메시지를 보내고 public/sw.js가 알림을 표시합니다.
       *
       * Android Native:
       *   notification + data 메시지를 보내 Android 시스템이
       *   앱이 백그라운드인 상태에서도 시스템 알림을 표시할 수 있게 합니다.
       */
      const nativeTokens = tokens.filter((token) =>
        nativeTokenSet.has(token)
      );

      const webTokens = tokens.filter(
        (token) => !nativeTokenSet.has(token)
      );

      const badTokens = new Set<string>();

      const collectBadTokens = (
        response: BatchResponse,
        sentTokens: string[]
      ) => {
        response.responses.forEach((result: SendResponse, index: number) => {
          if (result.success) return;

          const code =
            (result.error as { code?: string } | undefined)?.code || "";

          if (
            code.includes("registration-token-not-registered") ||
            code.includes("messaging/registration-token-not-registered") ||
            code.includes("invalid-registration-token") ||
            code.includes("messaging/invalid-registration-token") ||
            code.includes("invalid-argument")
          ) {
            const failedToken = sentTokens[index];

            if (failedToken) {
              badTokens.add(failedToken);
            }
          }
        });
      };

      /*
       * Web / PWA
       */
      if (webTokens.length) {
        const webResponse: BatchResponse =
          await msg().sendEachForMulticast({
            tokens: webTokens,
            data,
            webpush: {
              headers: {
                Urgency: "high",
              },
            },
          });

        collectBadTokens(webResponse, webTokens);
      }

      /*
       * Android Native 앱
       */
      if (nativeTokens.length) {
        const nativeResponse: BatchResponse =
          await msg().sendEachForMulticast({
            tokens: nativeTokens,
            notification: {
              title,
              body,
            },
            data,
            android: {
              priority: "high",
              notification: {
                icon: "ic_stat_goldmarket",
              },
            },
          });

        collectBadTokens(nativeResponse, nativeTokens);
      }

      /*
       * 만료/무효 토큰 정리
       *
       * fcmTokens[]와 nativeFcmTokens[] 양쪽에서 제거합니다.
       */
      const bad = [...badTokens];

      if (bad.length) {
        const updates: FirebaseFirestore.DocumentData = {
          fcmTokens: FieldValue.arrayRemove(...bad),
          nativeFcmTokens: FieldValue.arrayRemove(...bad),
          pushDevices: removePushDevicesForTokens(
            userData?.pushDevices,
            bad
          ),
        };

        const currentMarketingFcmToken =
          typeof userData?.marketingFcmToken === "string"
            ? userData.marketingFcmToken.trim()
            : "";

        if (
          currentMarketingFcmToken &&
          bad.includes(currentMarketingFcmToken)
        ) {
          /*
           * 사용자가 선택한 대표 수신 기기 토큰 자체가 만료된 경우
           * 다른 브라우저나 앱으로 임의 전환하지 않습니다.
           */
          updates.marketingFcmToken = null;
          updates.marketingFcmBrowser = "";
          updates.marketingFcmTokenUpdatedAt =
            FieldValue.serverTimestamp();
        }

        await db()
          .doc(`users/${uid}`)
          .update(updates)
          .catch(() => {});
      }
    } catch (error) {
      console.error("[onNotificationCreate] error:", error);
    }
  }
);


/* ─────────────────────────────────────────────────────────────
 * 현재 기기 푸시 연결 시험
 * ───────────────────────────────────────────────────────────── */
export const sendPushTestNotification = onCall<{ token: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const token = String(req.data?.token || "").trim();

    if (token.length < 20 || token.length > 4_096) {
      throw new HttpsError(
        "invalid-argument",
        "현재 기기의 푸시 토큰 형식이 올바르지 않습니다."
      );
    }

    const userRef = db().doc(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요."
      );
    }

    const registeredTokens = [
      ...new Set(
        ((userSnap.get("fcmTokens") || []) as unknown[]).filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0
        )
      ),
    ];

    if (!registeredTokens.includes(token)) {
      throw new HttpsError(
        "failed-precondition",
        "현재 기기의 푸시 등록을 확인할 수 없습니다. 상태를 새로 확인한 뒤 다시 시도해 주세요.",
        { reason: "token-not-registered" }
      );
    }

    const nativeTokenSet = new Set(
      ((userSnap.get("nativeFcmTokens") || []) as unknown[]).filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0
      )
    );

    const isNativeToken = nativeTokenSet.has(token);

    // 실수로 버튼을 연속해서 눌러 푸시가 반복 발송되는 것을 막습니다.
    const rateLimitRef = db().doc(`pushTestRateLimits/${uid}`);

    await db().runTransaction(async (tx) => {
      const rateLimitSnap = await tx.get(rateLimitRef);

      const lastRequestedAt = rateLimitSnap.exists
        ? (rateLimitSnap.get("lastRequestedAt") as
            | { toMillis?: () => number }
            | undefined)
        : undefined;

      const lastRequestedAtMs =
        lastRequestedAt?.toMillis?.() || 0;

      if (Date.now() - lastRequestedAtMs < 20_000) {
        throw new HttpsError(
          "resource-exhausted",
          "시험 알림은 20초 후에 다시 보낼 수 있습니다."
        );
      }

      tx.set(
        rateLimitRef,
        {
          lastRequestedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    const requestedAt = new Date().toISOString();
    const title = "한국골드마켓 시험 알림";
    const body = "현재 기기의 알림 연결이 정상입니다.";
    const notificationId = `push-test-${Date.now()}`;

    const data = {
      type: "push_test",
      title,
      body,
      link: "/profile",
      notificationId,
    };

    try {
      /*
       * Android Native 토큰은 notification + data,
       * Web Push 토큰은 기존과 동일한 data-only 방식으로 발송합니다.
       */
      const messageId = isNativeToken
        ? await msg().send({
            token,
            notification: {
              title,
              body,
            },
            data,
            android: {
              priority: "high",
            },
          })
        : await msg().send({
            token,
            data,
            webpush: {
              headers: {
                Urgency: "high",
              },
            },
          });

      return {
        ok: true,
        acceptedAt: requestedAt,
        messageId,
        platform: isNativeToken ? "android-native" : "web",
      };
    } catch (error) {
      const code =
        (error as { code?: string } | undefined)?.code || "";

      const isExpiredToken =
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token") ||
        code.includes("invalid-argument");

      if (isExpiredToken) {
        const updates: FirebaseFirestore.DocumentData = {
          fcmTokens: FieldValue.arrayRemove(token),
          nativeFcmTokens: FieldValue.arrayRemove(token),
          pushDevices: removePushDevicesForTokens(
            userSnap.get("pushDevices"),
            [token]
          ),
        };

        const marketingFcmToken = String(
          userSnap.get("marketingFcmToken") || ""
        ).trim();

        if (marketingFcmToken === token) {
          updates.marketingFcmToken = null;
          updates.marketingFcmBrowser = "";
          updates.marketingFcmTokenUpdatedAt =
            FieldValue.serverTimestamp();
        }

        await userRef.update(updates).catch(() => {});

        throw new HttpsError(
          "failed-precondition",
          "이 기기의 푸시 토큰이 만료되었습니다. 상태를 새로 확인한 뒤 다시 시도해 주세요.",
          { reason: "token-expired" }
        );
      }

      console.error("[sendPushTestNotification] error", {
        uid,
        code,
        isNativeToken,
        error,
      });

      throw new HttpsError(
        "unavailable",
        "시험 알림 발송 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  }
);


/* ─────────────────────────────────────────────────────────────
 * 관리자 수동 알림 발송 / 이력 조회
 * ───────────────────────────────────────────────────────────── */

type AdminNotificationTarget =
  | "all"
  | "goldNews"
  | "reservationCustomers"
  | "specific";

type AdminNotificationCategory =
  | "goldNews"
  | "benefits"
  | "exchange"
  | "general";

function normalizeInternalNotificationLink(value: unknown): string {
  const link = String(value || "/").trim();

  if (
    !link.startsWith("/") ||
    link.startsWith("//") ||
    link.includes("\\") ||
    link.length > 200
  ) {
    throw new HttpsError(
      "invalid-argument",
      "알림 이동 주소는 사이트 내부 경로만 사용할 수 있습니다."
    );
  }

  return link;
}

function manualNotificationType(category: AdminNotificationCategory): string {
  if (category === "goldNews") return "gold_news_admin";
  if (category === "benefits") return "benefit_admin";
  if (category === "exchange") return "exchange_admin";
  return "admin_notice";
}

function preferenceAllowsCategory(
  userData: FirebaseFirestore.DocumentData | undefined,
  preferences: NotificationPreferences,
  category: AdminNotificationCategory
): boolean {
  if (category === "exchange") return true;
  if (category === "goldNews" || category === "benefits") {
    return marketingPushEnabled(userData, preferences);
  }
  return true;
}

async function resolveAdminNotificationRecipients(params: {
  targetType: AdminNotificationTarget;
  category: AdminNotificationCategory;
  specificUser?: string;
}): Promise<string[]> {
  const { targetType, category } = params;

  if (targetType === "specific") {
    const input = String(params.specificUser || "").trim();
    if (!input) {
      throw new HttpsError(
        "invalid-argument",
        "사용자 UID 또는 이메일을 입력해 주세요."
      );
    }

    let uid = input;

    if (input.includes("@")) {
      try {
        uid = (await getAuth().getUserByEmail(input.toLowerCase())).uid;
      } catch {
        throw new HttpsError(
          "not-found",
          "해당 이메일의 사용자를 찾을 수 없습니다."
        );
      }
    } else {
      try {
        await getAuth().getUser(uid);
      } catch {
        throw new HttpsError(
          "not-found",
          "해당 사용자를 찾을 수 없습니다."
        );
      }
    }

    const userDoc = await db().doc(`users/${uid}`).get();
    if (!userDoc.exists) {
      throw new HttpsError(
        "not-found",
        "해당 사용자의 회원 정보를 찾을 수 없습니다."
      );
    }

    const userData = userDoc.data();
    const preferences = normalizeNotificationPreferences(
      userDoc.get("notificationPreferences")
    );

    if (!preferenceAllowsCategory(userData, preferences, category)) {
      if (category === "goldNews" || category === "benefits") {
        throw new HttpsError(
          "failed-precondition",
          "해당 사용자는 광고성 정보 수신에 동의하지 않았거나 금시세·혜택 알림을 해제하여 발송할 수 없습니다."
        );
      }
      throw new HttpsError(
        "failed-precondition",
        "해당 사용자는 현재 이 알림을 받을 수 없습니다."
      );
    }

    return [uid];
  }

  if (targetType === "reservationCustomers") {
    const exchangeSnapshot = await db()
      .collection("goldExchanges")
      .select("userId")
      .get();

    const candidateUids = [
      ...new Set(
        exchangeSnapshot.docs
          .map((document) => String(document.get("userId") || "").trim())
          .filter(Boolean)
      ),
    ];

    if (!candidateUids.length) return [];

    const recipientUids: string[] = [];

    for (let start = 0; start < candidateUids.length; start += 200) {
      const chunk = candidateUids.slice(start, start + 200);
      const userDocs = await db().getAll(
        ...chunk.map((uid) => db().doc(`users/${uid}`))
      );

      userDocs.forEach((userDoc) => {
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const preferences = normalizeNotificationPreferences(
          userDoc.get("notificationPreferences")
        );

        if (preferenceAllowsCategory(userData, preferences, category)) {
          recipientUids.push(userDoc.id);
        }
      });
    }

    return recipientUids;
  }

  const usersSnapshot = await db().collection("users").get();
  const recipients: string[] = [];

  usersSnapshot.docs.forEach((document) => {
    const userData = document.data();
    const preferences = normalizeNotificationPreferences(
      document.get("notificationPreferences")
    );

    if (!preferenceAllowsCategory(userData, preferences, category)) return;

    // ‘광고성 정보 수신동의 회원’ 대상을 선택한 경우 카테고리와 별개로
    // 실제 광고성 정보 수신동의 + 마케팅 푸시 선호를 다시 확인합니다.
    if (targetType === "goldNews" && !marketingPushEnabled(userData, preferences)) return;

    recipients.push(document.id);
  });

  return recipients;
}

export const sendAdminNotification = onCall<{
  targetType: AdminNotificationTarget;
  category: AdminNotificationCategory;
  specificUser?: string;
  title: string;
  body: string;
  link?: string;
}>(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const actorUid = req.auth?.uid || "system";
    const targetType = String(
      req.data?.targetType || ""
    ) as AdminNotificationTarget;
    const category = String(
      req.data?.category || ""
    ) as AdminNotificationCategory;

    if (
      !["all", "goldNews", "reservationCustomers", "specific"].includes(
        targetType
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "알림 발송 대상을 확인해 주세요."
      );
    }

    if (
      !["goldNews", "benefits", "exchange", "general"].includes(category)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "알림 종류를 확인해 주세요."
      );
    }

    const title = normalizeRequiredString(
      req.data?.title,
      "알림 제목",
      80,
      1
    );
    const body = normalizeRequiredString(
      req.data?.body,
      "알림 내용",
      300,
      1
    );
    const link = normalizeInternalNotificationLink(req.data?.link || "/");

    const recipients = await resolveAdminNotificationRecipients({
      targetType,
      category,
      specificUser: req.data?.specificUser,
    });

    if (recipients.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        category === "goldNews" || category === "benefits"
          ? "광고성 정보 수신동의 기준으로 발송 가능한 사용자가 없습니다."
          : "현재 설정 기준으로 발송 가능한 사용자가 없습니다."
      );
    }

    if (recipients.length > 10_000) {
      throw new HttpsError(
        "resource-exhausted",
        "한 번에 발송 가능한 대상은 최대 10,000명입니다."
      );
    }

    const sendRef = db().collection("adminNotificationSends").doc();
    const batchId = sendRef.id;
    const type = manualNotificationType(category);

    await sendRef.set({
      batchId,
      targetType,
      category,
      title,
      body,
      link,
      recipientCount: recipients.length,
      createdCount: 0,
      actorUid,
      createdAt: FieldValue.serverTimestamp(),
      status: "creating",
    });

    let createdCount = 0;
    const chunkSize = 400;

    try {
      for (let start = 0; start < recipients.length; start += chunkSize) {
        const chunk = recipients.slice(start, start + chunkSize);
        const batch = db().batch();

        chunk.forEach((uid) => {
          const notificationRef = db()
            .collection("notifications")
            .doc(uid)
            .collection("items")
            .doc(`${batchId}_${uid}`);

          batch.set(notificationRef, {
            type,
            title,
            body,
            link,
            category,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            meta: {
              source: "admin_manual",
              batchId,
              actorUid,
            },
          });
        });

        await batch.commit();
        createdCount += chunk.length;

        await sendRef.set(
          {
            createdCount,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await sendRef.set(
        {
          createdCount,
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await db().collection("adminAuditLogs").add({
        action: "manual_notification_sent",
        actorUid,
        batchId,
        targetType,
        category,
        recipientCount: recipients.length,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        batchId,
        recipientCount: recipients.length,
        createdCount,
      };
    } catch (error) {
      await sendRef.set(
        {
          createdCount,
          status: "failed",
          failedAt: FieldValue.serverTimestamp(),
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 300)
              : "unknown",
        },
        { merge: true }
      );

      throw error;
    }
  }
);

export const listAdminNotificationSends = onCall<{ limit?: number }>(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);

    const limit = Math.max(
      1,
      Math.min(Math.trunc(Number(req.data?.limit) || 20), 50)
    );

    const snapshot = await db()
      .collection("adminNotificationSends")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return {
      ok: true,
      items: snapshot.docs.map((document) => {
        const data = document.data() || {};
        return {
          id: document.id,
          targetType: data.targetType || "",
          category: data.category || "",
          title: data.title || "",
          body: data.body || "",
          link: data.link || "/",
          recipientCount: Number(data.recipientCount || 0),
          createdCount: Number(data.createdCount || 0),
          status: data.status || "",
          createdAt:
            data.createdAt?.toDate?.()?.toISOString?.() || null,
        };
      }),
    };
  }
);


/* ─────────────────────────────────────────────────────────────
 * 7) 관리자 금교환 전날 예약 요약 알림
 * - 매일 17:00 (Asia/Seoul)
 * - 내일 scheduled 예약이 있을 때만 관리자에게 1회 요약 발송
 * - 날짜별 고정 알림 ID로 재실행/재시도 시 중복 푸시 방지
 * ───────────────────────────────────────────────────────────── */
export const sendAdminExchangeDayBeforeSummary = onSchedule(
  {
    schedule: "0 17 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    retryCount: 2,
  },
  async () => {
    const tomorrow = addDaysToDateKey(koreaDateKey(), 1);
    const groupsSnapshot = await db()
      .collection("goldExchangeGroups")
      .where("visitDate", "==", tomorrow)
      .get();

    const scheduledGroups = groupsSnapshot.docs
      .map((document) => {
        const data = document.data() || {};
        return {
          id: document.id,
          repStatus: String(data.repStatus || "requested"),
          visitTime: String(data.visitTime || ""),
        };
      })
      .filter((group) => group.repStatus === "scheduled")
      .sort((a, b) => a.visitTime.localeCompare(b.visitTime));

    if (scheduledGroups.length === 0) {
      console.log(
        `[sendAdminExchangeDayBeforeSummary] visitDate=${tomorrow} scheduled=0`
      );
      return;
    }

    const count = scheduledGroups.length;
    const notificationId = `admin-exchange-day-before-${tomorrow}`;
    const recipientCount = await addUniqueNotificationForAdmins(notificationId, {
      type: "admin_exchange_day_before_summary",
      title: `내일 금교환 예약 ${count}건`,
      body: `내일 방문 예정 금교환 예약이 ${count}건 있습니다.`,
      link: "/admin/gold-exchange",
      meta: {
        visitDate: tomorrow,
        reservationCount: count,
        reminderType: "admin_day_before_summary",
      },
    });

    console.log(
      `[sendAdminExchangeDayBeforeSummary] visitDate=${tomorrow} scheduled=${count} admins=${recipientCount}`
    );
  }
);

/* ─────────────────────────────────────────────────────────────
 * 8) 예약자 금교환 방문 전날 자동 알림
 * - 정상적으로는 매일 18:00에 발송
 * - 18~23시 정각 재확인으로 일시적 실패 시 다음 시간대에 재시도
 * - scheduled 상태만 발송
 * - 같은 그룹/같은 방문일은 한 번만 생성
 * ───────────────────────────────────────────────────────────── */
export const sendExchangeVisitDayBeforeReminders = onSchedule(
  { schedule: "0 18-23 * * *", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const tomorrow = addDaysToDateKey(koreaDateKey(), 1);
    const groupsSnapshot = await db()
      .collection("goldExchangeGroups")
      .where("visitDate", "==", tomorrow)
      .get();

    let createdCount = 0;

    for (const groupDocument of groupsSnapshot.docs) {
      const groupId = groupDocument.id;
      const groupRef = groupDocument.ref;

      const created = await db().runTransaction(async (tx) => {
        const freshGroup = await tx.get(groupRef);
        if (!freshGroup.exists) return false;

        const data = freshGroup.data() || {};
        const visitDate = String(data.visitDate || "");
        const visitTime = String(data.visitTime || "");
        const status = String(data.repStatus || "requested");
        const uid = String(data.ownerUid || "");
        const alreadySentFor = String(data.dayBeforeReminderSentFor || "");

        if (visitDate !== tomorrow || status !== "scheduled" || !uid || !visitTime) {
          return false;
        }
        if (alreadySentFor === tomorrow) return false;

        const notificationId = `exchange-day-before-${groupId}-${tomorrow}`;
        const notificationRef = db().doc(`notifications/${uid}/items/${notificationId}`);
        const notificationSnapshot = await tx.get(notificationRef);
        const now = FieldValue.serverTimestamp();

        if (!notificationSnapshot.exists) {
          tx.set(notificationRef, {
            type: "exchange_visit_reminder",
            title: "내일 금교환 예약 안내",
            body: `내일 ${visitTime} 원일귀금속 방문 예약이 예정되어 있습니다.`,
            link: "/my-exchanges",
            meta: {
              groupId,
              visitDate,
              visitTime,
              reminderType: "day_before",
            },
            createdAt: now,
            read: false,
          });
        }

        tx.set(
          groupRef,
          {
            dayBeforeReminderSentFor: tomorrow,
            dayBeforeReminderSentAt: now,
          },
          { merge: true }
        );

        return !notificationSnapshot.exists;
      });

      if (created) createdCount += 1;
    }

    console.log(
      `[sendExchangeVisitDayBeforeReminders] visitDate=${tomorrow} created=${createdCount}`
    );
  }
);

/* ─────────────────────────────────────────────────────────────
 * 8) 예약 슬롯 청소 (스케줄러)
 * ───────────────────────────────────────────────────────────── */
export const cleanReservedSlots = onSchedule(
  { schedule: "every 60 minutes", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const toYmdSeoul = (): string => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .reduce<Record<string, string>>((acc, p) => {
          acc[p.type] = p.value;
          return acc;
        }, {});
      return `${parts.year}-${parts.month}-${parts.day}`;
    };
    const today = toYmdSeoul();

    const ref = db().doc("appConfig/reservedSlots");
    const snap = await ref.get();
    const data = snap.exists
      ? ((snap.data() || {}) as Record<string, unknown>)
      : {};

    const updates: FirebaseFirestore.DocumentData = {};
    Object.keys(data).forEach((dateKey) => {
      if (dateKey < today)
        (updates as Record<string, FirebaseFirestore.FieldValue>)[dateKey] = FieldValue.delete();
    });
    if (Object.keys(updates).length) {
      await ref.set(updates, { merge: true });
    }

    // 예약 가능일 설정도 지난 날짜를 정리해 문서가 계속 커지지 않게 합니다.
    const availabilityRef = db().doc(BOOKING_AVAILABILITY_REF);
    const availabilitySnap = await availabilityRef.get();
    if (availabilitySnap.exists) {
      const availabilityData = availabilitySnap.data() || {};
      const rawDates = availabilityData.dates && typeof availabilityData.dates === "object" && !Array.isArray(availabilityData.dates)
        ? (availabilityData.dates as Record<string, unknown>)
        : {};
      const nextDates = Object.fromEntries(
        Object.entries(rawDates).filter(([dateKey]) => dateKey >= today)
      );
      if (Object.keys(nextDates).length !== Object.keys(rawDates).length) {
        await availabilityRef.set({
          dates: nextDates,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "system-cleanup",
        }, { merge: true });
      }
    }
  }
);

/* ─────────────────────────────────────────────────────────────
 * 9) 닉네임 유니크 인덱스 (콜러블)
 * ───────────────────────────────────────────────────────────── */
const normalizeNickname = (raw: string): { lower: string; original: string } => {
  const original = String(raw || "").trim();
  if (!/^[\p{Script=Hangul}A-Za-z0-9 _]{2,16}$/u.test(original)) {
    throw new HttpsError(
      "invalid-argument",
      "닉네임은 2~16자, 한글/영문/숫자/공백/밑줄만 사용할 수 있습니다."
    );
  }
  const lower = original.toLocaleLowerCase();
  return { lower, original };
};

/** 가입 화면용 닉네임 사용 가능 여부 확인
 * - 비로그인 사용자는 전체 중복 여부만 확인
 * - 가입 도중 재시도 중인 동일 UID가 이미 같은 닉네임을 선점했다면 사용 가능으로 처리
 */
export const checkNicknameAvailability = onCall<{ nickname: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const normalized = normalizeNickname(req.data?.nickname || "");
    const result = await checkNicknameAvailabilityForRequest(
      db(),
      req.auth?.uid,
      normalized
    );
    return { ok: true, ...result };
  }
);

/** 회원가입 직후 닉네임 최초 1회 선점
 * - nicknames/profiles/users를 하나의 트랜잭션으로 동기화
 * - 동일 UID + 동일 닉네임 재호출은 멱등 성공
 * - 동일 UID의 다른 닉네임 추가 선점은 거부
 */
export const claimNickname = onCall<{ nickname: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const normalized = normalizeNickname(req.data?.nickname || "");
    const result = await claimNicknameForUser(db(), uid, normalized);
    return { ok: true, ...result };
  }
);

/** 닉네임 변경
 * 현재 정책: 가입 시 최초 1회 설정 후 변경 불가.
 * 이미 배포된 callable 이름은 남겨 두되 직접 호출도 항상 거부합니다.
 */
export const changeNickname = onCall<{ newNickname: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    throw new HttpsError(
      "failed-precondition",
      "닉네임은 가입 시 최초 1회 설정되며 변경할 수 없습니다."
    );
  }
);

/** Firebase Auth 계정 삭제 후 고아 닉네임 자동 해제
 * Auth 자체가 삭제된 UID만 대상으로 nickname 관련 필드/인덱스만 제거합니다.
 * 다른 회원/예약/문의/보너스 데이터는 건드리지 않습니다.
 */
export const cleanupNicknameAfterAuthDelete = functionsV1
  .region("asia-northeast3")
  .auth.user()
  .onDelete(async (user) => {
    await releaseNicknameOwnershipForDeletedUid(db(), user.uid);
  });

/* ─────────────────────────────────────────────────────────────
 * 9) 계정 탈퇴
 * - 서버에서 최근 재인증(auth_time)을 다시 검증
 * - 활성 예약은 그룹/교환 문서/예약 슬롯을 그룹별 트랜잭션으로 함께 정리
 * - 보존이 필요한 거래/문의 기록은 식별정보만 제거
 * - 필수 Firestore/Storage 정리 실패 시 Auth 계정은 삭제하지 않음
 * - 모든 정리가 성공한 뒤 마지막 단계에서 Firebase Auth 계정 삭제
 * ───────────────────────────────────────────────────────────── */
async function deleteCollectionInBatches(
  colRef: FirebaseFirestore.CollectionReference,
  batchSize = 250
): Promise<number> {
  let deleted = 0;

  for (;;) {
    const snap = await colRef.orderBy("__name__").limit(batchSize).get();
    if (snap.empty) break;

    const batch = db().batch();
    snap.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();

    deleted += snap.size;
    if (snap.size < batchSize) break;
  }

  return deleted;
}

async function updateQueryInBatches(
  makeQuery: () => FirebaseFirestore.Query,
  buildUpdate: (
    document: FirebaseFirestore.QueryDocumentSnapshot
  ) => FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
  batchSize = 200
): Promise<number> {
  let updated = 0;

  for (;;) {
    const snap = await makeQuery().limit(batchSize).get();
    if (snap.empty) break;

    const batch = db().batch();
    snap.docs.forEach((document) => {
      batch.update(document.ref, buildUpdate(document));
    });
    await batch.commit();

    updated += snap.size;
    if (snap.size < batchSize) break;
  }

  return updated;
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const bucket = getStorage().bucket();
  let deleted = 0;
  let pageToken: string | undefined;

  do {
    const [files, , response] = await bucket.getFiles({
      prefix,
      autoPaginate: false,
      maxResults: 1000,
      pageToken,
    });

    for (let i = 0; i < files.length; i += 100) {
      const chunk = files.slice(i, i + 100);
      const settled = await Promise.allSettled(
        chunk.map((file) => file.delete({ ignoreNotFound: true }))
      );

      const failures = settled.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ fileName: chunk[index].name, error: result.reason }]
          : []
      );

      deleted += settled.filter((result) => result.status === "fulfilled").length;

      if (failures.length > 0) {
        console.error("[deleteMyAccount] storage delete failed", {
          prefix,
          failures,
        });
        throw new Error(`Storage 정리에 실패했습니다: ${prefix}`);
      }
    }

    const nextPageToken = (
      response as { nextPageToken?: unknown } | undefined
    )?.nextPageToken;
    pageToken =
      typeof nextPageToken === "string"
        ? nextPageToken
        : undefined;
  } while (pageToken);

  return deleted;
}

function isActiveExchangeStatus(status: unknown): boolean {
  return ACTIVE_EXCHANGE_STATUSES.has(String(status || "requested"));
}

export const deleteMyAccount = onCall<unknown>(
  {
    region: "asia-northeast3",
    timeoutSeconds: 540,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    // 반드시 어떤 데이터 변경보다 먼저 최근 재인증을 확인합니다.
    requireRecentAuthentication(
      (req.auth?.token || {}) as Record<string, unknown>
    );

    const startedAt = Date.now();
    const userRef = db().doc(`users/${uid}`);
    const profileRef = db().doc(`profiles/${uid}`);
    const slotsRef = db().doc("appConfig/reservedSlots");
    const exchanges = db().collection("goldExchanges");

    let exchangeUpdates = 0;
    let groupUpdates = 0;
    let supportUpdates = 0;
    let confirmationUpdates = 0;
    let reviewClaimUpdates = 0;
    let customerNotificationCopiesDeleted = 0;
    let notificationItemsDeleted = 0;
    let ledgerDeleted = 0;
    let promotionsDeleted = 0;
    let profilePhotosDeleted = 0;
    let legacyProfilesDeleted = 0;

    try {
      // 읽기만 먼저 수행합니다. auth_time 검사는 이미 끝난 상태입니다.
      const [profileSnap, exchangeSnap] = await Promise.all([
        profileRef.get(),
        exchanges.where("userId", "==", uid).get(),
      ]);

      const previousNicknameLower = profileSnap.exists
        ? String(profileSnap.get("nicknameLower") || "").trim()
        : "";
      const ownedGroupIds: string[] = [
        ...new Set<string>(
          exchangeSnap.docs.map((document) => {
            const row = document.data() || {};
            return String(row.groupId || document.id);
          })
        ),
      ];
      const anonymizedAt = FieldValue.serverTimestamp();

      await runRequiredDeletionStages(
        [
          {
            name: "exchangeGroups",
            run: async () => {
              for (const groupId of ownedGroupIds) {
                const result = await cleanupExchangeGroupForDeletion({
                  firestore: db(),
                  uid,
                  groupId,
                  exchanges,
                  slotsRef,
                  isActiveExchangeStatus,
                  setReservedTime,
                });
                exchangeUpdates += result.exchangeUpdates;
                groupUpdates += result.groupUpdates;
              }
              return { exchangeUpdates, groupUpdates };
            },
          },
          {
            name: "supportTickets",
            run: async () => {
              supportUpdates = await updateQueryInBatches(
                () => db().collection("supportTickets").where("authorId", "==", uid),
                () => ({
                  authorId: "",
                  authorNickname: "탈퇴한 사용자",
                  authorDeleted: true,
                  anonymizedAt,
                  updatedAt: anonymizedAt,
                })
              );
              return supportUpdates;
            },
          },
          {
            name: "exchangeConfirmations",
            run: async () => {
              confirmationUpdates = await updateQueryInBatches(
                () => db().collection("exchangeConfirmations").where("customerUid", "==", uid),
                () => ({
                  customerUid: "",
                  customerName: "탈퇴한 사용자",
                  name: "탈퇴한 사용자",
                  phone: "",
                  email: "",
                  address: "",
                  customerPhone: "",
                  customerEmail: "",
                  customerAddress: "",
                  customerDeleted: true,
                  anonymizedAt,
                  updatedAt: anonymizedAt,
                })
              );
              return confirmationUpdates;
            },
          },
          {
            name: "reviewClaims",
            run: async () => {
              reviewClaimUpdates = await updateQueryInBatches(
                () => db().collection("goldExchangeReviewClaims").where("ownerUid", "==", uid),
                () => ({
                  ownerUid: "",
                  ownerDeleted: true,
                  anonymizedAt,
                })
              );
              return reviewClaimUpdates;
            },
          },
          {
            name: "customerNotificationCopies",
            run: async () => {
              customerNotificationCopiesDeleted =
                await deleteCustomerNotificationCopies(db(), uid);
              return customerNotificationCopiesDeleted;
            },
          },
          {
            name: "bonusGoldRedemptionRequest",
            run: async () => {
              await db().doc(`bonusGoldRedemptionRequests/${uid}`).delete();
              return true;
            },
          },
          {
            name: "notificationItems",
            run: async () => {
              notificationItemsDeleted = await deleteCollectionInBatches(
                db().collection(`notifications/${uid}/items`)
              );
              return notificationItemsDeleted;
            },
          },
          {
            name: "ledger",
            run: async () => {
              ledgerDeleted = await deleteCollectionInBatches(
                db().collection(`users/${uid}/ledger`)
              );
              return ledgerDeleted;
            },
          },
          {
            name: "promotions",
            run: async () => {
              promotionsDeleted = await deleteCollectionInBatches(
                db().collection(`users/${uid}/promotions`)
              );
              return promotionsDeleted;
            },
          },
          {
            name: "notificationsParent",
            run: async () => {
              await db().doc(`notifications/${uid}`).delete();
              return true;
            },
          },
          {
            name: "pushTestRateLimit",
            run: async () => {
              await db().doc(`pushTestRateLimits/${uid}`).delete();
              return true;
            },
          },
          {
            name: "profileAndNickname",
            run: async () => {
              await db().runTransaction(async (tx) => {
                let nicknameRef: FirebaseFirestore.DocumentReference | null = null;
                let nicknameSnap: FirebaseFirestore.DocumentSnapshot | null = null;

                if (previousNicknameLower) {
                  nicknameRef = db().doc(`nicknames/${previousNicknameLower}`);
                  nicknameSnap = await tx.get(nicknameRef);
                }

                tx.set(
                  userRef,
                  {
                    displayName: "(탈퇴한 사용자)",
                    email: "",
                    phone: "",
                    profileImage: "",
                    photoURL: "",
                    fcmTokens: [],
                    nativeFcmTokens: [],
                    pushDevices: {},
                    marketingFcmToken: null,
                    marketingFcmBrowser: "",
                    marketingFcmTokenUpdatedAt: FieldValue.serverTimestamp(),
                    deleted: true,
                    deletedAt: anonymizedAt,
                    anonymizedAt,
                  } as FirebaseFirestore.DocumentData,
                  { merge: true }
                );

                tx.set(
                  profileRef,
                  {
                    displayName: "탈퇴한 사용자",
                    photoURL: "",
                    profileImage: "",
                    nickname: FieldValue.delete(),
                    nicknameLower: FieldValue.delete(),
                    nicknameUpdatedAt: FieldValue.delete(),
                    deleted: true,
                    deletedAt: anonymizedAt,
                  } as FirebaseFirestore.DocumentData,
                  { merge: true }
                );

                if (
                  nicknameRef &&
                  nicknameSnap?.exists &&
                  String(nicknameSnap.get("ownerUid") || "") === uid
                ) {
                  tx.delete(nicknameRef);
                }
              });
              return true;
            },
          },
          {
            name: "profilePhotosStorage",
            run: async () => {
              profilePhotosDeleted = await deleteStoragePrefix(`profilePhotos/${uid}/`);
              return profilePhotosDeleted;
            },
          },
          {
            name: "legacyProfilesStorage",
            run: async () => {
              legacyProfilesDeleted = await deleteStoragePrefix(`profiles/${uid}/`);
              return legacyProfilesDeleted;
            },
          },
        ],
        async () => {
          // 모든 필수 정리가 성공한 경우에만, 그리고 항상 마지막에 Auth 계정을 삭제합니다.
          await getAuth()
            .deleteUser(uid)
            .catch((error: { code?: string }) => {
              if (error?.code !== "auth/user-not-found") throw error;
            });
        }
      );

      console.info("[deleteMyAccount] completed", {
        uid,
        durationMs: Date.now() - startedAt,
        exchanges: exchangeUpdates,
        groups: groupUpdates,
        supportTickets: supportUpdates,
        confirmations: confirmationUpdates,
        reviewClaims: reviewClaimUpdates,
        customerNotificationCopiesDeleted,
        notificationItemsDeleted,
        ledgerDeleted,
        promotionsDeleted,
        profilePhotosDeleted,
        legacyProfilesDeleted,
      });

      return {
        ok: true,
        authDeleted: true,
        anonymizedExchanges: exchangeUpdates,
        anonymizedGroups: groupUpdates,
      };
    } catch (error) {
      console.error("[deleteMyAccount] failed", {
        uid,
        durationMs: Date.now() - startedAt,
        error,
      });

      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "계정 정리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  }
);

/* ─────────────────────────────────────────────────────────────
 * 완료된 금교환 후기 등록
 * - 교환 완료·본인 소유 여부를 서버에서 확인
 * - 거래당 1회, 공개 문서에는 회원 식별자를 저장하지 않음
 * ───────────────────────────────────────────────────────────── */
export const submitGoldExchangeReview = onCall<{
  exchangeId: string;
  rating: number;
  comment: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const exchangeId = String(req.data?.exchangeId || "").trim();
    const rating = Number(req.data?.rating);
    const comment = String(req.data?.comment || "").trim();

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(exchangeId)) {
      throw new HttpsError("invalid-argument", "교환 번호를 확인해 주세요.");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpsError("invalid-argument", "평점은 1점부터 5점까지 선택해 주세요.");
    }
    if (comment.length < 10 || comment.length > 500) {
      throw new HttpsError("invalid-argument", "후기는 10자 이상 500자 이하로 입력해 주세요.");
    }

    const exchanges = db().collection("goldExchanges");
    const groupedSnap = await exchanges.where("groupId", "==", exchangeId).limit(50).get();
    const exchangeDocs: FirebaseFirestore.DocumentSnapshot[] = [...groupedSnap.docs];

    if (exchangeDocs.length === 0) {
      const directSnap = await exchanges.doc(exchangeId).get();
      if (directSnap.exists) exchangeDocs.push(directSnap);
    }
    if (exchangeDocs.length === 0) {
      throw new HttpsError("not-found", "교환 내역을 찾을 수 없습니다.");
    }

    const ownedDocs = exchangeDocs.filter((item) => item.data()?.userId === uid);
    if (ownedDocs.length === 0) {
      throw new HttpsError("permission-denied", "본인의 교환 내역만 평가할 수 있습니다.");
    }

    const completedDoc = ownedDocs.find((item) => item.data()?.status === "completed");
    if (!completedDoc) {
      throw new HttpsError("failed-precondition", "교환 완료 처리된 건만 후기를 작성할 수 있습니다.");
    }

    const claimRef = db().doc(`goldExchangeReviewClaims/${exchangeId}`);
    const publicReviewRef = db().collection("verifiedGoldExchangeReviews").doc();

    await db().runTransaction(async (tx) => {
      const [claimSnap, completedSnap] = await Promise.all([
        tx.get(claimRef),
        tx.get(completedDoc.ref),
      ]);

      if (claimSnap.exists) {
        throw new HttpsError("already-exists", "이미 후기를 작성했습니다.");
      }

      const completedExchange = completedSnap.data() || {};
      if (
        completedExchange.userId !== uid ||
        completedExchange.status !== "completed"
      ) {
        throw new HttpsError("failed-precondition", "교환 완료 상태를 다시 확인해 주세요.");
      }

      const now = FieldValue.serverTimestamp();
      tx.create(publicReviewRef, {
        rating,
        comment,
        reviewerLabel: "교환 완료 고객",
        serviceType: "골드바 교환",
        verified: true,
        createdAt: now,
      });
      tx.create(claimRef, {
        ownerUid: uid,
        reviewId: publicReviewRef.id,
        createdAt: now,
      });

      for (const exchangeDoc of ownedDocs) {
        tx.set(
          exchangeDoc.ref,
          { reviewed: true, reviewedAt: now },
          { merge: true }
        );
      }
    });

    return { ok: true, reviewId: publicReviewRef.id };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 퀵퀴즈 0.01g 보너스 지급 (1인 1회)
 * 서버가 답안을 직접 채점하고, 수령 기록·잔액·원장을 한 트랜잭션으로 반영합니다.
 * ───────────────────────────────────────────────────────────── */
const QUIZ_BONUS_PROMO_ID = "gold_bonus_v1";
const QUIZ_BONUS_CREDIT_MG = 10;
const QUIZ_BONUS_CREDIT_G = QUIZ_BONUS_CREDIT_MG / 1000;
const WELCOME_BONUS_PROMO_ID = "welcome_gold_v1";
const WELCOME_BONUS_CREDIT_MG = 10;
const WELCOME_BONUS_CREDIT_G = WELCOME_BONUS_CREDIT_MG / 1000;
const MARKETING_PUSH_BONUS_PROMO_ID = "marketing_push_bonus_v1";
const MARKETING_PUSH_BONUS_CREDIT_MG = 10;
const MARKETING_PUSH_BONUS_CREDIT_G =
  MARKETING_PUSH_BONUS_CREDIT_MG / 1000;

type QuizBonusState = {
  ok: true;
  claimed: boolean;
  alreadyClaimed: boolean;
  claimedNow: boolean;
  creditedG: number;
  balanceG: number;
};

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function bonusBalanceMilliGrams(data: FirebaseFirestore.DocumentData | undefined): number {
  if (Number.isFinite(Number(data?.bonusGoldMilliGrams))) {
    return toNonNegativeInteger(data?.bonusGoldMilliGrams);
  }
  const legacyG = Number(data?.bonusGoldG || 0);
  return Number.isFinite(legacyG) && legacyG > 0 ? Math.round(legacyG * 1000) : 0;
}

function marketingPushBonusConfigured(
  data: FirebaseFirestore.DocumentData | undefined,
  expectedToken = ""
): boolean {
  if (!data) return false;

  const token = String(data.marketingFcmToken || "").trim();
  if (!token || token.length < 20) return false;
  if (expectedToken && token !== expectedToken) return false;

  const marketingAccepted =
    data?.consents?.marketing?.accepted === true;
  const preferences = normalizeNotificationPreferences(
    data.notificationPreferences
  );

  if (
    !marketingAccepted ||
    preferences.allEnabled === false ||
    preferences.goldNews === false
  ) {
    return false;
  }

  const fcmTokens = Array.isArray(data.fcmTokens)
    ? data.fcmTokens.map((value: unknown) => String(value || "").trim())
    : [];

  if (!fcmTokens.includes(token)) return false;

  const devices = readPushDevices(data.pushDevices);
  return Object.values(devices).some(
    (entry) => String(entry?.token || "").trim() === token
  );
}

async function resolveMarketingPushBonusState(
  uid: string,
  claimToken = ""
): Promise<QuizBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef
    .collection("promotions")
    .doc(MARKETING_PUSH_BONUS_PROMO_ID);
  const ledgerRef = userRef
    .collection("ledger")
    .doc(`marketing_${MARKETING_PUSH_BONUS_PROMO_ID}`);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
    ]);

    const userData = userSnap.data();
    const balanceMg = bonusBalanceMilliGrams(userData);

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(
          Number(
            promo.creditedG ||
              MARKETING_PUSH_BONUS_CREDIT_G
          ) * 1000
        )
      );

      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    if (!claimToken) {
      return {
        ok: true,
        claimed: false,
        alreadyClaimed: false,
        claimedNow: false,
        creditedG: 0,
        balanceG: balanceMg / 1000,
      };
    }

    if (!marketingPushBonusConfigured(userData, claimToken)) {
      throw new HttpsError(
        "failed-precondition",
        "금시세·혜택 알림 수신동의와 현재 기기의 푸시 등록을 먼저 완료해 주세요."
      );
    }

    const nextBalanceMg =
      balanceMg + MARKETING_PUSH_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();

    tx.set(
      userRef,
      {
        bonusGoldMilliGrams: nextBalanceMg,
        bonusGoldG: nextBalanceMg / 1000,
        bonusGoldUpdatedAt: now,
      },
      { merge: true }
    );

    tx.create(promoRef, {
      creditedMilliGrams: MARKETING_PUSH_BONUS_CREDIT_MG,
      creditedG: MARKETING_PUSH_BONUS_CREDIT_G,
      claimedAt: now,
      source: MARKETING_PUSH_BONUS_PROMO_ID,
      marketingFcmTokenHash: createHash("sha256")
        .update(claimToken)
        .digest("hex"),
      balanceApplied: true,
      balanceAppliedAt: now,
    });

    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: MARKETING_PUSH_BONUS_CREDIT_MG,
      amountG: MARKETING_PUSH_BONUS_CREDIT_G,
      source: MARKETING_PUSH_BONUS_PROMO_ID,
      createdAt: now,
    });

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: MARKETING_PUSH_BONUS_CREDIT_G,
      balanceG: nextBalanceMg / 1000,
    };
  });
}

type WelcomeBonusState = {
  ok: true;
  claimed: true;
  alreadyClaimed: boolean;
  claimedNow: boolean;
  creditedG: number;
  balanceG: number;
};

async function resolveWelcomeBonusState(uid: string): Promise<WelcomeBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(WELCOME_BONUS_PROMO_ID);
  const ledgerRef = userRef.collection("ledger").doc(`welcome_${WELCOME_BONUS_PROMO_ID}`);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap, ledgerSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
      tx.get(ledgerRef),
    ]);

    let balanceMg = bonusBalanceMilliGrams(userSnap.data());

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(Number(promo.creditedG || WELCOME_BONUS_CREDIT_G) * 1000)
      );

      if (!ledgerSnap.exists) {
        balanceMg += creditedMg;
        tx.set(userRef, {
          bonusGoldMilliGrams: balanceMg,
          bonusGoldG: balanceMg / 1000,
          bonusGoldUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(ledgerRef, {
          direction: "credit",
          amountMilliGrams: creditedMg,
          amountG: creditedMg / 1000,
          source: WELCOME_BONUS_PROMO_ID,
          createdAt: FieldValue.serverTimestamp(),
          migratedFromLegacyClaim: true,
        });
      }

      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    balanceMg += WELCOME_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();
    tx.set(userRef, {
      bonusGoldMilliGrams: balanceMg,
      bonusGoldG: balanceMg / 1000,
      bonusGoldUpdatedAt: now,
    }, { merge: true });
    tx.create(promoRef, {
      creditedMilliGrams: WELCOME_BONUS_CREDIT_MG,
      creditedG: WELCOME_BONUS_CREDIT_G,
      claimedAt: now,
      source: WELCOME_BONUS_PROMO_ID,
      balanceApplied: true,
      balanceAppliedAt: now,
    });
    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: WELCOME_BONUS_CREDIT_MG,
      amountG: WELCOME_BONUS_CREDIT_G,
      source: WELCOME_BONUS_PROMO_ID,
      createdAt: now,
    });

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: WELCOME_BONUS_CREDIT_G,
      balanceG: balanceMg / 1000,
    };
  });
}

async function getQuizBonusState(uid: string): Promise<QuizBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(QUIZ_BONUS_PROMO_ID);
  const [userSnap, promoSnap] = await Promise.all([userRef.get(), promoRef.get()]);

  const balanceMg = bonusBalanceMilliGrams(userSnap.data());

  if (!promoSnap.exists) {
    return {
      ok: true,
      claimed: false,
      alreadyClaimed: false,
      claimedNow: false,
      creditedG: 0,
      balanceG: balanceMg / 1000,
    };
  }

  const promo = promoSnap.data() || {};
  const creditedMg = toNonNegativeInteger(
    promo.creditedMilliGrams,
    Math.round(Number(promo.creditedG || QUIZ_BONUS_CREDIT_G) * 1000)
  );

  return {
    ok: true,
    claimed: true,
    alreadyClaimed: true,
    claimedNow: false,
    creditedG: creditedMg / 1000,
    balanceG: balanceMg / 1000,
  };
}

async function claimQuizBonusState(
  uid: string,
  claim: { score: number; attemptId: string }
): Promise<QuizBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(QUIZ_BONUS_PROMO_ID);
  const ledgerRef = userRef.collection("ledger").doc(`quiz_${QUIZ_BONUS_PROMO_ID}`);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
    ]);

    const balanceMg = bonusBalanceMilliGrams(userSnap.data());

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(Number(promo.creditedG || QUIZ_BONUS_CREDIT_G) * 1000)
      );

      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    const nextBalanceMg = balanceMg + QUIZ_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();

    tx.set(
      userRef,
      {
        bonusGoldMilliGrams: nextBalanceMg,
        bonusGoldG: nextBalanceMg / 1000,
        bonusGoldUpdatedAt: now,
      },
      { merge: true }
    );
    tx.create(promoRef, {
      creditedMilliGrams: QUIZ_BONUS_CREDIT_MG,
      creditedG: QUIZ_BONUS_CREDIT_G,
      score: claim.score,
      attemptId: claim.attemptId || null,
      claimedAt: now,
      source: QUIZ_BONUS_PROMO_ID,
      balanceApplied: true,
      balanceAppliedAt: now,
    });
    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: QUIZ_BONUS_CREDIT_MG,
      amountG: QUIZ_BONUS_CREDIT_G,
      source: QUIZ_BONUS_PROMO_ID,
      createdAt: now,
    });

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: QUIZ_BONUS_CREDIT_G,
      balanceG: nextBalanceMg / 1000,
    };
  });
}

export const welcomeClaimGoldBonus = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = await requireVerifiedUser(req.auth?.uid);

    const res = await resolveWelcomeBonusState(uid);
    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "welcome_bonus",
          title: "웰컴 순금 적립 완료",
          body: `회원가입 웰컴 순금 ${res.creditedG.toFixed(2)}g이 적립되었습니다. 골드바 교환 시 사용할 수 있습니다.`,
          link: "/profile",
          meta: { event: WELCOME_BONUS_PROMO_ID, creditedG: res.creditedG },
        });
      } catch (error) {
        console.error("[welcomeClaimGoldBonus] 지급 알림 생성 실패", error);
      }
    }
    return res;
  }
);

export const marketingPushClaimGoldBonus = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    const uid = await requireVerifiedUser(req.auth?.uid);

    // 이미 받은 계정은 알림 설정을 나중에 꺼도 회수하지 않습니다.
    const existing =
      await resolveMarketingPushBonusState(uid);
    if (existing.claimed) return existing;

    const userRef = db().doc(`users/${uid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const token = String(
      userData?.marketingFcmToken || ""
    ).trim();

    if (!marketingPushBonusConfigured(userData, token)) {
      throw new HttpsError(
        "failed-precondition",
        "금시세·혜택 알림 수신동의와 현재 기기의 푸시 등록을 먼저 완료해 주세요."
      );
    }

    // 임의 문자열을 토큰처럼 등록해서 보너스를 받는 것을 줄이기 위해
    // Firebase Messaging에 실제 등록 가능한 토큰인지 dry-run으로 확인합니다.
    try {
      await msg().send(
        {
          token,
          data: {
            event: "marketing_push_bonus_validation",
          },
        },
        true
      );
    } catch (error) {
      const code = String(
        (error as { code?: string })?.code || ""
      );
      console.warn(
        "[marketingPushClaimGoldBonus] token validation failed",
        { uid, code }
      );

      throw new HttpsError(
        "failed-precondition",
        "현재 기기의 알림 등록을 확인하지 못했습니다. 알림을 다시 허용한 뒤 시도해 주세요."
      );
    }

    // dry-run 뒤에도 트랜잭션 안에서 같은 토큰/동의 상태를 재확인합니다.
    const res =
      await resolveMarketingPushBonusState(uid, token);

    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "marketing_push_bonus",
          title: "금시세·혜택 알림 순금 적립",
          body: `금시세·혜택 알림 설정 혜택 순금 ${res.creditedG.toFixed(2)}g이 적립되었습니다. 골드바 교환 시 사용할 수 있습니다.`,
          link: "/profile",
          meta: {
            event: MARKETING_PUSH_BONUS_PROMO_ID,
            creditedG: res.creditedG,
          },
        });
      } catch (error) {
        console.error(
          "[marketingPushClaimGoldBonus] 지급 알림 생성 실패",
          error
        );
      }
    }

    return res;
  }
);

export const memberBonusGetStatus = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const userRef = db().doc(`users/${uid}`);
    const [userSnap, welcomeSnap, marketingSnap, quizSnap] =
      await Promise.all([
        userRef.get(),
        userRef
          .collection("promotions")
          .doc(WELCOME_BONUS_PROMO_ID)
          .get(),
        userRef
          .collection("promotions")
          .doc(MARKETING_PUSH_BONUS_PROMO_ID)
          .get(),
        userRef
          .collection("promotions")
          .doc(QUIZ_BONUS_PROMO_ID)
          .get(),
      ]);

    const creditG = (
      snap: FirebaseFirestore.DocumentSnapshot,
      fallbackG: number
    ): number => {
      if (!snap.exists) return 0;
      const data = snap.data() || {};
      const mg = toNonNegativeInteger(
        data.creditedMilliGrams,
        Math.round(
          Number(data.creditedG || fallbackG) * 1000
        )
      );
      return mg / 1000;
    };

    const welcomeG = creditG(
      welcomeSnap,
      WELCOME_BONUS_CREDIT_G
    );
    const marketingG = creditG(
      marketingSnap,
      MARKETING_PUSH_BONUS_CREDIT_G
    );
    const quizG = creditG(
      quizSnap,
      QUIZ_BONUS_CREDIT_G
    );

    return {
      ok: true,
      maxG: 0.03,
      earnedG: roundTo3(
        welcomeG + marketingG + quizG
      ),
      balanceG:
        bonusBalanceMilliGrams(userSnap.data()) / 1000,
      rewards: {
        welcome: {
          claimed: welcomeSnap.exists,
          creditedG: welcomeG,
        },
        marketingPush: {
          claimed: marketingSnap.exists,
          creditedG: marketingG,
        },
        quiz: {
          claimed: quizSnap.exists,
          creditedG: quizG,
        },
      },
    };
  }
);

export const quizGetGoldBonusStatus = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    return getQuizBonusState(uid);
  }
);

export const quizClaimGoldBonus = onCall<{
  answers: Record<string, number>;
  attemptId?: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = await requireVerifiedUser(req.auth?.uid);

    const answerKey: Record<string, number> = { q1: 0, q2: 0, q3: 1, q4: 0, q5: 0 };
    const answers = req.data?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      throw new HttpsError("invalid-argument", "퀴즈 답안이 필요합니다.");
    }
    const answerIds = Object.keys(answerKey);
    if (
      Object.keys(answers).length !== answerIds.length ||
      !answerIds.every((id) => Number.isInteger(Number(answers[id])))
    ) {
      throw new HttpsError("invalid-argument", "모든 퀴즈 답안을 제출해 주세요.");
    }
    const score = answerIds.reduce(
      (total, id) => total + (Number(answers[id]) === answerKey[id] ? 1 : 0),
      0
    );
    const attemptId =
      req.data?.attemptId ? String(req.data.attemptId).slice(0, 64) : "";

    if (score !== answerIds.length) {
      throw new HttpsError("failed-precondition", "아쉽지만 기준 점수 미달입니다.");
    }

    const res = await claimQuizBonusState(uid, { score, attemptId });

    // 이미 수령한 계정에는 중복 알림을 만들지 않습니다.
    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "promo_bonus",
          title: "퀵퀴즈 보너스 지급",
          body: `축하합니다! ${res.creditedG.toFixed(2)}g 보너스가 적립되었습니다.`,
          link: "/profile",
          meta: { event: QUIZ_BONUS_PROMO_ID, creditedG: res.creditedG, score },
        });
      } catch (error) {
        console.error("[quizClaimGoldBonus] 보너스 지급 알림 생성 실패", error);
      }
    }

    return res;
  }
);

/* ─────────────────────────────────────────────────────────────
 * 적립 순금 사용 신청·매장 확정·복구
 * 잔액은 mg 정수로 보관하며, 모든 차감과 복구를 서버 트랜잭션으로 처리합니다.
 * ───────────────────────────────────────────────────────────── */
type BonusUsageStatus = "requested" | "used" | "canceled" | "restored";

function cleanGroupId(value: unknown): string {
  return String(value || "").trim().slice(0, 128);
}

function cleanUsageCode(value: unknown): string {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

function requestCreatedMillis(value: unknown): number | null {
  if (value && typeof (value as FirebaseFirestore.Timestamp).toMillis === "function") {
    return (value as FirebaseFirestore.Timestamp).toMillis();
  }
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function publicBonusUsageRequest(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data?.status) return null;
  const amountMg = toNonNegativeInteger(data.amountMilliGrams);
  return {
    status: String(data.status) as BonusUsageStatus,
    amountG: amountMg / 1000,
    groupId: String(data.groupId || ""),
    requestCode: data.status === "requested" ? String(data.requestCode || "") : "",
    visitDate: String(data.visitDate || ""),
    visitTime: String(data.visitTime || ""),
    finalRecognizedG: Number(data.finalRecognizedG || 0),
    finalAppliedG: Number(data.finalAppliedG || 0),
    createdAtMillis: requestCreatedMillis(data.createdAt),
    usedAtMillis: requestCreatedMillis(data.usedAt),
    canceledAtMillis: requestCreatedMillis(data.canceledAt),
    restoredAtMillis: requestCreatedMillis(data.restoredAt),
  };
}

export const bonusGetGoldUsageState = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const userRef = db().doc(`users/${uid}`);
    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const groupsQuery = db().collection("goldExchangeGroups").where("ownerUid", "==", uid);
    const [userSnap, requestSnap, groupsSnap] = await Promise.all([
      userRef.get(),
      requestRef.get(),
      groupsQuery.get(),
    ]);

    const balanceMg = bonusBalanceMilliGrams(userSnap.data());
    const requestData = requestSnap.exists ? requestSnap.data() : undefined;
    const requestStatus = String(requestData?.status || "");
    const requestedMg = requestStatus === "requested"
      ? toNonNegativeInteger(requestData?.amountMilliGrams)
      : 0;

    const eligibleGroups = groupsSnap.docs
      .map((document) => {
        const data = document.data() || {};
        return {
          groupId: document.id,
          status: String(data.repStatus || "requested"),
          visitDate: String(data.visitDate || ""),
          visitTime: String(data.visitTime || ""),
          totalG: Number(data.totalG || 0),
        };
      })
      .filter((group) => !["completed", "canceled", "rejected"].includes(group.status))
      .sort((a, b) => `${a.visitDate} ${a.visitTime}`.localeCompare(`${b.visitDate} ${b.visitTime}`));

    return {
      ok: true,
      balanceG: balanceMg / 1000,
      spendableG: Math.max(0, balanceMg - requestedMg) / 1000,
      request: publicBonusUsageRequest(requestData),
      eligibleGroups,
    };
  }
);

export const bonusRequestGoldUsage = onCall<{ groupId: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = await requireVerifiedUser(req.auth?.uid);

    const groupId = cleanGroupId(req.data?.groupId);
    if (!groupId) {
      throw new HttpsError("invalid-argument", "적립 순금을 사용할 금교환 예약을 선택해 주세요.");
    }

    const userRef = db().doc(`users/${uid}`);
    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);

    const result = await db().runTransaction(async (tx) => {
      const [userSnap, requestSnap, groupSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(requestRef),
        tx.get(groupRef),
      ]);

      if (!groupSnap.exists || String(groupSnap.get("ownerUid") || "") !== uid) {
        throw new HttpsError("not-found", "본인의 금교환 예약을 찾을 수 없습니다.");
      }
      const groupStatus = String(groupSnap.get("repStatus") || "requested");
      if (["completed", "canceled", "rejected"].includes(groupStatus)) {
        throw new HttpsError("failed-precondition", "종료된 금교환 예약에는 사용할 수 없습니다.");
      }

      const existing = requestSnap.exists ? requestSnap.data() : undefined;
      if (existing?.status === "requested") {
        if (String(existing.groupId || "") !== groupId) {
          throw new HttpsError("failed-precondition", "이미 다른 예약에 사용 신청 중입니다.");
        }
        return {
          createdNow: false,
          balanceMg: bonusBalanceMilliGrams(userSnap.data()),
          request: publicBonusUsageRequest(existing),
        };
      }

      const balanceMg = bonusBalanceMilliGrams(userSnap.data());
      if (balanceMg <= 0) {
        throw new HttpsError("failed-precondition", "사용 가능한 적립 순금이 없습니다.");
      }

      const now = FieldValue.serverTimestamp();
      const requestCode = String(randomInt(100000, 1000000));
      const visitDate = String(groupSnap.get("visitDate") || "");
      const visitTime = String(groupSnap.get("visitTime") || "");
      const requestData = {
        uid,
        groupId,
        status: "requested" as BonusUsageStatus,
        amountMilliGrams: balanceMg,
        amountG: balanceMg / 1000,
        requestCode,
        visitDate,
        visitTime,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(requestRef, requestData);
      tx.set(groupRef, {
        bonusGoldUsageStatus: "requested",
        bonusGoldRequestUid: uid,
        bonusGoldRequestedMilliGrams: balanceMg,
        bonusGoldRequestedG: balanceMg / 1000,
        bonusGoldRequestedAt: now,
        updatedAt: now,
      }, { merge: true });

      return {
        createdNow: true,
        balanceMg,
        request: {
          status: "requested" as BonusUsageStatus,
          amountG: balanceMg / 1000,
          groupId,
          requestCode,
          visitDate,
          visitTime,
        },
      };
    });

    if (result.createdNow) {
      const amountG = result.balanceMg / 1000;
      await Promise.allSettled([
        addNotificationForUser(uid, {
          type: "bonus_gold_usage_requested",
          title: "적립 순금 사용 신청 완료",
          body: `${amountG.toFixed(2)}g 사용 신청을 매장에서 확인합니다. 6자리 확인 코드를 준비해 주세요.`,
          link: "/profile",
          meta: { groupId, amountG },
        }),
        addNotificationForAdmins({
          type: "admin_bonus_gold_usage_requested",
          title: "적립 순금 사용 신청",
          body: `${amountG.toFixed(2)}g 사용 확인이 필요한 금교환 예약입니다.`,
          link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
          meta: { groupId, customerUid: uid, amountG },
        }),
      ]);
    }

    return {
      ok: true,
      balanceG: result.balanceMg / 1000,
      spendableG: 0,
      request: result.request,
    };
  }
);

export const bonusCancelGoldUsage = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const result = await db().runTransaction(async (tx) => {
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) {
        throw new HttpsError("not-found", "적립 순금 사용 신청을 찾을 수 없습니다.");
      }
      const data = requestSnap.data() || {};
      if (data.status !== "requested") {
        throw new HttpsError("failed-precondition", "매장 확정 전 신청만 취소할 수 있습니다.");
      }

      const groupId = cleanGroupId(data.groupId);
      const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
      const groupSnap = await tx.get(groupRef);
      const now = FieldValue.serverTimestamp();
      tx.update(requestRef, { status: "canceled", canceledAt: now, updatedAt: now });
      if (groupSnap.exists && String(groupSnap.get("bonusGoldRequestUid") || "") === uid) {
        tx.set(groupRef, {
          bonusGoldUsageStatus: "canceled",
          bonusGoldCanceledAt: now,
          updatedAt: now,
        }, { merge: true });
      }
      return {
        groupId,
        amountG: toNonNegativeInteger(data.amountMilliGrams) / 1000,
      };
    });

    await Promise.allSettled([
      addNotificationForUser(uid, {
        type: "bonus_gold_usage_canceled",
        title: "적립 순금 사용 신청 취소",
        body: `${result.amountG.toFixed(2)}g이 다시 사용 가능한 상태입니다.`,
        link: "/profile",
        meta: { groupId: result.groupId, amountG: result.amountG },
      }),
      addNotificationForAdmins({
        type: "admin_bonus_gold_usage_canceled",
        title: "적립 순금 사용 신청 취소",
        body: "고객이 적립 순금 사용 신청을 취소했습니다.",
        link: `/admin/gold-exchange?groupId=${encodeURIComponent(result.groupId)}`,
        meta: { groupId: result.groupId, customerUid: uid },
      }),
    ]);

    return { ok: true, ...result };
  }
);

export const bonusAdminConfirmGoldUsage = onCall<{
  groupId: string;
  requestCode: string;
  finalRecognizedG: number;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    const adminUid = req.auth?.uid || "admin";
    const groupId = cleanGroupId(req.data?.groupId);
    const requestCode = cleanUsageCode(req.data?.requestCode);
    const finalRecognizedG = Number(req.data?.finalRecognizedG);

    if (!groupId || requestCode.length !== 6) {
      throw new HttpsError(
        "invalid-argument",
        "교환번호와 고객의 6자리 확인 코드가 필요합니다."
      );
    }
    if (
      !Number.isFinite(finalRecognizedG) ||
      finalRecognizedG <= 0 ||
      finalRecognizedG > 1_000_000
    ) {
      throw new HttpsError(
        "invalid-argument",
        "현장에서 확인한 인정 순금 중량을 입력해 주세요."
      );
    }

    const exchangeQuery = db()
      .collection("goldExchanges")
      .where("groupId", "==", groupId);
    let exchangeDocs: FirebaseFirestore.DocumentSnapshot[] =
      (await exchangeQuery.get()).docs;

    if (exchangeDocs.length === 0) {
      const single = await db().doc(`goldExchanges/${groupId}`).get();
      if (single.exists) exchangeDocs = [single];
    }
    if (exchangeDocs.length === 0) {
      throw new HttpsError("not-found", "금교환 예약을 찾을 수 없습니다.");
    }

    // 가장 최근에 저장된 기존 교환 계획을 기준으로 선택 규격과 수량을 유지합니다.
    const sourcePlanDocument = [...exchangeDocs]
      .filter((document) => {
        const value = document.get("barsPlan");
        return !!value && typeof value === "object" && !Array.isArray(value);
      })
      .sort((a, b) => {
        const aMillis =
          requestCreatedMillis(a.get("updatedAt")) ?? 0;
        const bMillis =
          requestCreatedMillis(b.get("updatedAt")) ?? 0;
        return bMillis - aMillis;
      })[0];

    const sourceBarsPlan = sourcePlanDocument?.get("barsPlan") ?? null;
    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);

    const result = await db().runTransaction(async (tx) => {
      const groupSnap = await tx.get(groupRef);
      if (!groupSnap.exists) {
        throw new HttpsError(
          "not-found",
          "금교환 예약 요약을 찾을 수 없습니다."
        );
      }

      const groupData = groupSnap.data() || {};
      const uid = String(
        groupData.bonusGoldRequestUid || groupData.ownerUid || ""
      );

      if (!uid || groupData.bonusGoldUsageStatus !== "requested") {
        throw new HttpsError(
          "failed-precondition",
          "확인 대기 중인 적립 순금 신청이 없습니다."
        );
      }

      const userRef = db().doc(`users/${uid}`);
      const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
      const ledgerRef = userRef.collection("ledger").doc(`redeem_${groupId}`);

      const [userSnap, requestSnap, ledgerSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(requestRef),
        tx.get(ledgerRef),
      ]);

      const requestData = requestSnap.exists ? requestSnap.data() || {} : {};

      if (
        requestData.status === "used" &&
        String(requestData.groupId || "") === groupId
      ) {
        return {
          alreadyUsed: true,
          uid,
          amountG: Number(requestData.amountG || 0),
          finalRecognizedG: Number(requestData.finalRecognizedG || 0),
          finalAppliedG: Number(requestData.finalAppliedG || 0),
          barsPlan:
            requestData.finalBarsPlan &&
            typeof requestData.finalBarsPlan === "object"
              ? requestData.finalBarsPlan
              : groupData.barsPlan || null,
        };
      }

      if (
        requestData.status !== "requested" ||
        String(requestData.groupId || "") !== groupId ||
        cleanUsageCode(requestData.requestCode) !== requestCode
      ) {
        throw new HttpsError(
          "failed-precondition",
          "고객의 6자리 확인 코드가 일치하지 않습니다."
        );
      }

      if (ledgerSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "이미 차감 처리된 적립 순금입니다."
        );
      }

      const amountMg = toNonNegativeInteger(
        requestData.amountMilliGrams
      );
      const balanceMg = bonusBalanceMilliGrams(userSnap.data());

      if (amountMg <= 0 || balanceMg < amountMg) {
        throw new HttpsError(
          "failed-precondition",
          "고객의 적립 순금 잔액을 다시 확인해 주세요."
        );
      }

      const nextBalanceMg = balanceMg - amountMg;
      const amountG = amountMg / 1000;
      const recognizedG = roundTo3(finalRecognizedG);
      const finalAppliedG = roundTo3(recognizedG + amountG);

      // 기존에 고객이 선택한 골드바 규격과 수량을 유지한 채
      // 최종 적용 중량을 기준으로 잔여 중량과 자동 조합을 다시 계산합니다.
      const finalBarsPlan =
        sourceBarsPlan != null
          ? buildValidatedBarsPlan(sourceBarsPlan, finalAppliedG)
          : null;

      const now = FieldValue.serverTimestamp();

      tx.set(
        userRef,
        {
          bonusGoldMilliGrams: nextBalanceMg,
          bonusGoldG: nextBalanceMg / 1000,
          bonusGoldUpdatedAt: now,
        },
        { merge: true }
      );

      tx.update(requestRef, {
        status: "used",
        finalRecognizedG: recognizedG,
        finalAppliedG,
        finalBarsPlan,
        usedAt: now,
        usedBy: adminUid,
        updatedAt: now,
      });

      tx.create(ledgerRef, {
        direction: "debit",
        amountMilliGrams: amountMg,
        amountG,
        source: "gold_exchange_redemption",
        groupId,
        finalRecognizedG: recognizedG,
        finalAppliedG,
        finalBarsPlan,
        createdAt: now,
        createdBy: adminUid,
      });

      tx.set(
        groupRef,
        {
          bonusGoldUsageStatus: "used",
          bonusGoldUsedMilliGrams: amountMg,
          bonusGoldUsedG: amountG,
          bonusGoldUsedAt: now,
          bonusGoldUsedBy: adminUid,
          finalRecognizedG: recognizedG,
          finalAppliedG,
          ...(finalBarsPlan ? { barsPlan: finalBarsPlan } : {}),
          updatedAt: now,
        },
        { merge: true }
      );

      exchangeDocs.forEach((document) => {
        tx.set(
          document.ref,
          {
            bonusGoldUsageStatus: "used",
            bonusGoldUsedMilliGrams: amountMg,
            bonusGoldUsedG: amountG,
            bonusGoldUsedAt: now,
            bonusGoldUsedBy: adminUid,
            finalRecognizedG: recognizedG,
            finalAppliedG,
            ...(finalBarsPlan ? { barsPlan: finalBarsPlan } : {}),
            updatedAt: now,
          },
          { merge: true }
        );
      });

      return {
        alreadyUsed: false,
        uid,
        amountG,
        finalRecognizedG: recognizedG,
        finalAppliedG,
        barsPlan: finalBarsPlan,
      };
    });

    if (!result.alreadyUsed) {
      await addNotificationForUser(result.uid, {
        type: "bonus_gold_usage_completed",
        title: "적립 순금 사용 완료",
        body:
          `적립 순금 ${result.amountG.toFixed(2)}g을 적용해 ` +
          `최종 ${result.finalAppliedG.toFixed(3)}g으로 확인했습니다.`,
        link: "/my-exchanges",
        meta: {
          groupId,
          amountG: result.amountG,
          finalAppliedG: result.finalAppliedG,
        },
      });
    }

    return { ok: true, groupId, ...result };
  }
);

export const bonusAdminCancelGoldUsage = onCall<{ groupId: string; reason?: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    const groupId = cleanGroupId(req.data?.groupId);
    const reason = String(req.data?.reason || "매장 확인 중 신청 취소").trim().slice(0, 200);
    if (!groupId) throw new HttpsError("invalid-argument", "교환번호가 필요합니다.");

    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
    const result = await db().runTransaction(async (tx) => {
      const groupSnap = await tx.get(groupRef);
      if (!groupSnap.exists || groupSnap.get("bonusGoldUsageStatus") !== "requested") {
        throw new HttpsError("failed-precondition", "취소할 적립 순금 사용 신청이 없습니다.");
      }
      const uid = String(groupSnap.get("bonusGoldRequestUid") || "");
      const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists || requestSnap.get("status") !== "requested") {
        throw new HttpsError("failed-precondition", "고객의 사용 신청 상태를 다시 확인해 주세요.");
      }
      const amountG = toNonNegativeInteger(requestSnap.get("amountMilliGrams")) / 1000;
      const now = FieldValue.serverTimestamp();
      tx.update(requestRef, { status: "canceled", reason, canceledAt: now, updatedAt: now });
      tx.set(groupRef, {
        bonusGoldUsageStatus: "canceled",
        bonusGoldCanceledAt: now,
        bonusGoldCanceledBy: req.auth?.uid || "admin",
        bonusGoldCancelReason: reason,
        updatedAt: now,
      }, { merge: true });
      return { uid, amountG };
    });

    await addNotificationForUser(result.uid, {
      type: "bonus_gold_usage_canceled",
      title: "적립 순금 사용 신청 취소",
      body: `${result.amountG.toFixed(2)}g 사용 신청이 취소되어 다시 사용할 수 있습니다.`,
      link: "/profile",
      meta: { groupId, amountG: result.amountG, reason },
    });
    return { ok: true, groupId, ...result };
  }
);

async function reconcileBonusUsageForGroup(args: {
  groupId: string;
  targetStatus: string;
  adminUid: string;
}): Promise<void> {
  const { groupId, targetStatus, adminUid } = args;
  const groupRef = db().doc(`goldExchangeGroups/${groupId}`);

  const exchangeQuery = db()
    .collection("goldExchanges")
    .where("groupId", "==", groupId);
  let exchangeDocs: FirebaseFirestore.DocumentSnapshot[] =
    (await exchangeQuery.get()).docs;

  if (exchangeDocs.length === 0) {
    const single = await db().doc(`goldExchanges/${groupId}`).get();
    if (single.exists) exchangeDocs = [single];
  }

  const sourcePlanDocument = [...exchangeDocs]
    .filter((document) => {
      const value = document.get("barsPlan");
      return !!value && typeof value === "object" && !Array.isArray(value);
    })
    .sort((a, b) => {
      const aMillis =
        requestCreatedMillis(a.get("updatedAt")) ?? 0;
      const bMillis =
        requestCreatedMillis(b.get("updatedAt")) ?? 0;
      return bMillis - aMillis;
    })[0];

  const sourceBarsPlan = sourcePlanDocument?.get("barsPlan") ?? null;

  const result = await db().runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) return null;

    const groupData = groupSnap.data() || {};
    const usageStatus = String(groupData.bonusGoldUsageStatus || "");
    const uid = String(
      groupData.bonusGoldRequestUid || groupData.ownerUid || ""
    );

    if (!uid || !["requested", "used"].includes(usageStatus)) {
      return null;
    }

    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const requestSnap = await tx.get(requestRef);
    const requestData = requestSnap.exists
      ? requestSnap.data() || {}
      : {};
    const now = FieldValue.serverTimestamp();

    if (usageStatus === "requested") {
      if (!["canceled", "rejected"].includes(targetStatus)) {
        return null;
      }

      if (
        requestData.status === "requested" &&
        String(requestData.groupId || "") === groupId
      ) {
        tx.update(requestRef, {
          status: "canceled",
          reason: `exchange_${targetStatus}`,
          canceledAt: now,
          updatedAt: now,
        });
      }

      tx.set(
        groupRef,
        {
          bonusGoldUsageStatus: "canceled",
          bonusGoldCanceledAt: now,
          bonusGoldCanceledBy: adminUid,
          updatedAt: now,
        },
        { merge: true }
      );

      exchangeDocs.forEach((document) => {
        tx.set(
          document.ref,
          {
            bonusGoldUsageStatus: "canceled",
            bonusGoldCanceledAt: now,
            bonusGoldCanceledBy: adminUid,
            updatedAt: now,
          },
          { merge: true }
        );
      });

      return {
        uid,
        amountG:
          toNonNegativeInteger(
            groupData.bonusGoldRequestedMilliGrams
          ) / 1000,
        restored: false,
      };
    }

    const amountMg = toNonNegativeInteger(
      groupData.bonusGoldUsedMilliGrams
    );
    if (amountMg <= 0) return null;

    const userRef = db().doc(`users/${uid}`);
    const restoreLedgerRef = userRef
      .collection("ledger")
      .doc(`restore_${groupId}`);

    const [userSnap, restoreLedgerSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(restoreLedgerRef),
    ]);

    if (restoreLedgerSnap.exists) return null;

    const recognizedG = roundTo3(
      Number(
        groupData.finalRecognizedG ??
          requestData.finalRecognizedG ??
          0
      )
    );

    // 적립 순금 복구 시에는 현장 인정 중량만을 기준으로
    // 골드바 계획과 잔여 중량을 원상 복구합니다.
    const restoredBarsPlan =
      sourceBarsPlan != null && recognizedG > 0
        ? buildValidatedBarsPlan(sourceBarsPlan, recognizedG)
        : null;

    const nextBalanceMg =
      bonusBalanceMilliGrams(userSnap.data()) + amountMg;

    tx.set(
      userRef,
      {
        bonusGoldMilliGrams: nextBalanceMg,
        bonusGoldG: nextBalanceMg / 1000,
        bonusGoldUpdatedAt: now,
      },
      { merge: true }
    );

    if (
      requestSnap.exists &&
      String(requestData.groupId || "") === groupId
    ) {
      tx.update(requestRef, {
        status: "restored",
        restoredAt: now,
        restoredBy: adminUid,
        restoreReason: `exchange_${targetStatus}`,
        finalAppliedG: recognizedG,
        ...(restoredBarsPlan
          ? { finalBarsPlan: restoredBarsPlan }
          : {}),
        updatedAt: now,
      });
    }

    tx.create(restoreLedgerRef, {
      direction: "credit",
      amountMilliGrams: amountMg,
      amountG: amountMg / 1000,
      source: "gold_exchange_redemption_restore",
      groupId,
      reason: `exchange_${targetStatus}`,
      finalRecognizedG: recognizedG,
      finalAppliedG: recognizedG,
      ...(restoredBarsPlan ? { barsPlan: restoredBarsPlan } : {}),
      createdAt: now,
      createdBy: adminUid,
    });

    tx.set(
      groupRef,
      {
        bonusGoldUsageStatus: "restored",
        bonusGoldRestoredAt: now,
        bonusGoldRestoredBy: adminUid,
        finalAppliedG: recognizedG,
        ...(restoredBarsPlan ? { barsPlan: restoredBarsPlan } : {}),
        updatedAt: now,
      },
      { merge: true }
    );

    exchangeDocs.forEach((document) => {
      tx.set(
        document.ref,
        {
          bonusGoldUsageStatus: "restored",
          bonusGoldRestoredAt: now,
          bonusGoldRestoredBy: adminUid,
          finalAppliedG: recognizedG,
          ...(restoredBarsPlan ? { barsPlan: restoredBarsPlan } : {}),
          updatedAt: now,
        },
        { merge: true }
      );
    });

    return {
      uid,
      amountG: amountMg / 1000,
      restored: true,
    };
  });

  if (!result) return;

  await addNotificationForUser(result.uid, {
    type: result.restored
      ? "bonus_gold_usage_restored"
      : "bonus_gold_usage_canceled",
    title: result.restored
      ? "적립 순금이 복구되었습니다"
      : "적립 순금 사용 신청 취소",
    body: result.restored
      ? `교환 상태 변경으로 ${result.amountG.toFixed(2)}g이 다시 적립되었습니다.`
      : `${result.amountG.toFixed(2)}g 사용 신청이 취소되었습니다.`,
    link: "/profile",
    meta: {
      groupId,
      amountG: result.amountG,
      targetStatus,
    },
  });
}

export {
  auditGoldExchangeChanges,
  auditBonusGoldChanges,
} from "./audit.js";

/* ─────────────────────────────────────────────────────────────
 * KRX 금시세 수집/관리
 * 주의: 아래 금시세 가격 기능은 appConfig/goldRates 및 DEFAULT_PURITY와
 * 완전히 분리되어 있으며 금교환 중량 계산에 영향을 주지 않습니다.
 * ───────────────────────────────────────────────────────────── */
const DATA_GO_KR_SERVICE_KEY = defineSecret("DATA_GO_KR_SERVICE_KEY");
const GOLD_PRICE_SETTINGS_REF = "goldPriceSettings/current";
const GOLD_PRICE_PENDING_REF = "goldPrices/pending";
const GOLD_PRICE_KRX_HISTORY = "goldPriceKrxHistory";
const GOLD_PRICE_API_URL =
  "https://apis.data.go.kr/1160100/service/GetGeneralProductInfoService/getGoldPriceInfo";

type GoldPriceRule = {
  rate: number;
  adjustmentPerDon: number;
};

type GoldPriceSettings = {
  enabled: boolean;
  publishMode: "approval" | "auto";
  roundingUnit: number;
  pureGoldBuy: GoldPriceRule;
  pureGoldSell: GoldPriceRule;
  gold18kBuy: GoldPriceRule;
  gold14kBuy: GoldPriceRule;
};

const DEFAULT_GOLD_PRICE_SETTINGS: GoldPriceSettings = {
  enabled: false,
  publishMode: "approval",
  roundingUnit: 1000,
  pureGoldBuy: { rate: 1, adjustmentPerDon: 0 },
  pureGoldSell: { rate: 1, adjustmentPerDon: 0 },
  gold18kBuy: { rate: 0.75, adjustmentPerDon: 0 },
  gold14kBuy: { rate: 0.585, adjustmentPerDon: 0 },
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGoldPriceRule(value: unknown, fallback: GoldPriceRule): GoldPriceRule {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rate = toFiniteNumber(raw.rate, fallback.rate);
  const adjustmentPerDon = toFiniteNumber(
    raw.adjustmentPerDon,
    fallback.adjustmentPerDon
  );
  if (rate < 0 || rate > 3) {
    throw new HttpsError("invalid-argument", "가격 적용비율은 0~3 사이여야 합니다.");
  }
  if (Math.abs(adjustmentPerDon) > 10_000_000) {
    throw new HttpsError("invalid-argument", "가감액 범위를 확인해 주세요.");
  }
  return { rate, adjustmentPerDon: Math.round(adjustmentPerDon) };
}

function normalizeGoldPriceSettings(value: unknown): GoldPriceSettings {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const roundingUnit = Math.round(
    toFiniteNumber(raw.roundingUnit, DEFAULT_GOLD_PRICE_SETTINGS.roundingUnit)
  );
  if (![1, 10, 100, 1000, 10000].includes(roundingUnit)) {
    throw new HttpsError(
      "invalid-argument",
      "가격 처리 단위는 1, 10, 100, 1,000, 10,000원 중에서 선택해 주세요."
    );
  }
  const publishMode = raw.publishMode === "auto" ? "auto" : "approval";
  return {
    enabled: raw.enabled === true,
    publishMode,
    roundingUnit,
    pureGoldBuy: normalizeGoldPriceRule(raw.pureGoldBuy, DEFAULT_GOLD_PRICE_SETTINGS.pureGoldBuy),
    pureGoldSell: normalizeGoldPriceRule(raw.pureGoldSell, DEFAULT_GOLD_PRICE_SETTINGS.pureGoldSell),
    gold18kBuy: normalizeGoldPriceRule(raw.gold18kBuy, DEFAULT_GOLD_PRICE_SETTINGS.gold18kBuy),
    gold14kBuy: normalizeGoldPriceRule(raw.gold14kBuy, DEFAULT_GOLD_PRICE_SETTINGS.gold14kBuy),
  };
}

function roundPrice(value: number, unit: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value / unit) * unit;
}

function ymdInSeoul(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}`;
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return ymdInSeoul(date);
}

type UnknownRecord = Record<string, unknown>;

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asUnknownRecord(value: unknown): UnknownRecord {
  return isUnknownRecord(value) ? value : {};
}

function apiItems(payload: unknown): Array<UnknownRecord> {
  const root = asUnknownRecord(payload);
  const response = asUnknownRecord(root.response);
  const body = asUnknownRecord(response.body);
  const itemsContainer = asUnknownRecord(body.items);
  const items = itemsContainer.item;

  if (Array.isArray(items)) return items.filter(isUnknownRecord);
  if (isUnknownRecord(items)) return [items];
  return [];
}

function normalizePublicDataServiceKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (!trimmed) return "";

  // 공공데이터포털의 Encoding 인증키를 Secret에 저장한 경우
  // URLSearchParams가 %를 다시 인코딩하지 않도록 한 번 디코딩합니다.
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

async function fetchLatestKrxGoldPrice(rawServiceKey: string) {
  const serviceKey = normalizePublicDataServiceKey(rawServiceKey);
  let lastReason = "조회 가능한 금시세가 없습니다.";

  for (let daysAgo = 0; daysAgo <= 10; daysAgo += 1) {
    const basDt = dateDaysAgo(daysAgo);
    const url = new URL(GOLD_PRICE_API_URL);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "20");
    url.searchParams.set("resultType", "json");
    url.searchParams.set("basDt", basDt);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      const responseText = await response.text();

      if (!response.ok) {
        lastReason = `공공데이터 API HTTP ${response.status}`;
        console.warn("[fetchLatestKrxGoldPrice] HTTP error", {
          basDt,
          status: response.status,
          bodyPreview: responseText.slice(0, 300),
        });
        continue;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(responseText) as unknown;
      } catch {
        lastReason = "공공데이터 API가 JSON이 아닌 응답을 반환했습니다.";
        console.warn("[fetchLatestKrxGoldPrice] non-JSON response", {
          basDt,
          bodyPreview: responseText.slice(0, 500),
        });
        continue;
      }

      const root = asUnknownRecord(payload);
      const responseRoot = asUnknownRecord(root.response);
      const header = asUnknownRecord(responseRoot.header);
      const resultCode = String(header.resultCode ?? "");
      const resultMessage = String(header.resultMsg ?? "");

      if (resultCode && resultCode !== "00") {
        lastReason = resultMessage || `공공데이터 API 오류 코드 ${resultCode}`;
        console.warn("[fetchLatestKrxGoldPrice] API error", {
          basDt,
          resultCode,
          resultMessage,
        });
        continue;
      }

      const items = apiItems(payload);
      const item = items.find((row) => {
        const name = String(row.itmsNm || "").replace(/\s/g, "").toLowerCase();
        return name.includes("금99.99_1kg") || name.includes("금99.99_1㎏");
      });

      if (!item) {
        lastReason = `${basDt} 기준 금 99.99_1kg 데이터가 없습니다.`;
        continue;
      }

      const pricePerGram = toFiniteNumber(item.clpr, 0);
      if (pricePerGram <= 0) {
        lastReason = "KRX 종가가 올바르지 않습니다.";
        continue;
      }

      return {
        sourceDate: String(item.basDt || basDt),
        itemName: String(item.itmsNm || "금 99.99_1kg"),
        shortCode: String(item.srtnCd || ""),
        isinCode: String(item.isinCd || ""),
        pricePerGram: Math.round(pricePerGram),
        pricePerDon: Math.round(pricePerGram * DON_TO_GRAMS),
        marketOpen: toFiniteNumber(item.mkp, 0),
        marketHigh: toFiniteNumber(item.hipr, 0),
        marketLow: toFiniteNumber(item.lopr, 0),
        change: toFiniteNumber(item.vs, 0),
        changeRate: toFiniteNumber(item.fltRt, 0),
        volume: toFiniteNumber(item.trqu, 0),
        tradingValue: toFiniteNumber(item.trPrc, 0),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastReason = `공공데이터 API 호출 실패: ${message}`;
      console.error("[fetchLatestKrxGoldPrice] request failed", {
        basDt,
        message,
      });
    }
  }

  throw new Error(lastReason);
}

function calculateMarketPrices(
  krxPerDon: number,
  settings: GoldPriceSettings
) {
  const calc = (rule: GoldPriceRule) => roundPrice(
    krxPerDon * rule.rate + rule.adjustmentPerDon,
    settings.roundingUnit
  );
  return {
    pureGoldBuyPerDon: calc(settings.pureGoldBuy),
    pureGoldSellPerDon: calc(settings.pureGoldSell),
    gold18kBuyPerDon: calc(settings.gold18kBuy),
    gold14kBuyPerDon: calc(settings.gold14kBuy),
  };
}

async function loadGoldPriceSettings(): Promise<GoldPriceSettings> {
  const snap = await db().doc(GOLD_PRICE_SETTINGS_REF).get();
  if (!snap.exists) return DEFAULT_GOLD_PRICE_SETTINGS;
  return normalizeGoldPriceSettings(snap.data());
}

async function syncGoldPriceFromKrx(trigger: "schedule" | "manual") {
  const serviceKey = DATA_GO_KR_SERVICE_KEY.value().trim();
  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY Secret이 설정되지 않았습니다.");

  const [krx, settings] = await Promise.all([
    fetchLatestKrxGoldPrice(serviceKey),
    loadGoldPriceSettings(),
  ]);
  const market = calculateMarketPrices(krx.pricePerDon, settings);
  const now = FieldValue.serverTimestamp();
  const payload = {
    source: "KRX_PUBLIC_DATA",
    sourceLabel: "금융위원회 일반상품시세정보",
    sourceDate: krx.sourceDate,
    trigger,
    krx,
    market,
    settingsSnapshot: settings,
    fetchedAt: now,
    status: settings.enabled ? "ready" : "disabled",
  };

  await db().doc(GOLD_PRICE_PENDING_REF).set(payload, { merge: false });
  await db().collection(GOLD_PRICE_KRX_HISTORY).doc(`${krx.sourceDate}_${Date.now()}`).set(payload);

  // KRX 값은 관리자 참고용으로만 저장합니다.
  // 홈페이지 공개 시세(goldPrices/current)는 관리자 직접 입력 화면에서만 갱신합니다.
  return { ok: true, krx, market, settings };
}

export const syncKrxGoldPrice = onSchedule(
  {
    schedule: "30 13 * * 1-5",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: [DATA_GO_KR_SERVICE_KEY],
    retryCount: 2,
  },
  async () => {
    try {
      await syncGoldPriceFromKrx("schedule");
    } catch (error) {
      console.error("[syncKrxGoldPrice] failed", error);
      throw error;
    }
  }
);

export const refreshGoldPriceNow = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
    secrets: [DATA_GO_KR_SERVICE_KEY],
    timeoutSeconds: 60,
  },
  async (req) => {
    try {
      requireAdmin((req.auth?.token || {}) as Record<string, unknown>);

      console.log("[refreshGoldPriceNow] request", {
        uid: req.auth?.uid || null,
        hasSecret: DATA_GO_KR_SERVICE_KEY.value().trim().length > 0,
      });

      await syncGoldPriceFromKrx("manual");
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[refreshGoldPriceNow] failed", {
        message,
        stack: error instanceof Error ? error.stack : null,
        uid: req.auth?.uid || null,
      });

      if (error instanceof HttpsError) throw error;

      throw new HttpsError(
        "internal",
        `금시세 조회 실패: ${message}`
      );
    }
  }
);

export const saveGoldPriceSettings = onCall<{ settings: unknown }>(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    try {
      if (!req.auth?.uid) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }

      const token = (req.auth.token || {}) as Record<string, unknown>;

      console.log("[saveGoldPriceSettings] request", {
        uid: req.auth.uid,
        admin: token.admin === true,
        superAdmin: token.superAdmin === true,
        hasSettings: req.data?.settings != null,
      });

      requireAdmin(token);

      const settings = normalizeGoldPriceSettings(req.data?.settings);

      await db().doc(GOLD_PRICE_SETTINGS_REF).set(
        {
          ...settings,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: req.auth.uid,
        },
        { merge: true }
      );

      console.log("[saveGoldPriceSettings] saved", {
        uid: req.auth.uid,
        enabled: settings.enabled,
        publishMode: settings.publishMode,
        roundingUnit: settings.roundingUnit,
      });

      // Callable 응답은 직렬화 오류 가능성을 줄이기 위해
      // 저장 성공 여부만 반환합니다. 최신 설정값은 Firestore 실시간 구독으로 반영됩니다.
      return { ok: true };
    } catch (error) {
      console.error("[saveGoldPriceSettings] failed", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        uid: req.auth?.uid || null,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error instanceof Error
          ? `금시세 설정 저장 실패: ${error.message}`
          : "금시세 설정을 저장하지 못했습니다."
      );
    }
  }
);

export const publishPendingGoldPrice = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    requireAdmin((req.auth?.token || {}) as Record<string, unknown>);
    throw new HttpsError(
      "failed-precondition",
      "KRX 시세는 참고용입니다. 홈페이지 시세는 관리자 직접 입력 화면에서 저장해 주세요."
    );
  }
);
