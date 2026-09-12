// scripts/seed-appconfig.mjs
import admin from "firebase-admin";
import fs from "node:fs";

// 환경변수로 서비스계정 JSON 지정
// mac/linux: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
// windows pwsh: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\sa.json"
admin.initializeApp({ credential: admin.credential.applicationDefault() });

const db = admin.firestore();

const DOC_PATH = "appConfig/goldRates";
const defaults = JSON.parse(
  fs.readFileSync(new URL("../functions/src/goldRates.defaults.json", import.meta.url), "utf8")
);
const DEFAULT_PURITY = defaults.purity;
const DEFAULT_EXCHANGE = defaults.exchange;

async function main() {
  const ref = db.doc(DOC_PATH);
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() || {}) : {};

  // 기존 값이 있으면 존중하고, 없는 키만 채움 (안전 모드)
  const nextPurity = { ...(data.purity || {}) };
  for (const [k, v] of Object.entries(DEFAULT_PURITY)) {
    if (typeof nextPurity[k] !== "number") nextPurity[k] = v;
  }

  const nextExchange = { ...(data.exchange || {}) };
  if (typeof nextExchange["999.9골드바"] !== "number") {
    nextExchange["999.9골드바"] = DEFAULT_EXCHANGE["999.9골드바"];
  }

  await ref.set(
    {
      purity: nextPurity,
      exchange: nextExchange,
      version: Number(data.version) || defaults.version,
    },
    { merge: true }
  );

  // 예약 슬롯 문서(비워둬도 OK)
  await db.doc("appConfig/reservedSlots").set({}, { merge: true });

  console.log("✅ seed complete: appConfig/goldRates, appConfig/reservedSlots");
}

main().then(() => process.exit(0)).catch(err => {
  console.error("❌ 실패:", err);
  process.exit(1);
});
