// fetchChat.js
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Admin SDK 초기화 (기본 서비스 계정 사용)
initializeApp();

// Firestore 인스턴스
const db = getFirestore();

// 여기에 확인하려는 chatId를 넣으세요:
const chatId = "testchat123";

async function fetch() {
  try {
    const snap = await db.doc(`chats/${chatId}`).get();
    if (!snap.exists) {
      console.error("문서가 존재하지 않습니다:", `chats/${chatId}`);
      return;
    }
    // JSON 형태로 콘솔 출력
    console.log(JSON.stringify(snap.data(), null, 2));
  } catch (e) {
    console.error("에러 발생:", e);
  }
}

fetch();
