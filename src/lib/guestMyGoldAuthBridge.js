import { readSavedGuestMyGoldItems } from "@/lib/myGoldGuestDemo";
import { saveGoldVaultGuestDraft } from "@/lib/goldVaultImportDraft";

export const GUEST_MY_GOLD_IMPORT_PATH = "/my-gold?import=guest";

const AUTO_IMPORT_STORAGE_KEY = "kgm_guest_my_gold_auto_import_v1";
const AUTO_IMPORT_TTL_MS = 24 * 60 * 60 * 1000;

export function markGuestMyGoldAutoImportPending(uid) {
  if (typeof window === "undefined" || !uid) return;
  try {
    localStorage.setItem(
      AUTO_IMPORT_STORAGE_KEY,
      JSON.stringify({ uid: String(uid), savedAt: Date.now() })
    );
  } catch {}
}

export function hasGuestMyGoldAutoImportPending(uid) {
  if (typeof window === "undefined" || !uid) return false;
  try {
    const raw = localStorage.getItem(AUTO_IMPORT_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);
    const sameUser = String(parsed?.uid || "") === String(uid);

    if (!savedAt || Date.now() - savedAt > AUTO_IMPORT_TTL_MS || !sameUser) {
      localStorage.removeItem(AUTO_IMPORT_STORAGE_KEY);
      return false;
    }

    return true;
  } catch {
    try {
      localStorage.removeItem(AUTO_IMPORT_STORAGE_KEY);
    } catch {}
    return false;
  }
}

export function clearGuestMyGoldAutoImportPending() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTO_IMPORT_STORAGE_KEY);
  } catch {}
}

/**
 * 로그인/회원가입 진입이 단순 홈 복귀(/)인 경우에만,
 * 브라우저에 남아 있는 게스트 MY GOLD 기록을 우선 복귀 대상으로 올립니다.
 * 예약/금교환 등 사용자가 명시적으로 진행하던 다른 흐름은 가로채지 않습니다.
 */
export function getGuestMyGoldAuthReturnPath(returnTo = "/") {
  const safeReturn = typeof returnTo === "string" && returnTo ? returnTo : "/";
  if (safeReturn !== "/") return safeReturn;
  return readSavedGuestMyGoldItems().length > 0
    ? GUEST_MY_GOLD_IMPORT_PATH
    : safeReturn;
}

/**
 * 인증 화면으로 넘어가기 직전 게스트 기록을 별도 import draft로 보존합니다.
 * 계정 MY GOLD에는 사용자가 확인 버튼을 누르기 전까지 실제로 쓰지 않습니다.
 */
export function prepareGuestMyGoldImportDraft() {
  const items = readSavedGuestMyGoldItems();
  if (!items.length) return 0;
  saveGoldVaultGuestDraft(items);
  return items.length;
}
