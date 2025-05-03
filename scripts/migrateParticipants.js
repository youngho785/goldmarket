// scripts/migrateParticipants.js
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const snap = await db.collection("chats").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.participants && data.participantsKey) {
      // participantsKey 에서 UID 두 개를 분리
      const participants = data.participantsKey.split("_");
      await doc.ref.update({ participants });
      console.log(`✅ [${doc.id}] participants 추가:`, participants);
    }
  }
  console.log("Migration 완료!");
  process.exit(0);
})().catch(err => {
  console.error("Migration 실패:", err);
  process.exit(1);
});
