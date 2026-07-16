// src/components/chat/ChatRoom.jsx
import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import {
  subscribeToMessages,
  sendMessage,
  sendImageMessage,
  setTyping,
  subscribeTyping,
  registerFcmToken,
} from "../../services/chatService";
import {
  doc,
  getDoc,
  writeBatch,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { callmarkChatAsRead } from "../../firebase/firebase";
import ContentLoader from "react-content-loader";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ensureFcmRegistration } from "../../firebase/fcmClient";
import Loader from "../common/Loader";

/* ─────────── 레이아웃 ─────────── */
const Page = styled.div`
  height: 100dvh;
  height: var(--app-vh, 100dvh);
  @supports not (height: 100dvh) {
    height: var(--app-vh, 100vh);
  }

  width: 100%;
  background: #fff;

  display: grid;
  grid-template-rows: auto auto auto 1fr auto; /* 헤더 / 타이핑 / 상품바 / 메시지 / 입력창 */
  overflow: hidden;

  overscroll-behavior: contain;
  padding-bottom: 0;
`;

const HeaderBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  color: ${({ theme }) => theme.colors?.primary || "#111"};
  font-weight: 600;
`;

const BackBtn = styled.button`
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
`;

const TypingHint = styled.div`
  padding: 4px 12px;
  font-size: 0.85rem;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
`;

const ProductBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  &:hover { background: #f5f5f5; }
`;

const ProductImage = styled.img`
  width: 60px; height: 60px; object-fit: cover; border-radius: 6px;
`;
const ProductMeta = styled.div` display: flex; flex-direction: column; `;
const ProductTitle = styled.span` font-weight: 600; font-size: 0.95rem; `;
const ProductPrice = styled.span` color: #666; font-size: 0.85rem; `;

/* 메시지 영역 */
const MessagesWrapper = styled.div`
  overflow-y: auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;

  padding-top: calc(8px + var(--messages-top-gap, 40px));
  padding-left: 12px;
  padding-right: 12px;

  padding-bottom: calc(
    var(--composer-h, 72px) + env(safe-area-inset-bottom) + var(--bottom-extra, 72px) + 8px
  );

  scroll-padding-bottom: calc(
    var(--composer-h, 72px) + var(--bottom-extra, 72px) + 12px
  );

  background: #fafafa;

  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Bubble = styled.div`
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 16px;
  background: ${({ $own }) => ($own ? "#111" : "#fff")};
  color: ${({ $own }) => ($own ? "#fff" : "#111")};
  align-self: ${({ $own }) => ($own ? "flex-end" : "flex-start")};
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
`;

const Sender = styled.span`
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
`;

const Time = styled.span`
  font-size: 0.72rem;
  color: #999;
  margin-left: 6px;
`;

const ReadMark = styled.span`
  display: block;
  text-align: right;
  font-size: 0.72rem;
  color: #999;
  margin-top: 4px;
`;

/* ✅ 입력창: + / 텍스트 / 전송 + 2행 미리보기 */
const Composer = styled.form`
  position: sticky;
  bottom: 0;
  z-index: 3;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  padding: 8px 10px;
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--bottom-extra, 72px));

  display: grid;
  grid-template-columns: auto 1fr auto;  /* + 버튼 / 텍스트 / 전송 */
  grid-template-rows: auto auto;         /* 1: 본행, 2: 첨부 미리보기 */
  gap: 8px 8px;
`;

const PlusButton = styled.button`
  grid-column: 1 / span 1;
  align-self: start;
  width: 40px; height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #d1d5db;
  font-weight: 700; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  &:hover { background: #f8f9fa; }
`;

const Textarea = styled.textarea`
  grid-column: 2 / span 1;
  min-height: 40px; max-height: 140px; resize: none;
  padding: 10px 12px;
  border: 1px solid #d1d5db; border-radius: 12px;
  font-size: 0.95rem; outline: none;
  &:focus { border-color: #111; }
`;

const SendButton = styled.button`
  grid-column: 3 / span 1;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid #111;
  background: #111;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  height: 40px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

/* 2행 미리보기 그리드 */
const PreviewGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
`;

const PreviewItem = styled.div`
  position: relative;
  height: 88px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  display: grid;
  place-items: center;

  img, video {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }

  button.remove {
    position: absolute; top: 6px; right: 6px;
    width: 26px; height: 26px; border-radius: 50%;
    background: rgba(255,255,255,0.95);
    border: 1px solid #e5e7eb; cursor: pointer; font-weight: 700;
  }

  .filename {
    font-size: 12px; padding: 4px 6px; text-align: center; color: #333;
  }
`;

/* 숨김 파일 인풋들 */
const HiddenInput = styled.input`
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); border: 0;
`;

/* ➕ 팝오버 */
const AttachPopover = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 10px;
  z-index: 4;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  padding: 8px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  min-width: 220px;
`;
const AttachItem = styled.button`
  display: flex; align-items: center; gap: 10px;
  border: none; background: transparent; cursor: pointer;
  border-radius: 10px; padding: 10px; text-align: left;
  &:hover { background: #f8f9fa; }
  & > span:first-child {
    width: 28px; height: 28px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px; border: 1px solid #e5e7eb; font-weight: 700;
  }
`;

const LoaderWrap = styled.div` padding: 32px; text-align: center; `;
const EmptyText  = styled.p` color: #666; text-align: center; `;
const ErrorText  = styled.p` color: red; text-align: center; margin: 8px 0; `;

/* Modal */
const ModalOverlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 2000;
`;
const ModalContent = styled.div` position: relative; `;
const ModalImg = styled.img`
  max-width: 92vw; max-height: 92vh; width: auto; height: auto;
  object-fit: contain; border-radius: 8px; cursor: zoom-out;
`;
const CloseButton = styled.button`
  position: absolute; top: -10px; right: -10px; width: 32px; height: 32px; border-radius: 50%;
  border: none; background: #fff; cursor: pointer; font-weight: 700;
`;

/* util */
const toDate = (ts) =>
  typeof ts?.toDate === "function" ? ts.toDate()
  : ts?.seconds ? new Date(ts.seconds * 1000)
  : null;

export default function ChatRoom() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");                 // 캡션/텍스트
  const [attachments, setAttachments] = useState([]);   // [{file, url, kind: 'image'|'video'|'file'}]

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [otherNickname, setOtherNickname] = useState("");
  const [otherUid, setOtherUid] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);

  const [attachOpen, setAttachOpen] = useState(false);

  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const viewportCleanupRef = useRef(null);
  const composerRef = useRef(null);

  // 숨김 파일 인풋 refs (카메라/라이브러리만)
  const libraryInputRef = useRef(null);
  const cameraInputRef  = useRef(null);

  /* body class + 네비 숨김(메시지 공간 극대화) */
  useEffect(() => {
    document.body.classList.add("chat-mode");
    document.body.setAttribute("data-hide-bottom-nav", "1");
    document.body.setAttribute("data-hide-top-nav", "1");
    return () => {
      document.body.classList.remove("chat-mode");
      document.body.removeAttribute("data-hide-bottom-nav");
      document.body.removeAttribute("data-hide-top-nav");
    };
  }, []);

  /* 동적 뷰포트 + 하단 여유 + 바디 스크롤 잠금 */
  useEffect(() => {
    const root = document.documentElement;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const apply = () => {
      const vv = window.visualViewport;
      const h = vv?.height || window.innerHeight;
      root.style.setProperty("--app-vh", `${h}px`);
      root.style.setProperty("--messages-top-gap", "40px");
      root.style.setProperty("--bottom-extra", isMobile ? "96px" : "72px");
    };
    apply();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (window.visualViewport) {
      const vv = window.visualViewport;
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
      viewportCleanupRef.current = () => {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      };
    } else {
      window.addEventListener("resize", apply);
      viewportCleanupRef.current = () => {
        window.removeEventListener("resize", apply);
      };
    }

    return () => {
      viewportCleanupRef.current?.();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  /* 컴포저 실제 높이 -> CSS 변수 */
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const setH = () => root.style.setProperty("--composer-h", `${el.offsetHeight}px`);
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    const onResize = () => setH();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [text, attachments.length, attachOpen]);

  /* 끝단 스크롤 */
  const forceScrollBottom = (retries = 2) => {
    const list = listRef.current;
    const bottom = bottomRef.current;
    if (!list || !bottom) return;
    list.scrollTop = list.scrollHeight;
    bottom.scrollIntoView({ block: "end", inline: "nearest" });
    if (retries > 0) {
      requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight;
        bottom.scrollIntoView({ block: "end", inline: "nearest" });
        setTimeout(() => forceScrollBottom(retries - 1), 60);
      });
    }
  };

  /* ✅ 이 방을 보고 있다는 전역 플래그: FCM 토스트 억제용 */
  useEffect(() => {
    if (!chatId) return;
    window.__activeChatId = String(chatId);
    return () => {
      if (window.__activeChatId === String(chatId)) {
        delete window.__activeChatId;
      }
    };
  }, [chatId]);

  /* FCM 등록 */
  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      try {
        const token = await ensureFcmRegistration();
        if (token) await registerFcmToken(user.uid, token);
      } catch {}
    })();
  }, [user?.uid]);

  /* ESC로 모달/팝오버 닫기 */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setModalImage(null); setAttachOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* 상품/상대 정보 */
  useEffect(() => {
    if (!chatId) return;
    (async () => {
      try {
        const chatSnap = await getDoc(doc(db, "chats", chatId));
        if (chatSnap.exists()) {
          const pid = chatSnap.data().productId;
          if (pid) {
            const prodSnap = await getDoc(doc(db, "products", pid));
            if (prodSnap.exists()) setProduct({ id: prodSnap.id, ...prodSnap.data() });
          }
        }
      } catch {}
    })();
  }, [chatId]);

  useEffect(() => {
    if (!user?.uid || !chatId) return;
    (async () => {
      try {
        const chatSnap = await getDoc(doc(db, "chats", chatId));
        if (!chatSnap.exists()) return;
        const participants = chatSnap.data().participants || [];
        const ou = participants.find((u) => u !== user.uid);
        if (!ou) return;
        setOtherUid(ou);
        const profSnap = await getDoc(doc(db, "profiles", ou));
        if (profSnap.exists()) {
          const p = profSnap.data() || {};
          setOtherNickname(p.nickname || p.displayName || (typeof p.email === "string" ? p.email.split("@")[0] : ou));
        } else {
          setOtherNickname(ou);
        }
      } catch { setOtherNickname("사용자"); }
    })();
  }, [chatId, user?.uid]);

  /* 타이핑 구독 */
  useEffect(() => {
    if (!chatId || !otherUid) return;
    return subscribeTyping(chatId, otherUid, setOtherTyping);
  }, [chatId, otherUid]);

  // ✅ SW가 브로드캐스트한 PUSH_MESSAGE가 이 방(chatId)라면 즉시 읽음 동기화
  useEffect(() => {
    const onSwMessage = (e) => {
      const msg = e?.data || {};
      if (msg.type !== "PUSH_MESSAGE") return;
      const d = msg.data || {};
      if (String(d.type) === "chat_message" && String(d.chatId) === String(chatId)) {
        callmarkChatAsRead(chatId)
          .then(() => {
            try { if ("clearAppBadge" in navigator) navigator.clearAppBadge(); } catch {}
            window.dispatchEvent(new Event("APP_PUSH_MESSAGE"));
          })
          .catch(() => {});
      }
    };
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
      return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
    }
  }, [chatId]);

  // ✅ 방 입장/가시성 복귀 시 읽음 처리(쿨다운)
  useEffect(() => {
    if (!chatId || !user?.uid) return;

    let lastCall = 0;
    const COOL_DOWN_MS = 800;

    const markReadSafe = async () => {
      const now = Date.now();
      if (now - lastCall < COOL_DOWN_MS) return;
      lastCall = now;

      try {
        await callmarkChatAsRead(chatId);
      } catch {
        // 폴백: 최소한 chats의 내 카운트는 0으로
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, "chats", chatId), {
            [`unreadCount.${user.uid}`]: 0,
            [`lastSeenAt.${user.uid}`]: serverTimestamp(),
          });
          await batch.commit();
        } catch {}
      }
    };

    // 입장 직후 1회
    markReadSafe();

    // 포커스/가시성 복귀 시에도 처리
    const onFocus = () => markReadSafe();
    const onVisible = () => {
      if (document.visibilityState === "visible") markReadSafe();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [chatId, user?.uid]);

  /* 메시지 구독 + 읽음표시(메시지 readBy는 즉시 반영) */
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    const unsub = subscribeToMessages(
      chatId,
      async (msgs) => {
        setMessages(msgs);
        setLoading(false);
        forceScrollBottom();

        const toMark = msgs.filter((m) => m.sender !== user.uid && !(m.readBy?.includes(user.uid)));
        if (toMark.length) {
          try {
            const batch = writeBatch(db);
            toMark.forEach((m) => {
              batch.update(doc(db, "chats", chatId, "messages", m.id), { readBy: arrayUnion(user.uid) });
            });
            // chats에도 즉시 0 동기화(지연 보완)
            batch.update(doc(db, "chats", chatId), {
              [`unreadCount.${user.uid}`]: 0,
              [`lastSeenAt.${user.uid}`]: serverTimestamp(),
            });
            await batch.commit();
          } catch {}
          try {
            await callmarkChatAsRead(chatId);
            try { if ("clearAppBadge" in navigator) navigator.clearAppBadge(); } catch {}
            window.dispatchEvent(new Event("APP_PUSH_MESSAGE"));
          } catch {}
        }
      },
      () => {
        setError("메시지를 불러올 권한이 없습니다.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [chatId, user?.uid]);

  /* 프리뷰 변화 시에도 최신으로 */
  useEffect(() => { forceScrollBottom(); }, [attachments.length]);

  /* 언마운트: 타이핑 false + 타이머/URL 해제 */
  useEffect(() => {
    return () => {
      if (chatId && user?.uid) setTyping(chatId, user.uid, false);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      // 남아있는 프리뷰 URL 정리
      setAttachments((prev) => {
        prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
        return [];
      });
    };
  }, [chatId, user?.uid]);

  if (authLoading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;

  /* 전송(하나의 버튼): 텍스트만 or 텍스트+첨부 */
  const onSubmit = async (e) => {
    e.preventDefault();
    const caption = text.trim();

    try {
      if (attachments.length > 0) {
        if (caption) await sendMessage(chatId, user.uid, caption);
        for (const a of attachments) {
          await sendImageMessage(chatId, user.uid, a.file);
        }
        setAttachments((prev) => {
          prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
          return [];
        });
        setText("");
        setTyping(chatId, user.uid, false);
        setAttachOpen(false);
        forceScrollBottom();
        return;
      }

      if (caption) {
        await sendMessage(chatId, user.uid, caption);
        setText("");
        setTyping(chatId, user.uid, false);
        setAttachOpen(false);
        forceScrollBottom();
      }
    } catch (e2) {
      console.error(e2);
      setError("메시지 전송에 실패했습니다.");
    }
  };

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const onFocusTextarea = () => {
    setTimeout(() => { forceScrollBottom(); }, 50);
  };

  const onChangeText = (e) => {
    const v = e.target.value;
    setText(v);
    if (!typingTimerRef.current) setTyping(chatId, user.uid, true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(chatId, user.uid, false);
      typingTimerRef.current = null;
    }, 2000);
  };

  /* 파일 선택 → 입력창 2행 미리보기에 쌓기 */
  const handlePickedFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const mapped = files.map((f) => {
      const mime = f.type || "";
      const isImage = mime.startsWith("image/");
      const isVideo = mime.startsWith("video/");
      const url = URL.createObjectURL(f);
      return { file: f, url, kind: isImage ? "image" : isVideo ? "video" : "file" };
    });

    setAttachments((prev) => [...prev, ...mapped]);
    setAttachOpen(false);
    forceScrollBottom();
  };

  const onPickFromLibrary = (e) => { handlePickedFiles(e.target.files); e.target.value = ""; };
  const onPickFromCamera  = (e) => { handlePickedFiles(e.target.files); e.target.value = ""; };

  const removeAttachment = (idx) => {
    setAttachments((prev) => {
      const next = [...prev];
      const [rm] = next.splice(idx, 1);
      if (rm?.url) URL.revokeObjectURL(rm.url);
      return next;
    });
  };
  const clearAllAttachments = () => {
    setAttachments((prev) => { prev.forEach((p) => p.url && URL.revokeObjectURL(p.url)); return []; });
  };

  // ➕ 팝오버 액션 (카메라/사진 선택만)
  const toggleAttach = () => setAttachOpen((v) => !v);
  const openLibrary = () => libraryInputRef.current?.click();
  const openCamera  = () => cameraInputRef.current?.click();

  // 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    if (!attachOpen) return;
    const onClick = (e) => {
      const root = composerRef.current;
      if (root && root.contains(e.target)) return;
      setAttachOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [attachOpen]);

  return (
    <Page>
      {/* 헤더 */}
      <HeaderBar>
        <BackBtn onClick={() => navigate(-1)} aria-label="뒤로 가기">←</BackBtn>
        <span>채팅방: {otherNickname}</span>
      </HeaderBar>

      {/* 타이핑 힌트 */}
      {otherTyping ? <TypingHint aria-live="polite">상대방이 입력 중…</TypingHint> : <div style={{ height: 0 }} />}

      {/* 상품 바 */}
      {product && (
        <ProductBar onClick={() => navigate(`/product/${product.id}`)} role="button" aria-label="상품으로 이동">
          <ProductImage src={product.imageUrls?.[0] || "/placeholder-product.jpg"} alt="" loading="lazy" />
          <ProductMeta>
            <ProductTitle>{product.title}</ProductTitle>
            {typeof product.price === "number" && (
              <ProductPrice>{product.price.toLocaleString()}원</ProductPrice>
            )}
          </ProductMeta>
        </ProductBar>
      )}

      {/* 메세지 목록 */}
      <MessagesWrapper ref={listRef} aria-live="polite">
        {loading ? (
          <LoaderWrap>
            <ContentLoader height={80} width={400} backgroundColor="#f3f3f3" foregroundColor="#ecebeb">
              <rect x="0" y="20" rx="4" ry="4" width="400" height="20" />
              <rect x="0" y="50" rx="4" ry="4" width="350" height="20" />
            </ContentLoader>
          </LoaderWrap>
        ) : messages.length === 0 ? (
          <EmptyText>메시지가 없습니다.</EmptyText>
        ) : (
          messages.map((msg) => {
            const own = msg.sender === user.uid;
            const ts = toDate(msg.timestamp);
            const isReadByOther = !!otherUid && Array.isArray(msg.readBy) && msg.readBy.includes(otherUid);

            return (
              <Bubble key={msg.id} $own={own}>
                <Sender>
                  {own ? "나" : otherNickname}
                  <Time>{ts && formatDistanceToNow(ts, { addSuffix: true, locale: ko })}</Time>
                </Sender>
                {msg.text && <div>{msg.text}</div>}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="이미지"
                    loading="lazy"
                    style={{ maxWidth: 240, borderRadius: 10, cursor: "pointer", marginTop: 6 }}
                    onClick={() => setModalImage(msg.imageUrl)}
                  />
                )}
                {own && <ReadMark>{isReadByOther ? "✓✓ 읽음" : "✓ 전송됨"}</ReadMark>}
              </Bubble>
            );
          })
        )}
        <div ref={bottomRef} />
      </MessagesWrapper>

      {/* 입력창 */}
      <Composer ref={composerRef} onSubmit={onSubmit} aria-label="메시지 입력창">
        {/* + 버튼 & 팝오버 */}
        <div style={{ position: "relative" }}>
          <PlusButton
            type="button"
            aria-haspopup="menu"
            aria-expanded={attachOpen}
            onClick={toggleAttach}
            title="첨부"
          >
            +
          </PlusButton>
          {attachOpen && (
            <AttachPopover role="menu" aria-label="첨부 메뉴">
              <AttachItem type="button" onClick={openLibrary}>
                <span>🖼️</span>
                <div>
                  <div style={{ fontWeight: 600 }}>사진/동영상 선택</div>
                  <small>갤러리에서 선택</small>
                </div>
              </AttachItem>
              <AttachItem type="button" onClick={openCamera}>
                <span>📷</span>
                <div>
                  <div style={{ fontWeight: 600 }}>카메라로 촬영</div>
                  <small>지원 기기</small>
                </div>
              </AttachItem>
            </AttachPopover>
          )}
        </div>

        {/* 텍스트 */}
        <Textarea
          value={text}
          onChange={onChangeText}
          onKeyDown={onKeyDown}
          onFocus={onFocusTextarea}
          placeholder={attachments.length ? "캡션을 입력하세요…" : "메시지 입력..."}
          aria-label="메시지 내용"
        />

        {/* 전송 버튼 */}
        <SendButton type="submit" disabled={!text.trim() && attachments.length === 0} aria-disabled={!text.trim() && attachments.length === 0}>
          전송
        </SendButton>

        {/* 2행: 첨부 미리보기 */}
        {attachments.length > 0 && (
          <>
            <PreviewGrid>
              {attachments.map((a, i) => (
                <PreviewItem key={`${a.url}-${i}`}>
                  {a.kind === "image" ? (
                    <img src={a.url} alt={`첨부 ${i + 1}`} loading="lazy" onClick={() => setModalImage(a.url)} />
                  ) : a.kind === "video" ? (
                    <video src={a.url} controls controlsList="nodownload noplaybackrate" />
                  ) : (
                    <div className="filename" title={a.file.name}>{a.file.name}</div>
                  )}
                  <button type="button" className="remove" onClick={() => removeAttachment(i)} aria-label="첨부 제거">×</button>
                </PreviewItem>
              ))}
            </PreviewGrid>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={clearAllAttachments}
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
              >
                모두 취소
              </button>
            </div>
          </>
        )}

        {/* 숨김 파일 인풋(멀티) - 카메라/라이브러리 */}
        <HiddenInput
          ref={libraryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={onPickFromLibrary}
        />
        <HiddenInput
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          multiple
          onChange={onPickFromCamera}
        />
      </Composer>

      {/* 이미지 모달 */}
      {modalImage && (
        <ModalOverlay onClick={() => setModalImage(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={() => setModalImage(null)} aria-label="닫기">×</CloseButton>
            <ModalImg src={modalImage} alt="확대보기" onClick={() => setModalImage(null)} />
          </ModalContent>
        </ModalOverlay>
      )}

      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Page>
  );
}
