// A possible overlap is not proof of duplicate ownership. Never silently remove items.
function signature(item) {
  const goldType = String(item?.goldType || '').trim().toLowerCase();
  const grams = Number(item?.weightG);
  if (!goldType || !Number.isFinite(grams) || grams <= 0) return '';
  // Granularity aligns with recorded input (0.001g), not the displayed 0.01g.
  return `${goldType}|${Math.round(grams * 1000)}`;
}

export function findPossibleMyGoldDuplicates(pendingItems, existingItems) {
  const seen = new Set(
    (Array.isArray(existingItems) ? existingItems : []).map(signature).filter(Boolean)
  );
  const result = [];
  for (const item of Array.isArray(pendingItems) ? pendingItems : []) {
    const key = signature(item);
    if (key && seen.has(key)) result.push(item);
    if (key) seen.add(key);
  }
  return result;
}
