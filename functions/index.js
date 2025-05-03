// functions/index.js

const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// 글로벌 설정: 서울 리전
setGlobalOptions({ region: "asia-northeast3" });

// Admin SDK 초기화 (projectId 명시)
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || "goldmarket-200a0"
});

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * UID 기준으로 사용자 FCM 토큰 배열 조회
 */
async function getTokensForUser(uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    logger.warn("getTokensForUser: user not found", { uid });
    return [];
  }
  const tokens = snap.data().fcmTokens;
  return Array.isArray(tokens) ? tokens : [];
}

/**
 * 멀티캐스트 전송 및 만료 토큰 자동 정리
 */
async function sendNotificationToUser(uid, payload) {
  const tokens = await getTokensForUser(uid);
  if (!tokens.length) {
    logger.log(`⚠️ 전송 대상 토큰 없음: ${uid}`);
    return;
  }

  // sendAll 형식에 맞춰 메시지 배열 생성
  const messages = tokens.map(token => ({
    token,
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
    ...payload
  }));

  const response = await messaging.sendAll(messages);
  logger.log(`🔔 발송 결과 for ${uid}`, {
    successCount: response.successCount,
    failureCount: response.failureCount
  });

  // 실패한 토큰 정리
  const invalidTokens = response.responses
    .map((res, idx) => res.error ? tokens[idx] : null)
    .filter(Boolean);

  if (invalidTokens.length) {
    await db.collection("users").doc(uid).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
    });
    logger.log(`🚫 제거된 무효 토큰 for ${uid}`, invalidTokens);
  }
}

/**
 * 채팅 메시지 생성 트리거
 */
exports.sendChatNotification = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    logger.log("📨 sendChatNotification 트리거됨", {
      params: event.params,
      data: event.data?.data()
    });

    const { chatId } = event.params;
    const msg = event.data?.data();
    if (!msg) return;

    const chatSnap = await db.collection("chats").doc(chatId).get();
    const raw = chatSnap.data()?.participants;
    logger.log("participants raw:", {
      type: Array.isArray(raw) ? "array" : typeof raw,
      raw
    });

    // 방어 코드: participants 필드가 없으면 중단
    if (!raw) {
      logger.error("sendChatNotification 오류: participants 필드가 없습니다", { chatId });
      return;
    }

    const participants = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
      ? Object.values(raw)
      : [];

    const recipient = participants.find(u => u !== msg.sender);
    if (!recipient) return;

    const payload = {
      notification: {
        title: `새 메시지 from ${msg.senderName || "알수없음"}`,
        body: msg.text ? msg.text.slice(0, 100) : "이미지를 받았습니다."
      },
      data: {
        type: "chat",
        chatId,
        sender: msg.sender
      }
    };

    try {
      await sendNotificationToUser(recipient, payload);
    } catch (error) {
      logger.error("sendChatNotification 오류", {
        chatId,
        error: error.message
      });
    }
  }
);

/**
 * 금 교환 요청 생성 트리거
 */
exports.sendGoldExchangeNotification = onDocumentCreated(
  "goldExchanges/{exchangeId}",
  async (event) => {
    logger.log("📨 sendGoldExchangeNotification 트리거됨", {
      params: event.params,
      data: event.data?.data()
    });
    const { exchangeId } = event.params;
    const data = event.data?.data();
    if (!data?.userId) return;

    const payload = {
      notification: {
        title: "금 교환 요청 접수",
        body: `요청하신 ${data.amount || ""}g 교환이 접수되었습니다.`
      },
      data: {
        type: "exchange_request",
        exchangeId
      }
    };

    try {
      await sendNotificationToUser(data.userId, payload);
    } catch (error) {
      logger.error("sendGoldExchangeNotification 오류", {
        exchangeId,
        error: error.message
      });
    }
  }
);

/**
 * 금 교환 상태 변경 트리거
 */
exports.sendExchangeInProgressNotification = onDocumentUpdated(
  "goldExchanges/{exchangeId}",
  async (event) => {
    logger.log("📨 sendExchangeInProgressNotification 트리거됨", {
      params: event.params,
      before: event.data.before.data(),
      after: event.data.after.data()
    });
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status || after.status !== "교환중") return;

    const payload = {
      notification: {
        title: "교환 진행 알림",
        body: "관리자가 귀하의 금 교환 요청을 접수하였습니다."
      },
      data: {
        type: "exchange_in_progress",
        exchangeId: event.params.exchangeId
      }
    };

    try {
      await sendNotificationToUser(after.userId, payload);
    } catch (error) {
      logger.error("sendExchangeInProgressNotification 오류", {
        exchangeId: event.params.exchangeId,
        error: error.message
      });
    }
  }
);
