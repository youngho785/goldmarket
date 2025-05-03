// src/context/NotificationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { registerForPush, onPushMessage } from '../firebase/firebase';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuthContext } from './AuthContext';

// NotificationContext 생성
const NotificationContext = createContext({
  unreadChats: 0,
  clearUnreadChats: () => {}
});

export function NotificationProvider({ children }) {
  const { user } = useAuthContext();
  const [unreadChats, setUnreadChats] = useState(0);
  const db = getFirestore();

  // 1) FCM 토큰 등록 및 서비스 워커 연결
  useEffect(() => {
    if (!user?.uid) return;
    registerForPush(user.uid)
      .then(token => {
        if (token) console.log('✅ FCM 토큰 등록 성공:', token);
      })
      .catch(err => console.error('❌ FCM 토큰 등록 실패:', err));
  }, [user?.uid]);

  // 2) 포그라운드 푸시 알림 수신 시 증가
  useEffect(() => {
    const unsubscribeFCM = onPushMessage(payload => {
      if (payload.data?.type === 'chat') {
        setUnreadChats(count => count + 1);
      }
    });
    return () => unsubscribeFCM();
  }, []);

  // 3) Firestore 채팅방 문서의 unreadCount 구독
  useEffect(() => {
    if (!user?.uid) return;
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribeFS = onSnapshot(q, snapshot => {
      const total = snapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        const count = data.unreadCount?.[user.uid] || 0;
        return sum + count;
      }, 0);
      setUnreadChats(total);
    }, err => {
      console.error('❌ unreadChats 구독 오류:', err);
    });
    return () => unsubscribeFS();
  }, [user?.uid]);

  // 알림 개수 리셋 (UI 상으로만)
  const clearUnreadChats = () => {
    setUnreadChats(0);
  };

  return (
    <NotificationContext.Provider value={{ unreadChats, clearUnreadChats }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => useContext(NotificationContext);
