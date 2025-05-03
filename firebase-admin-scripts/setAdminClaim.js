// setAdminClaim.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function grantAdmin(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ 사용자 ${uid} 에게 admin 권한을 부여했습니다.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ 커스텀 클레임 설정 오류:", error);
    process.exit(1);
  }
}

const uid = process.argv[2];
if (!uid) {
  console.error("사용법: node setAdminClaim.js <USER_UID>");
  process.exit(1);
}

grantAdmin(uid);
