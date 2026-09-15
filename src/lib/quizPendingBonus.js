// src/lib/quizPendingBonus.js
// 퀵퀴즈를 먼저 완료한 사용자가 회원가입/이메일 인증을 거치는 동안
// 답안을 안전하게 보존합니다. 실제 보너스 지급 여부와 정답 검증은 서버가 최종 판단합니다.

const STORAGE_KEY = "kgm_quiz_gold_bonus_pending_v1";
const TTL_MS = 24 * 60 * 60 * 1000;
const REQUIRED_IDS = ["q1", "q2", "q3", "q4", "q5"];

// 2026-08 이전 sessionStorage 방식과의 짧은 호환용입니다.
const LEGACY_PASS_KEY = "quiz_gold_bonus_passed";
const LEGACY_SCORE_KEY = "quiz_gold_bonus_score";
const LEGACY_ANSWERS_KEY = "quiz_gold_bonus_answers";

function normalizeAnswers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = REQUIRED_IDS.map((id) => [id, Number(value[id])]);
  if (!entries.every(([, answer]) => Number.isInteger(answer))) return null;
  return Object.fromEntries(entries);
}

function removeLegacySession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LEGACY_PASS_KEY);
    sessionStorage.removeItem(LEGACY_SCORE_KEY);
    sessionStorage.removeItem(LEGACY_ANSWERS_KEY);
  } catch {}
}

function migrateLegacySession() {
  if (typeof window === "undefined") return null;

  try {
    if (sessionStorage.getItem(LEGACY_PASS_KEY) !== "1") return null;
    const answers = normalizeAnswers(
      JSON.parse(sessionStorage.getItem(LEGACY_ANSWERS_KEY) || "null")
    );
    if (!answers) {
      removeLegacySession();
      return null;
    }

    const pending = {
      answers,
      score: Number(sessionStorage.getItem(LEGACY_SCORE_KEY) || REQUIRED_IDS.length),
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    removeLegacySession();
    return pending;
  } catch {
    return null;
  }
}

export function savePendingQuizBonus(answers, score = REQUIRED_IDS.length) {
  if (typeof window === "undefined") return false;

  const normalized = normalizeAnswers(answers);
  if (!normalized) return false;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        answers: normalized,
        score: Number.isFinite(Number(score)) ? Number(score) : REQUIRED_IDS.length,
        savedAt: Date.now(),
      })
    );
    removeLegacySession();
    return true;
  } catch {
    return false;
  }
}

export function readPendingQuizBonus() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacySession();

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);
    const answers = normalizeAnswers(parsed?.answers);

    if (!savedAt || Date.now() - savedAt > TTL_MS || !answers) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      answers,
      score: Number(parsed?.score || REQUIRED_IDS.length),
      savedAt,
    };
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return null;
  }
}

export function clearPendingQuizBonus() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  removeLegacySession();
}
