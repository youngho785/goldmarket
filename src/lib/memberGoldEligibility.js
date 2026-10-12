// Client display guard. The server enforces the final MEMBER GOLD policy.
export function koreaTodayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).reduce((result, part) => {
    if (part.type === 'year') result.year = part.value;
    if (part.type === 'month') result.month = part.value;
    if (part.type === 'day') result.day = part.value;
    return result;
  }, Object.create(null));
}

function validDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function getKoreaTodayDateKey(now = new Date()) {
  const {year, month, day} = koreaTodayKey(now);
  return `${year}-${month}-${day}`;
}

export function eligibleMemberGoldGroups(groups, todayKey = getKoreaTodayDateKey()) {
  if (!Array.isArray(groups)) return [];
  return groups.filter((group) =>
    group && typeof group.groupId === 'string' && !!group.groupId &&
    validDateKey(group.visitDate) && group.visitDate >= todayKey &&
    !['completed', 'canceled', 'rejected'].includes(group.status)
  );
}
