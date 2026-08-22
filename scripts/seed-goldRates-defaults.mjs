// scripts/seed-goldRates-defaults.mjs
import admin from "firebase-admin";
import fs from "node:fs";

// mac/linux: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
// windows pwsh: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\sa.json"
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const GOLD_RATES_PATH = "appConfig/goldRates";
const defaults = JSON.parse(
  fs.readFileSync(new URL("../functions/src/goldRates.defaults.json", import.meta.url), "utf8")
);

async function main() {
  // (선택) 기존 문서의 짧은 키들을 정리하고 싶다면 purity를 아예 새로 덮어씁니다.
  await db.doc(GOLD_RATES_PATH).set(
    { purity: defaults.purity, exchange: defaults.exchange, version: defaults.version },
    { merge: true } // merge:true여도 위 두 필드는 최신 값으로 갱신됨
  );
  console.log("✅ goldRates defaults seeded.");
}
main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
