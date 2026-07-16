//src/pages/NotificationsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuthContext } from "../context/AuthContext";
import { db, callmarkChatAsRead } from "@/firebase/firebase";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

const Wrap = styled.div` padding:20px; `;
const H1 = styled.h1` color: ${({ theme }) => theme.colors.primary}; margin-bottom: 12px; `;
const Toolbar = styled.div` display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap; `;
const Button = styled.button`
  padding:8px 12px; border:1px solid ${({ theme }) => theme.colors.border};
  background:${({ theme }) => theme.colors.surface}; border-radius:6px; cursor:pointer;
`;
const List = styled.ul` list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; `;
const Item = styled.li`
  border:1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $unread, theme }) => ($unread ? theme.colors.background : "#fff")};
  border-radius:8px; padding:12px; cursor:pointer;
`;
const Title = styled.div` font-weight:700; `;
const Body  = styled.div` color:${({ theme }) => theme.colors.textSecondary}; margin-top:4px; `;
const Time  = styled.div` font-size:.85rem; color:#888; margin-top:6px; `;

function fmt(ts) {
  try {
    if (!ts) return "-";
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch { return "-"; }
}

export default function NotificationsPage() {
  const { user } = useAuthContext();
  const uid = user?.uid;
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // 내 알림함 구독
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const colRef = collection(db, `notifications/${uid}/items`);
    const qy = query(colRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(arr);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  const unreadCount = useMemo(
    () => items.reduce((s, n) => s + (n?.read ? 0 : 1), 0),
    [items]
  );

  const openItem = useCallback(
    (n) => {
      if (!uid) return;
      const link   = n?.link ?? n?.data?.link ?? "";
      const type   = n?.type ?? n?.data?.type ?? "";
      const chatId = n?.chatId ?? n?.meta?.chatId ?? n?.data?.chatId ?? null;

      // 1) 네비게이트 먼저
      if (link) nav(link);

      // 2) 읽음/동기화는 백그라운드
      queueMicrotask(async () => {
        try {
          if (!n.read) {
            setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
            await markNotificationAsRead(n.id, uid); // (notificationId, uid)
          }
        } catch {}
        if (type === "chat" && chatId) {
          try { await callmarkChatAsRead(chatId); } catch {}
        }
      });
    },
    [uid, nav]
  );

  const markAll = useCallback(() => {
    if (!uid) return;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    markAllNotificationsAsRead(uid).catch(() => {});
  }, [uid]);

  if (!uid) return <Wrap>로그인이 필요합니다.</Wrap>;
  if (loading) return <Wrap>로딩 중…</Wrap>;

  return (
    <Wrap>
      <H1>알림</H1>

      <Toolbar>
        <div>안 읽은 알림: <strong>{unreadCount}</strong>건</div>
        {unreadCount > 0 && <Button onClick={markAll}>모두 읽음</Button>}
        <Button onClick={() => nav(-1)}>← 돌아가기</Button>
      </Toolbar>

      {items.length === 0 ? (
        <p>알림이 없습니다.</p>
      ) : (
        <List>
          {items.map((n) => (
            <Item key={n.id} $unread={!n.read} onClick={() => openItem(n)}>
              <Title>{n.title || "알림"}</Title>
              {n.body && <Body>{n.body}</Body>}
              <Time>{fmt(n.createdAt)}</Time>
            </Item>
          ))}
        </List>
      )}
    </Wrap>
  );
}
