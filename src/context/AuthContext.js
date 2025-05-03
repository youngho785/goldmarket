// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { registerForPush, onPushMessage } from '../firebase/firebase';

const AuthContext = createContext({
  user: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribePush = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // 2) 커스텀 클레임(admin) 확인
        try {
          const tokenResult = await getIdTokenResult(currentUser, true);
          setIsAdmin(!!tokenResult.claims.admin);
        } catch (err) {
          console.error('ID 토큰 조회 실패:', err);
          setIsAdmin(false);
        }

        // 3) FCM 토큰 등록
        registerForPush(currentUser.uid);

        // 4) 포그라운드 메시지 리스너 설정
        unsubscribePush = onPushMessage((payload) => {
          alert(
            `[알림]\n${payload.notification?.title}\n${payload.notification?.body}`
          );
        });
      } else {
        setUser(null);
        setIsAdmin(false);
      }

      // 로그인 상태 확인 후, 항상 로딩 해제
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePush();
    };
  }, []);

  if (loading) {
    return null; // 또는 로딩 스피너 컴포넌트
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
