// Pure goal-save planning. No Firebase access or side effects.
// An unchanged save must not re-arm an already reached one-time goal.
export type MyGoldGoalSettings = {
  enabled: boolean;
  valueTargetWon: number | null;
  priceTargetPerDon: number | null;
  priceDirection: "up" | "down";
  targetGoldBarG: number | null;
};

function goalKey(prefix: string, value: number | null): string {
  if (!value || value <= 0) return "";
  return `${prefix}:${Number.isInteger(value) ? String(value) : String(value).replace(".", "p")}`;
}

export function sameMyGoldGoalSettings(
  previous: MyGoldGoalSettings,
  next: MyGoldGoalSettings
): boolean {
  return previous.enabled === next.enabled &&
    previous.valueTargetWon === next.valueTargetWon &&
    previous.priceTargetPerDon === next.priceTargetPerDon &&
    previous.priceDirection === next.priceDirection &&
    previous.targetGoldBarG === next.targetGoldBarG;
}

export function planMyGoldGoalSave(
  previous: MyGoldGoalSettings,
  next: MyGoldGoalSettings,
  rawState: unknown,
  rawRevision: unknown
): { changed: boolean; revision: number; state: Record<string, unknown> | null } {
  const previousState = rawState && typeof rawState === "object" && !Array.isArray(rawState)
    ? rawState as Record<string, unknown>
    : {};
  const revisionValue = Number(rawRevision);
  const revision = Number.isFinite(revisionValue) && revisionValue > 0
    ? Math.round(revisionValue)
    : 0;
  const changed = !sameMyGoldGoalSettings(previous, next);
  if (!changed) return { changed: false, revision, state: null };

  // Changing one goal must not resend an already delivered, *unchanged* goal.
  // A deliberate disable-and-reenable starts a new alert cycle.
  const mayPreserve = previous.enabled && next.enabled;
  const valueGoalKey = goalKey("value", next.valueTargetWon);
  const priceGoalKey = goalKey(next.priceDirection === "down" ? "price-down" : "price", next.priceTargetPerDon);
  const barGoalKey = goalKey("bar", next.targetGoldBarG);

  const valueReached = Boolean(
    mayPreserve && valueGoalKey &&
    previous.valueTargetWon === next.valueTargetWon &&
    previousState.valueGoalKey === valueGoalKey && previousState.valueReached === true
  );
  const priceReached = Boolean(
    mayPreserve && priceGoalKey &&
    previous.priceTargetPerDon === next.priceTargetPerDon &&
    previous.priceDirection === next.priceDirection &&
    previousState.priceGoalKey === priceGoalKey && previousState.priceReached === true
  );
  const barReached = Boolean(
    mayPreserve && barGoalKey &&
    previous.targetGoldBarG === next.targetGoldBarG &&
    previousState.barGoalKey === barGoalKey && previousState.barReached === true
  );

  return {
    changed: true,
    revision: revision + 1,
    state: {
      ...previousState,
      valueGoalKey, valueReached,
      priceGoalKey, priceReached,
      barGoalKey, barReached,
    },
  };
}
