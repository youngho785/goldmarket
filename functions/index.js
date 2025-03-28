// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 채팅 메시지 생성 시 알림 전송 함수
exports.sendChatNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const recipientId = messageData.recipientId;
    if (!recipientId) {
      console.log("메시지에 recipientId가 없습니다.");
      return null;
    }
    
    // 사용자 문서에서 수신자의 FCM 토큰 가져오기
    const userDoc = await admin.firestore().doc(`users/${recipientId}`).get();
    if (!userDoc.exists) {
      console.log("해당 recipientId의 사용자 문서가 없습니다.");
      return null;
    }
    const userData = userDoc.data();
    const token = userData.fcmToken;
    if (!token) {
      console.log("수신자에게 등록된 FCM 토큰이 없습니다.");
      return null;
    }
    
    // FCM 페이로드 구성: 발신자 이름, 메시지 미리보기, 딥링크용 데이터 포함
    const payload = {
      notification: {
        title: `새 메시지 from ${messageData.senderName || "알 수 없음"}`,
        body: messageData.text ? messageData.text.substring(0, 100) : "새 메시지가 도착했습니다.",
        // 필요 시 아이콘 URL 추가: icon: "https://yourdomain.com/icon.png"
      },
      data: {
        chatId: context.params.chatId,
        messageId: context.params.messageId,
      },
    };
    
    try {
      const response = await admin.messaging().sendToDevice(token, payload);
      console.log("알림 전송 성공:", response);
      return null;
    } catch (error) {
      console.error("알림 전송 실패:", error);
      return null;
    }
  });
