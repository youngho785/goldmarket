import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp();

const write = process.argv.includes("--write");
const db = getFirestore();
const snapshot = await db
  .collection("board")
  .where("category", "==", "inquiry")
  .get();

console.log(`기존 고객 문의 ${snapshot.size}건을 확인했습니다.`);
if (!write) {
  console.log("현재는 미리보기입니다. 실제 복사는 --write 옵션을 추가하세요.");
  snapshot.docs.forEach((entry) => console.log(`- ${entry.id}: ${entry.get("title") || ""}`));
  process.exit(0);
}

let batch = db.batch();
let pending = 0;
let migrated = 0;
for (const entry of snapshot.docs) {
  const source = entry.data() || {};
  const answered = source.status === "answered" || Boolean(source.answer);
  const target = db.doc(`supportTickets/${entry.id}`);
  batch.set(
    target,
    {
      title: String(source.title || "금교환 문의").slice(0, 120),
      content: String(source.content || "").slice(0, 5000),
      category: "inquiry",
      authorId: String(source.authorId || ""),
      authorNickname: String(source.authorNickname || "고객").slice(0, 80),
      status: answered ? "answered" : "open",
      createdAt: source.createdAt || FieldValue.serverTimestamp(),
      updatedAt: source.updatedAt || source.createdAt || FieldValue.serverTimestamp(),
      ...(answered
        ? {
            answer: String(source.answer || ""),
            answeredBy: source.answeredBy || null,
            answeredAt: source.answeredAt || null,
          }
        : {}),
      migratedFrom: "board",
      migratedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  pending += 1;
  migrated += 1;
  if (pending === 400) {
    await batch.commit();
    batch = db.batch();
    pending = 0;
  }
}
if (pending > 0) await batch.commit();
console.log(`supportTickets로 ${migrated}건 복사했습니다. 원본은 삭제하지 않았습니다.`);
