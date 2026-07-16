// src/dev/debugChatCounters.js
import { db, auth } from "@/firebase/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

// 전역 붙여서 콘솔에서 바로 씁니다.
window.__scanChatCounters = async function(uid = auth.currentUser?.uid) {
  if (!uid) { console.warn("로그인 필요"); return; }

  const out = { uid, meta: null, threads: [], chats: [] };

  // 1) 요약 메타
  const metaSnap = await getDoc(doc(db, "chatMeta", uid)).catch(() => null);
  out.meta = metaSnap?.exists() ? metaSnap.data() : null;

  // 2) 요약 스레드(내 요약박스)
  const threadsSnap = await getDocs(collection(db, "chatSummaries", uid, "threads")).catch(() => null);
  if (threadsSnap) {
    threadsSnap.forEach(d => {
      const x = d.data() || {};
      const unread = Number(x.unread || 0);
      if (unread > 0) out.threads.push({ threadId: d.id, unread, lastMsg: x.lastMessage || null });
    });
  }

  // 3) 실제 원본 채팅방 중 내 카운트 > 0 인 것
  // participants 배열에 내가 포함 & unreadCount.{uid} > 0 인 방만 슬림 쿼리
  // (복합 인덱스 필요하면 콘솔에 인덱스 링크가 뜰 수 있어요)
  const q = query(collection(db, "chats"), where("participants", "array-contains", uid));
  const chatSnaps = await getDocs(q);
  chatSnaps.forEach(d => {
    const x = d.data() || {};
    const n = Number(x?.unreadCount?.[uid] || 0);
    if (n > 0) {
      out.chats.push({
        chatId: d.id,
        unread: n,
        hidden: !!x?.hidden?.[uid],
        left: !!x?.left?.[uid],
        blocked: !!x?.blockedBy?.[uid],
        lastUpdated: x?.lastUpdated,
        lastMessage: x?.lastMessage || null,
      });
    }
  });

  console.log("— SCAN RESULT —");
  console.table([{ uid, metaUnreadTotal: out.meta?.unreadTotal ?? null, threadsWithUnread: out.threads.length, chatsWithUnread: out.chats.length }]);
  console.log("chatMeta:", out.meta);
  console.log("threads with unread > 0:", out.threads);
  console.log("chats with unread > 0:", out.chats);
  return out;
};
