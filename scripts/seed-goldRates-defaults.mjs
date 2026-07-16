// scripts/seed-goldRates-defaults.mjs
import admin from "firebase-admin";

// mac/linux: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
// windows pwsh: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\sa.json"
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const GOLD_RATES_PATH = "appConfig/goldRates";

const PURITY_DEFAULTS = {
  "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.53,
  "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.70,
  "순금 995제품(목걸이,팔찌,반지,귀걸이)": 0.945,
  "순금 999제품(팔찌,목걸이, 반지,귀걸이)": 0.95,
  "순금 열쇠": 0.943,
  "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)": 0.94,
  "순금 마고자 단추 / 색상이 들어있는 제품": 0.93,
  "999,24k 순금덩어리(순도 측정후 999일 경우)": 0.96,
};
const EXCHANGE_DEFAULTS = { "999.9골드바": 1 };

async function main() {
  // (선택) 기존 문서의 짧은 키들을 정리하고 싶다면 purity를 아예 새로 덮어씁니다.
  await db.doc(GOLD_RATES_PATH).set(
    { purity: PURITY_DEFAULTS, exchange: EXCHANGE_DEFAULTS },
    { merge: true } // merge:true여도 위 두 필드는 최신 값으로 갱신됨
  );
  console.log("✅ goldRates defaults seeded.");
}
main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
