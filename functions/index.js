// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/* ---------------------------------------
   채팅 메시지 생성 시 알림 전송 함수
----------------------------------------- */
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
    
    // FCM 페이로드 구성: 발신자 이름, 메시지 미리보기, 딥링크 데이터 포함
    const payload = {
      notification: {
        title: `새 메시지 from ${messageData.senderName || "알 수 없음"}`,
        body: messageData.text
          ? messageData.text.substring(0, 100)
          : "새 메시지가 도착했습니다.",
      },
      data: {
        chatId: context.params.chatId,
        messageId: context.params.messageId,
      },
    };
    
    try {
      const response = await admin.messaging().sendToDevice(token, payload);
      console.log("채팅 알림 전송 성공:", response);
      return null;
    } catch (error) {
      console.error("채팅 알림 전송 실패:", error);
      return null;
    }
  });

/* -----------------------------------------------
   금 교환 요청 문서 생성 시 알림 전송 함수
----------------------------------------------- */
exports.sendGoldExchangeNotification = functions.firestore
  .document("goldExchanges/{exchangeId}")
  .onCreate(async (snap, context) => {
    const exchangeData = snap.data();
    const userId = exchangeData.userId;
    if (!userId) {
      console.log("금 교환 요청 문서에 userId가 없습니다.");
      return null;
    }
    
    // 사용자 문서에서 해당 사용자의 FCM 토큰 조회
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      console.log(`사용자 ${userId} 문서가 존재하지 않습니다.`);
      return null;
    }
    const userData = userDoc.data();
    const token = userData.fcmToken;
    if (!token) {
      console.log(`사용자 ${userId}의 FCM 토큰이 등록되어 있지 않습니다.`);
      return null;
    }
    
    // FCM 알림 페이로드 구성
    const payload = {
      notification: {
        title: "금 교환 요청 접수",
        body: "요청하신 금 교환이 접수되었습니다. 검토 후 처리될 예정입니다.",
      },
      data: {
        exchangeId: context.params.exchangeId,
      },
    };
    
    try {
      const response = await admin.messaging().sendToDevice(token, payload);
      console.log("금 교환 요청 알림 전송 성공:", response);
      return null;
    } catch (error) {
      console.error("금 교환 요청 알림 전송 실패:", error);
      return null;
    }
  });

/* ---------------------------------------------------------------------
   금 교환 요청 상태 업데이트 시 (예: "교환중") 알림 전송 함수
   관리자가 "접수" 버튼을 눌러 상태를 "교환중"으로 변경할 때 실행
----------------------------------------------------------------------- */
exports.sendExchangeInProgressNotification = functions.firestore
  .document("goldExchanges/{exchangeId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // 상태가 변경되어 "교환중"이 되었을 때만 알림 전송
    if (beforeData.status !== "교환중" && afterData.status === "교환중") {
      const userId = afterData.userId;
      if (!userId) {
        console.log("교환 요청 문서에 userId가 없습니다.");
        return null;
      }
      // 사용자 문서에서 FCM 토큰 조회
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        console.log(`사용자 ${userId} 문서가 존재하지 않습니다.`);
        return null;
      }
      const userData = userDoc.data();
      const token = userData.fcmToken;
      if (!token) {
        console.log(`사용자 ${userId}의 FCM 토큰이 등록되어 있지 않습니다.`);
        return null;
      }
      const payload = {
        notification: {
          title: "교환 요청 접수됨",
          body: "관리자가 귀하의 금 교환 요청을 접수하였습니다. 현재 교환 진행 중입니다.",
        },
        data: {
          exchangeId: context.params.exchangeId,
        },
      };
      try {
        const response = await admin.messaging().sendToDevice(token, payload);
        console.log("교환 진행 알림 전송 성공:", response);
      } catch (error) {
        console.error("교환 진행 알림 전송 실패:", error);
      }
    }
    return null;
  });
