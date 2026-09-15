import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp();

const PROMO_ID = "gold_bonus_v1";
const LEDGER_ID = `quiz_${PROMO_ID}`;
const DEFAULT_CREDIT_MG = 10;
const write = process.argv.includes("--write");
const db = getFirestore();

function nonNegativeInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function balanceMilliGrams(data) {
  if (Number.isFinite(Number(data?.bonusGoldMilliGrams))) {
    return nonNegativeInteger(data?.bonusGoldMilliGrams);
  }

  const legacyG = Number(data?.bonusGoldG || 0);
  return Number.isFinite(legacyG) && legacyG > 0
    ? Math.round(legacyG * 1000)
    : 0;
}

const usersSnap = await db.collection("users").get();
let foundClaims = 0;
let candidates = 0;
let migrated = 0;
let metadataOnly = 0;

console.log(`사용자 ${usersSnap.size}명을 확인합니다.`);
console.log(write ? "실제 마이그레이션 모드입니다." : "미리보기 모드입니다. 실제 반영은 --write 옵션이 필요합니다.");

for (const userDoc of usersSnap.docs) {
  const uid = userDoc.id;
  const promoRef = userDoc.ref.collection("promotions").doc(PROMO_ID);
  const ledgerRef = userDoc.ref.collection("ledger").doc(LEDGER_ID);
  const [promoSnap, ledgerSnap] = await Promise.all([promoRef.get(), ledgerRef.get()]);

  if (!promoSnap.exists) continue;
  foundClaims += 1;

  const promo = promoSnap.data() || {};
  const creditedMg = nonNegativeInteger(
    promo.creditedMilliGrams,
    Math.round(Number(promo.creditedG || DEFAULT_CREDIT_MG / 1000) * 1000)
  );
  const metadataNeedsRepair =
    promo.balanceApplied !== true ||
    promo.creditedMilliGrams !== creditedMg ||
    promo.creditedG !== creditedMg / 1000;
  const ledgerMissing = !ledgerSnap.exists;

  if (!ledgerMissing && !metadataNeedsRepair) continue;
  candidates += 1;

  console.log(
    `- ${uid}: ledger=${ledgerMissing ? "없음" : "있음"}, ` +
      `balanceApplied=${promo.balanceApplied === true ? "true" : "false/없음"}, ` +
      `credit=${(creditedMg / 1000).toFixed(3)}g`
  );

  if (!write) continue;

  const result = await db.runTransaction(async (tx) => {
    const [freshUser, freshPromo, freshLedger] = await Promise.all([
      tx.get(userDoc.ref),
      tx.get(promoRef),
      tx.get(ledgerRef),
    ]);

    if (!freshPromo.exists) return { changed: false, appliedBalance: false };

    const freshPromoData = freshPromo.data() || {};
    const freshCreditedMg = nonNegativeInteger(
      freshPromoData.creditedMilliGrams,
      Math.round(Number(freshPromoData.creditedG || DEFAULT_CREDIT_MG / 1000) * 1000)
    );
    const alreadyApplied = freshPromoData.balanceApplied === true;
    const now = FieldValue.serverTimestamp();

    // 과거 문서가 명시적으로 balanceApplied=true라면 잔액은 다시 더하지 않습니다.
    // 그렇지 않은 레거시 수령 문서만 기존 구현과 동일하게 한 번 잔액에 반영합니다.
    if (!alreadyApplied) {
      const currentBalanceMg = balanceMilliGrams(freshUser.data());
      const nextBalanceMg = currentBalanceMg + freshCreditedMg;
      tx.set(
        userDoc.ref,
        {
          bonusGoldMilliGrams: nextBalanceMg,
          bonusGoldG: nextBalanceMg / 1000,
          bonusGoldUpdatedAt: now,
        },
        { merge: true }
      );
    }

    if (!freshLedger.exists) {
      tx.create(ledgerRef, {
        direction: "credit",
        amountMilliGrams: freshCreditedMg,
        amountG: freshCreditedMg / 1000,
        source: PROMO_ID,
        createdAt: now,
        migratedFromLegacyClaim: true,
        migrationAppliedBalance: !alreadyApplied,
      });
    }

    tx.set(
      promoRef,
      {
        creditedMilliGrams: freshCreditedMg,
        creditedG: freshCreditedMg / 1000,
        balanceApplied: true,
        balanceAppliedAt: freshPromoData.balanceAppliedAt || now,
        legacyMigrationCheckedAt: now,
      },
      { merge: true }
    );

    return {
      changed: !freshLedger.exists || freshPromoData.balanceApplied !== true,
      appliedBalance: !alreadyApplied,
    };
  });

  if (result.changed) migrated += 1;
  if (!result.appliedBalance) metadataOnly += 1;
}

console.log(`퀴즈 수령 기록: ${foundClaims}건`);
console.log(`보정 대상: ${candidates}건`);
if (write) {
  console.log(`보정 완료: ${migrated}건 (잔액 재가산 없이 원장/메타만 정리: ${metadataOnly}건)`);
} else {
  console.log("데이터는 변경하지 않았습니다.");
}
