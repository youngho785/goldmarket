// Shared admin/member MY GOLD aggregation helpers.
import { db } from "../core/runtime.js";

export function adminBonusGoldGrams(
  data: FirebaseFirestore.DocumentData | undefined
): number {
  const milliGrams = Number(data?.bonusGoldMilliGrams);
  if (Number.isFinite(milliGrams) && milliGrams >= 0) {
    return milliGrams / 1000;
  }

  const legacyG = Number(data?.bonusGoldG || 0);
  return Number.isFinite(legacyG) && legacyG > 0 ? legacyG : 0;
}

export async function loadGoldVaultActivity(): Promise<{
  itemCount: number;
  activeUids: Set<string>;
}> {
  const snapshot = await db()
    .collectionGroup("goldVaultItems")
    .select("createdAt")
    .get();
  const activeUids = new Set<string>();

  snapshot.docs.forEach((document) => {
    const ownerRef = document.ref.parent.parent;
    if (ownerRef?.id) activeUids.add(ownerRef.id);
  });

  return {
    itemCount: snapshot.size,
    activeUids,
  };
}
