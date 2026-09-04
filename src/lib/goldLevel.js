// src/lib/goldLevel.js
const LEVELS = Object.freeze([
  { level: 1, minXp: 0, name: "골드 입문자" },
  { level: 2, minXp: 20, name: "골드 탐험가" },
  { level: 3, minXp: 40, name: "골드 컬렉터" },
  { level: 4, minXp: 70, name: "골드 마스터" },
]);

export function getGoldLevelSummary({ itemCount = 0, bonusStatus = null } = {}) {
  const rewards = bonusStatus?.rewards || {};
  const vaultXp = Math.min(Math.max(Number(itemCount) || 0, 0), 5) * 5;
  const welcomeXp = rewards.welcome?.claimed ? 10 : 0;
  const quizXp = rewards.quiz?.claimed ? 10 : 0;
  const pushXp = rewards.marketingPush?.claimed ? 10 : 0;
  const xp = vaultXp + welcomeXp + quizXp + pushXp;

  let current = LEVELS[0];
  for (const candidate of LEVELS) {
    if (xp >= candidate.minXp) current = candidate;
  }

  const currentIndex = LEVELS.findIndex((item) => item.level === current.level);
  const next = LEVELS[currentIndex + 1] || null;
  const range = next ? Math.max(1, next.minXp - current.minXp) : 1;
  const progress = next
    ? Math.min(100, Math.max(0, ((xp - current.minXp) / range) * 100))
    : 100;

  return {
    xp,
    level: current.level,
    name: current.name,
    next,
    progress,
    remainingXp: next ? Math.max(0, next.minXp - xp) : 0,
  };
}
