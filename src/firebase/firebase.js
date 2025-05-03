// src/firebase/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getMessaging,
  getToken,
  onMessage,
} from 'firebase/messaging';
import firebaseConfig from './firebaseConfig';

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Public VAPID Key for Web Push (Firebase Console → Cloud Messaging → Web Setup)
const VAPID_KEY = 'BF9GOXApES0_7Qee6N4y7cu5s4hLwvYlAgOEpKnxPTqr7v-_W7izJjlf3xJfv10oh0El5FcqWqvAXfd5d00f8CM';

/**
 * Register for push notifications:
 * 1) Check/ask Notification.permission
 * 2) Obtain FCM token via Service Worker
 * 3) Save to users/{uid}.fcmTokens array
 */
export async function registerForPush(uid) {
  try {
    // If already denied, bail out
    if (Notification.permission === 'denied') {
      console.warn('🔕 알림 권한이 차단된 상태입니다. 브라우저 설정을 확인하세요.');
      return null;
    }

    // If not asked yet, request permission
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('🚫 푸시 알림 권한이 거부되었습니다.');
        return null;
      }
    }

    // Permission is 'granted'
    // Wait for service worker registration to be ready
    const registration = await navigator.serviceWorker.ready;
    // Obtain token with serviceWorkerRegistration option
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      console.error('FCM 토큰을 가져오지 못했습니다.');
      return null;
    }

    // Save token to Firestore
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      { fcmTokens: arrayUnion(token) },
      { merge: true }
    );

    console.log('✅ FCM 토큰 등록 완료:', token);
    return token;
  } catch (err) {
    console.error('❌ FCM 등록 중 오류:', err);
    return null;
  }
}

/**
 * Subscribe to foreground push messages.
 * Returns an unsubscribe function to detach listener.
 * @param {(payload: firebase.messaging.MessagePayload) => void} callback
 */
export function onPushMessage(callback) {
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('🔔 포그라운드 알림 도착:', payload);
    callback(payload);
  });
  return unsubscribe;
}
