// scripts/seed-appconfig.mjs
import admin from "firebase-admin";

// 환경변수로 서비스계정 JSON 지정
// mac/linux: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
// windows pwsh: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\sa.json"
admin.initializeApp({ credential: admin.credential.applicationDefault() });

const db = admin.firestore();

const DOC_PATH = "appConfig/goldRates";

// 긴 라벨 기본값 (현재 앱과 동일 기준)
const DEFAULT_PURITY = {
  "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.53,
  "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.70,
  "순금 995제품(목걸이,팔찌,반지,귀걸이)": 0.945,
  "순금 999제품(팔찌,목걸이, 반지,귀걸이)": 0.95,
  "순금 열쇠": 0.943,
  "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)": 0.94,
  "순금 마고자 단추 / 색상이 들어있는 제품": 0.93,
  "999,24k 순금덩어리(순도 측정후 999일 경우)": 0.96,
};

const DEFAULT_EXCHANGE = { "999.9골드바": 1 };

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

  await ref.set({ purity: nextPurity, exchange: nextExchange }, { merge: true });

  // 예약 슬롯 문서(비워둬도 OK)
  await db.doc("appConfig/reservedSlots").set({}, { merge: true });

  console.log("✅ seed complete: appConfig/goldRates, appConfig/reservedSlots");
}

main().then(() => process.exit(0)).catch(err => {
  console.error("❌ 실패:", err);
  process.exit(1);
});
