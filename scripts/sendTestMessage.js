// scripts/sendTestMessage.js

const admin = require('firebase-admin');
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || 'goldmarket-200a0'
});
const db = admin.firestore();

async function sendTest() {
  // ① 테스트할 채팅방 ID를 적어 주세요.
  const chatId = '여기에_테스트채팅방ID';

  // ② 발신자(본인)의 UID, 수신자 UID가 participants 배열에 반드시 있어야 합니다.
  const senderUid = 'SENDER_UID';
  const recipientUid = 'RECIPIENT_UID';

  // (optional) users/{RECIPIENT_UID}.fcmTokens에 토큰이 들어 있는지 콘솔에서 미리 확인하세요.

  // Firestore에 메시지 추가
  const msgRef = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .add({
      sender: senderUid,
      senderName: '테스트발신자',
      text: '테스트 푸시알림 메시지입니다!',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      readBy: [senderUid]
    });

  console.log(`✅ 메시지 추가됨: ${msgRef.id}`);
  process.exit(0);
}

sendTest().catch(err => {
  console.error(err);
  process.exit(1);
});
