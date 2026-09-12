//src/context/NotificationContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuthContext } from "@/context/AuthContext";
import {
  listenToMyNotifications,
  listenUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationService";

const defaultValue = {
  latestNotifications: [],
  unreadNotifications: 0,
  loading: false,
  refresh: () => {},
  markOneRead: async () => {},
  markAllRead: async () => {},
};

export const NotificationContext = createContext(defaultValue);

export function NotificationProvider({ children }) {
  const { user } = useAuthContext();
  const uid = user?.uid || "";
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const latestUnsubRef = useRef(null);
  const unreadUnsubRef = useRef(null);

  const cleanupSubscriptions = useCallback(() => {
    latestUnsubRef.current?.();
    unreadUnsubRef.current?.();
    latestUnsubRef.current = null;
    unreadUnsubRef.current = null;
  }, []);

  const refresh = useCallback(() => {
    setRefreshVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    cleanupSubscriptions();

    if (!uid) {
      setLatestNotifications([]);
      setUnreadNotifications(0);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    latestUnsubRef.current = listenToMyNotifications(
      uid,
      (items) => {
        setLatestNotifications(items);
        setLoading(false);
      },
      20,
      () => setLoading(false)
    );

    unreadUnsubRef.current = listenUnreadCount(
      uid,
      setUnreadNotifications
    );

    return cleanupSubscriptions;
  }, [cleanupSubscriptions, refreshVersion, uid]);

  useEffect(() => {
    const handlePush = () => refresh();
    window.addEventListener("APP_PUSH_MESSAGE", handlePush);
    return () => window.removeEventListener("APP_PUSH_MESSAGE", handlePush);
  }, [refresh]);

  const markOneRead = useCallback(
    async (id) => {
      if (!uid || !id) return;
      setLatestNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true } : item
        )
      );
      setUnreadNotifications((count) => Math.max(0, count - 1));

      try {
        await markNotificationAsRead(id, uid);
      } catch (error) {
        refresh();
        throw error;
      }
    },
    [refresh, uid]
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;

    setLatestNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );
    setUnreadNotifications(0);

    try {
      await markAllNotificationsAsRead(uid);
    } catch (error) {
      refresh();
      throw error;
    }
  }, [refresh, uid]);

  const value = useMemo(
    () => ({
      latestNotifications,
      unreadNotifications,
      loading,
      refresh,
      markOneRead,
      markAllRead,
    }),
    [
      latestNotifications,
      unreadNotifications,
      loading,
      refresh,
      markOneRead,
      markAllRead,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => useContext(NotificationContext);
