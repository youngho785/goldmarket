import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();
const snapshot = await db.collection("products").get();
const changes = [];

for (const productDoc of snapshot.docs) {
  const data = productDoc.data();
  const patch = {};
  const moderationStatus =
    typeof data.moderationStatus === "string" ? data.moderationStatus.trim() : "";

  // moderationStatus가 없는 레거시 상품은 과거의 승인 대기 상품으로 보고
  // 새 정책에 맞춰 기본 공개 상태로 전환합니다.
  if (!moderationStatus) {
    if (data.approved !== true) patch.approved = true;
    patch.moderationStatus = "approved";
  } else if (typeof data.approved !== "boolean") {
    // 새 관리 기능으로 명시적으로 공개 취소된 상품은 비공개를 유지합니다.
    patch.approved = moderationStatus === "approved";
  }
  if (typeof data.completed !== "boolean") patch.completed = false;

  if (Object.keys(patch).length) {
    changes.push({ ref: productDoc.ref, id: productDoc.id, patch });
  }
}

console.log(`검사 상품: ${snapshot.size}개`);
console.log(`보정 대상: ${changes.length}개`);
for (const change of changes) {
  console.log(`- ${change.id}: ${JSON.stringify(change.patch)}`);
}

if (!apply) {
  console.log("드라이런만 수행했습니다. 실제 반영은 --apply 옵션을 추가하세요.");
  process.exit(0);
}

for (let start = 0; start < changes.length; start += 400) {
  const batch = db.batch();
  for (const change of changes.slice(start, start + 400)) {
    batch.set(
      change.ref,
      { ...change.patch, migratedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
  await batch.commit();
}

console.log(`상품 ${changes.length}개의 호환 필드를 반영했습니다.`);
