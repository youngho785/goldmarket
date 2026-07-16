// src/context/NotificationContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuthContext } from "@/context/AuthContext";
import {
  markNotificationAsRead as markNotificationRead,
  markAllAsReadForUser as markAllUserNotificationsRead,
} from "@/services/notificationService";

/**
 * 서버(onNotificationCreate 등)는 notifications/{uid}/items/{docId}에 생성합니다.
 * → 클라이언트도 동일 경로로 미읽음 집계를 해야 일치합니다.
 * 채팅 미읽음은 chatMeta/{uid}.unreadTotal(요약) → 없으면 chatSummaries/{uid}/threads 합산으로 폴백.
 */

// Provider 미부착이어도 안전한 기본값
const defaultCtx = {
  unreadChats: 0,
  unreadNotifications: 0,
  refresh: () => {},
  markOneRead: async () => {},
  markAllRead: async () => {},
  cleanup: () => {},
};

export const NotificationContext = createContext(defaultCtx);

export function NotificationProvider({ children }) {
  const { user } = useAuthContext();
  const uid = user?.uid;

  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // 외부 트리거용 버전 키
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refresh = () => setRefreshVersion((v) => v + 1);

  // 스냅샷 구독 해제 모음
  const unsubsRef = useRef([]);

  // 값 변화 최소화(같은 값이면 setState 생략) + rAF 스로틀
  const chatsLastRef = useRef(-1);
  const notiLastRef = useRef(-1);
  const chatsRafRef = useRef(0);
  const notiRafRef = useRef(0);

  useEffect(() => {
    // 이전 구독 정리
    unsubsRef.current.forEach((u) => {
      try { typeof u === "function" && u(); } catch {}
    });
    unsubsRef.current = [];

    // 로그아웃 시 상태 초기화
    if (!uid) {
      setUnreadChats(0);
      setUnreadNotifications(0);
      return;
    }

    // ---- 채팅 미읽음 합산 (요약 컬렉션 기반) ----
    // 1) 전체 합계: chatMeta/{uid}.unreadTotal
    const metaRef = doc(db, "chatMeta", uid);

    const subscribeThreadsFallback = () => {
      const threadsCol = collection(db, "chatSummaries", uid, "threads");
      return onSnapshot(
        threadsCol,
        (snap) => {
          let total = 0;
          snap.forEach((d) => {
            const n = Number(d.data()?.unread || 0);
            total += Number.isFinite(n) ? Math.max(0, n) : 0;
          });
          if (total !== chatsLastRef.current) {
            chatsLastRef.current = total;
            cancelAnimationFrame(chatsRafRef.current);
            chatsRafRef.current = requestAnimationFrame(() => setUnreadChats(total));
          }
        },
        (err) => {
          console.warn("[NotificationContext] threads fallback error:", err?.code || err);
        }
      );
    };

    // chatMeta 우선
    const unsubMeta = onSnapshot(
      metaRef,
      (snap) => {
        if (!snap.exists()) {
          // 메타 문서가 아직 없으면 스레드 합산 폴백
          const u = subscribeThreadsFallback();
          unsubsRef.current.push(u);
          return;
        }
        const total = Number(snap.get?.("unreadTotal") || 0) || 0;
        if (total !== chatsLastRef.current) {
          chatsLastRef.current = total;
          cancelAnimationFrame(chatsRafRef.current);
          chatsRafRef.current = requestAnimationFrame(() => setUnreadChats(total));
        }
      },
      (err) => {
        console.warn("[NotificationContext] chatMeta subscribe error:", err?.code || err);
        // 접근/존재 문제 등 에러 시 스레드 합산 폴백
        const u = subscribeThreadsFallback();
        unsubsRef.current.push(u);
      }
    );

    // ---- 일반 알림 미읽음 합산 ----
    // notifications/{uid}/items where read==false
    const qNoti = query(
      collection(db, "notifications", uid, "items"),
      where("read", "==", false)
    );

    const unsubNoti = onSnapshot(
      qNoti,
      (snap) => {
        const unread = snap.size || 0;
        if (unread !== notiLastRef.current) {
          notiLastRef.current = unread;
          cancelAnimationFrame(notiRafRef.current);
          notiRafRef.current = requestAnimationFrame(() => setUnreadNotifications(unread));
        }
      },
      (err) => {
        console.warn("[NotificationContext] notifications subscribe error:", err?.code || err);
      }
    );

    unsubsRef.current.push(unsubMeta, unsubNoti);

    return () => {
      unsubsRef.current.forEach((u) => {
        try { typeof u === "function" && u(); } catch {}
      });
      unsubsRef.current = [];
      cancelAnimationFrame(chatsRafRef.current);
      cancelAnimationFrame(notiRafRef.current);
    };
  }, [uid, refreshVersion]);

  // SW/FCM → 전역 이벤트 수신 → refresh()
  useEffect(() => {
    const onAppPush = () => {
      // 실시간 구독이라도 반영 타이밍이 약간 늦을 수 있어 버전만 bump
      refresh();
    };
    window.addEventListener("APP_PUSH_MESSAGE", onAppPush);
    return () => window.removeEventListener("APP_PUSH_MESSAGE", onAppPush);
  }, []);

  const api = useMemo(
    () => ({
      unreadChats,
      unreadNotifications,
      refresh,

      // 단건 읽음
      markOneRead: async (id) => {
        try {
          await markNotificationRead(id);
          // 실시간 구독으로 반영되지만 UX 보강
          setUnreadNotifications((n) => Math.max(0, n - 1));
        } catch (e) {
          console.error("[NotificationContext] markOneRead failed:", e);
        }
      },

      // 모두 읽음
      markAllRead: async () => {
        if (!uid) return;
        try {
          await markAllUserNotificationsRead(uid);
          setUnreadNotifications(0);
        } catch (e) {
          console.error("[NotificationContext] markAllRead failed:", e);
        }
      },

      // 외부에서 강제 해제
      cleanup: () => {
        unsubsRef.current.forEach((u) => {
          try { typeof u === "function" && u(); } catch {}
        });
        unsubsRef.current = [];
      },
    }),
    [unreadChats, unreadNotifications, uid]
  );

  return (
    <NotificationContext.Provider value={api}>
      {children}
    </NotificationContext.Provider>
  );
}

// Provider가 없어도 기본값 반환(경고/크래시 없음)
export const useNotificationContext = () => useContext(NotificationContext);
