// scripts/migrate-goldrates.mjs
import admin from "firebase-admin";
import fs from "node:fs";

// 서비스계정 JSON 경로를 환경변수로 지정해 두세요.
// mac/linux: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
// windows pwsh: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\sa.json"
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const DOC_PATH = "appConfig/goldRates";
const defaults = JSON.parse(
  fs.readFileSync(new URL("../functions/src/goldRates.defaults.json", import.meta.url), "utf8")
);

// 짧은키 → 현재 긴 라벨
const MAP = {
  "14k(585)": "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
  "18k(750)": "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
  "순금제품 995": "순금 995제품(목걸이,팔찌,반지,귀걸이)",
  "순금제품 999": "순금 999제품(팔찌,목걸이, 반지,귀걸이)",
  "순금기타(문의)": "기타(문의)",
};

async function run() {
  const ref = db.doc(DOC_PATH);
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() || {}) : {};
  const purity = { ...(data.purity || {}) };
  const exchange = { ...(data.exchange || {}) };

  for (const [shortKey, longKey] of Object.entries(MAP)) {
    const value = purity[shortKey];
    if (typeof purity[longKey] !== "number" && typeof value === "number") {
      purity[longKey] = value;
      console.log(`+ purity["${longKey}"] ← (from "${shortKey}") ${value}`);
    }
  }

  for (const [longKey, defaultValue] of Object.entries(defaults.purity)) {
    if (typeof purity[longKey] !== "number") {
      purity[longKey] = defaultValue;
      console.log(`+ purity["${longKey}"] ← default ${defaultValue}`);
    }
  }

  for (const [key, defaultValue] of Object.entries(defaults.exchange)) {
    if (typeof exchange[key] !== "number") exchange[key] = defaultValue;
  }

  await ref.set(
    { purity, exchange, version: Number(data.version) || defaults.version },
    { merge: true }
  );
  console.log("✅ appConfig/goldRates 업데이트 완료");
}

run().then(() => process.exit(0)).catch((error) => {
  console.error("❌ 실패:", error);
  process.exit(1);
});
