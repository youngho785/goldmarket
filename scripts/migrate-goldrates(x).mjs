// scripts/migrate-goldrates.mjs
import admin from "firebase-admin";

// 서비스계정 JSON 경로를 환경변수로 지정해 두세요.
// mac/linux: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
// windows pwsh: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\sa.json"
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const DOC_PATH = "appConfig/goldRates";

// 짧은키 → 긴 라벨
const MAP = {
  "14k(585)": "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
  "18k(750)": "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
  "순금제품 995": "순금 995제품(목걸이,팔찌,반지,귀걸이)",
  "순금제품 999": "순금 999제품(목걸이,팔찌,반지,귀걸이)",
  "순금기타(문의)": "기타(문의)", // 계산에는 사용하지 않지만 맵핑 유지
};

// 긴 라벨 기본값(없을 때만 채움)
const DEFAULTS = {
  "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.52,
  "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.7085,
  "순금 995제품(목걸이,팔찌,반지,귀걸이)": 0.93,
  "순금 999제품(목걸이,팔찌,반지,귀걸이)": 0.937,
  "순금 열쇠": 0.925,
  "순금 동물모양(거북이,두꺼비 등)": 0.92,
  "순금 마고자 단추 / 색상이 들어있는 제품": 0.90,
  "999 순금덩어리": 0.96,
};

async function run() {
  const ref = db.doc(DOC_PATH);
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() || {}) : {};

  const purity = { ...(data.purity || {}) };
  const exchange = { ...(data.exchange || {}) };

  // 1) 짧은키 값을 긴 라벨로 복제(긴 라벨이 비어있을 때만)
  for (const [shortKey, longKey] of Object.entries(MAP)) {
    const val = purity[shortKey];
    if (typeof purity[longKey] !== "number" && typeof val === "number") {
      purity[longKey] = val;
      console.log(`+ purity["${longKey}"] ← (from "${shortKey}") ${val}`);
    }
  }

  // 2) 기본값으로 비어있는 긴 라벨 보완(없는 경우에만)
  for (const [longKey, defVal] of Object.entries(DEFAULTS)) {
    if (typeof purity[longKey] !== "number") {
      purity[longKey] = defVal;
      console.log(`+ purity["${longKey}"] ← default ${defVal}`);
    }
  }

  // 3) exchange 보정
  if (exchange["999.9골드바"] !== 1) {
    exchange["999.9골드바"] = 1;
    console.log(`* exchange["999.9골드바"] set to 1`);
  }

  await ref.set({ purity, exchange }, { merge: true });
  console.log("✅ appConfig/goldRates 업데이트 완료");
}

run().then(() => process.exit(0)).catch(err => {
  console.error("❌ 실패:", err);
  process.exit(1);
});
