// src/components/chat/ChatList.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import styled from "styled-components";
import { useAuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, orderBy, onSnapshot, doc, getDoc, runTransaction,
  serverTimestamp, setDoc, updateDoc, deleteDoc, deleteField
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import ContentLoader from "react-content-loader";

const Container = styled.div` padding: 20px; max-width: 800px; margin: 0 auto; `;
const Heading = styled.h2` font-size: 1.8em; text-align: center; margin-bottom: 12px; `;

/* ───── 필터 탭 UI ───── */
const FilterBar = styled.div`
  display: flex; gap: 8px; justify-content: center; align-items: center;
  margin: 8px 0 18px;
  flex-wrap: wrap;
`;
const FilterBtn = styled.button`
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 999px; cursor: pointer; font-weight: 700;
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#eff6ff" : "#fff")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#111827")};
  transition: background .15s, border-color .15s, color .15s;
  &:hover { background: ${({ $active }) => ($active ? "#dbeafe" : "#f9fafb")}; }
`;
const CountPill = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px; padding: 0 8px;
  font-size: 12px; font-weight: 800; border-radius: 999px;
  background: #111827; color: #fff;
`;

const ChatItem = styled.div`
  padding: 12px;
  background: ${({ $highlight }) => ($highlight ? "#f0f8ff" : "#fff")};
  border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; transition: background .2s;
  &:hover { background: #f8f8f8; }
`;

const ChatMain = styled.div` display: flex; flex-direction: column; gap: 4px; `;

const RightWrap = styled.div`
  display: flex; align-items: center; gap: 10px; position: relative;
`;

/* ─────────── Special Big Avatar ─────────── */
const BigAvatarWrap = styled.div`
  position: relative;
  width: 48px; height: 48px;
  border-radius: 9999px;
  display: grid; place-items: center;
  flex: 0 0 48px;

  &::before {
    content: "";
    position: absolute; inset: -2px;
    border-radius: inherit;
    background: conic-gradient(from 180deg at 50% 50%, #60a5fa, #a78bfa, #f472b6, #60a5fa);
    z-index: 0;
  }
  &::after {
    content: "";
    position: absolute; inset: 2px;
    border-radius: inherit;
    background: #fff;
    z-index: 0;
  }

  filter: ${({ $dim }) => ($dim ? "grayscale(0.9) opacity(0.7)" : "none")};
`;

const BigAvatarImg = styled.img`
  position: relative; z-index: 1;
  width: 40px; height: 40px; border-radius: 9999px; object-fit: cover;
`;

const BigAvatarFallback = styled.div`
  position: relative; z-index: 1;
  width: 40px; height: 40px; border-radius: 9999px;
  background: #e5e7eb; color: #374151; display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 14px;
`;

const Chip = styled.span`
  padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700;
  background: ${({ $type }) => ($type === "blocked" ? "#fee2e2" : "#e5e7eb")};
  color: ${({ $type }) => ($type === "blocked" ? "#b91c1c" : "#374151")};
`;

const UnreadBadge = styled.div`
  background: #e53935; color: #fff; padding: 4px 8px; border-radius: 12px;
  font-size: .8em; font-weight: 700; min-width: 24px; text-align: center;
  visibility: ${({ $hidden }) => ($hidden ? "hidden" : "visible")};
`;

const MenuBtn = styled.button`
  border: 1px solid #e5e7eb; background: #fff; padding: 6px 10px; border-radius: 10px; cursor: pointer; font-weight: 600;
  &:hover { background: #f9fafb; }
`;
const Popover = styled.div`
  position: absolute; top: 42px; right: 0; z-index: 10; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 6px; min-width: 160px;
`;
const MenuItem = styled.button`
  width: 100%; text-align: left; border: 0; background: transparent; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-weight: 600;
  color: ${({ $danger }) => ($danger ? "#e11d48" : "#111")};
  &:hover { background: #f8f9fa; }
`;

const LoadingText = styled.p` text-align: center; `;
const ErrorText = styled.p` text-align: center; color: red; `;

/* utils */
function tsToDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
  return null;
}
function toSafeUnread(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default function ChatList() {
  const { user } = useAuthContext();
  const uid = user?.uid;
  const [roomsRaw, setRoomsRaw] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [working, setWorking] = useState(null);
  const [filterMode, setFilterMode] = useState("all"); // all | hidden | blocked

  // 메뉴 컨테이너 ref
  const openMenuContainerRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", uid),
      orderBy("lastUpdated", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRoomsRaw(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("채팅방 불러오기 오류:", err);
      setError("채팅 목록을 불러오는 중 문제가 발생했습니다.");
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!roomsRaw.length || !uid) { setRooms([]); return; }
    (async () => {
      const enriched = await Promise.all(roomsRaw.map(async (room) => {
        const participants = Array.isArray(room.participants) ? room.participants : [];
        const otherId = participants.find((id) => id && id !== uid) || null;
        let profile = null;
        let blocked = false;

        if (otherId) {
          try {
            const snap = await getDoc(doc(db, "profiles", otherId));
            if (snap.exists()) {
              const p = snap.data() || {};
              profile = {
                uid: otherId,
                displayName: p.nickname || p.displayName || (typeof p.email === "string" ? p.email.split("@")[0] : "사용자"),
                photoURL: p.profileImage || p.photoURL || "",
              };
            }
          } catch (e) { console.warn("[ChatList] profile read failed:", e?.code || e); }

          try {
            const blk = await getDoc(doc(db, "users", uid, "blocks", otherId));
            blocked = blk.exists() || !!room?.blockedBy?.[uid];
          } catch { blocked = !!room?.blockedBy?.[uid]; }
        }
        return { ...room, participantProfiles: profile ? [profile] : [], otherId, __blocked: blocked };
      }));
      setRooms(enriched);
    })();
  }, [roomsRaw, uid]);

  // 메뉴: 바깥 클릭/ESC 닫기
  useEffect(() => {
    if (!menuOpenId) return;
    const onDown = (e) => {
      const el = openMenuContainerRef.current;
      if (!el) return setMenuOpenId(null);
      if (!el.contains(e.target)) setMenuOpenId(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpenId(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);

  const onClick = async (room) => {
    if (!room?.id) return;
    if (room?.left?.[uid]) {
      alert("이미 나간 채팅방입니다.");
      return;
    }
    if (room.__blocked) {
      alert("차단한 상대의 채팅입니다. 차단 해제 후 이용해 주세요.");
      return;
    }
    try {
      await runTransaction(db, async (tx) => {
        const chatRef = doc(db, "chats", room.id);
        const snap = await tx.get(chatRef);
        if (!snap.exists()) throw new Error("채팅방이 없습니다.");
        tx.update(chatRef, {
          [`unreadCount.${uid}`]: 0,
          [`lastSeenAt.${uid}`]: serverTimestamp()
        });
        if (snap.data()?.hidden?.[uid]) {
          tx.update(chatRef, {
            [`hidden.${uid}`]: deleteField(),
            [`hiddenAt.${uid}`]: serverTimestamp()
          });
        }
      });
    } catch (e) {
      console.error("읽음 처리 실패(runTransaction):", e);
    }
    navigate(`/chat/${room.id}`);
  };

  /* Actions */
  const leaveRoom = async (chatId) => {
    if (!uid) return;
    const ok = window.confirm("이 채팅방을 나가시겠어요? 나가면 목록에서 사라집니다.");
    if (!ok) return;
    setWorking(chatId);
    try {
      // ✅ participants/participantsMap 수정 금지! 내 uid 서브키만 업데이트
      await updateDoc(doc(db, "chats", chatId), {
        [`left.${uid}`]: true,
        [`leftAt.${uid}`]: serverTimestamp(),
        [`unreadCount.${uid}`]: 0,
        [`lastSeenAt.${uid}`]: serverTimestamp(),
        status: "closed",
        lastUpdated: serverTimestamp(),
      });
      setMenuOpenId(null);
    } catch (e) {
      console.error("채팅방 나가기 실패:", e);
      alert(`채팅방 나가기에 실패했습니다: ${e?.message || e}`);
    } finally {
      setWorking(null);
    }
  };

  const hideRoom = async (chatId) => {
    if (!uid) return;
    setWorking(chatId);
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`hidden.${uid}`]: true,
        [`hiddenAt.${uid}`]: serverTimestamp(),
      });
      setMenuOpenId(null);
    } catch (e) {
      console.error("숨김 실패:", e);
      alert(`숨김 처리 실패: ${e?.message || e}`);
    } finally {
      setWorking(null);
    }
  };

  const unhideRoom = async (chatId) => {
    if (!uid) return;
    setWorking(chatId);
    try {
      // 우선 삭제 시도
      await updateDoc(doc(db, "chats", chatId), {
        [`hidden.${uid}`]: deleteField(),
        [`hiddenAt.${uid}`]: serverTimestamp(),
      });
    } catch (e) {
      // 규칙에서 delete가 금지된 경우 false로 폴백
      if (e?.code === "permission-denied") {
        try {
          await updateDoc(doc(db, "chats", chatId), {
            [`hidden.${uid}`]: false,
            [`hiddenAt.${uid}`]: serverTimestamp(),
          });
        } catch (e2) {
          console.error("숨김 해제(폴백) 실패:", e2);
          alert(`숨김 해제 실패: ${e2?.message || e2}`);
        }
      } else {
        console.error("숨김 해제 실패:", e);
        alert(`숨김 해제 실패: ${e?.message || e}`);
      }
    } finally {
      setMenuOpenId(null);
      setWorking(null);
    }
  };

  const blockUser = async (otherUid, chatId) => {
    if (!uid || !otherUid) return;
    const ok = window.confirm("이 사용자를 차단하시겠어요? 서로 메시지를 보낼 수 없어요.");
    if (!ok) return;
    setWorking(chatId);
    try {
      await setDoc(doc(db, "users", uid, "blocks", otherUid), { blockedAt: serverTimestamp() }, { merge: true });
      await updateDoc(doc(db, "chats", chatId), { [`blockedBy.${uid}`]: true });
      setMenuOpenId(null);
    } catch (e) {
      console.error("차단 실패:", e);
      alert(`차단 실패: ${e?.message || e}`);
    } finally {
      setWorking(null);
    }
  };

  const unblockUser = async (otherUid, chatId) => {
    if (!uid || !otherUid) return;
    setWorking(chatId);
    try {
      await deleteDoc(doc(db, "users", uid, "blocks", otherUid));
      await updateDoc(doc(db, "chats", chatId), { [`blockedBy.${uid}`]: deleteField() });
      setMenuOpenId(null);
    } catch (e) {
      console.error("차단 해제 실패:", e);
      alert(`차단 해제 실패: ${e?.message || e}`);
    } finally {
      setWorking(null);
    }
  };

  /* ───── 필터 계산 ───── */
  const isHiddenRoom  = (room) => !!room?.hidden?.[uid];
  const isBlockedRoom = (room) => !!room?.__blocked || !!room?.blockedBy?.[uid];
  const isLeftRoom    = (room) => !!room?.left?.[uid];

  // 전체 탭: 숨김+미읽음0은 제외, 그리고 "나간 방"은 무조건 제외
  const allRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (isLeftRoom(room)) return false;
      const unread = Math.max(0, toSafeUnread(room?.unreadCount?.[uid]));
      const hidden = isHiddenRoom(room);
      return !(hidden && unread === 0);
    });
  }, [rooms, uid]);

  // 숨김/차단 탭도 "나간 방"은 표시하지 않음
  const hiddenRooms  = useMemo(() => rooms.filter((r) => isHiddenRoom(r) && !isLeftRoom(r)), [rooms, uid]);
  const blockedRooms = useMemo(() => rooms.filter((r) => isBlockedRoom(r) && !isLeftRoom(r)), [rooms, uid]);

  const listForView = filterMode === "hidden"
    ? hiddenRooms
    : filterMode === "blocked"
      ? blockedRooms
      : allRooms;

  const countAll = allRooms.length;
  const countHidden = hiddenRooms.length;
  const countBlocked = blockedRooms.length;

  if (!uid) return <Container><LoadingText>로그인이 필요합니다.</LoadingText></Container>;
  if (loading) return <Container><ContentLoader height={60} width={400} /></Container>;
  if (error) return <Container><ErrorText>{error}</ErrorText></Container>;

  return (
    <Container>
      <Heading>채팅 목록</Heading>

      <FilterBar role="tablist" aria-label="채팅 필터">
        <FilterBtn role="tab" aria-selected={filterMode === "all"} $active={filterMode === "all"} onClick={() => setFilterMode("all")}>
          전체 <CountPill aria-label={`전체 ${countAll}개`}>{countAll}</CountPill>
        </FilterBtn>
        <FilterBtn role="tab" aria-selected={filterMode === "hidden"} $active={filterMode === "hidden"} onClick={() => setFilterMode("hidden")} title="숨김한 채팅방 목록">
          숨김 <CountPill aria-label={`숨김 ${countHidden}개`}>{countHidden}</CountPill>
        </FilterBtn>
        <FilterBtn role="tab" aria-selected={filterMode === "blocked"} $active={filterMode === "blocked"} onClick={() => setFilterMode("blocked")} title="차단 중인 채팅방 목록">
          차단 <CountPill aria-label={`차단 ${countBlocked}개`}>{countBlocked}</CountPill>
        </FilterBtn>
      </FilterBar>

      {listForView.length === 0 ? (
        <LoadingText>
          {filterMode === "hidden" ? "숨김한 채팅방이 없습니다."
            : filterMode === "blocked" ? "차단한 채팅방이 없습니다."
            : "채팅방이 없습니다."}
        </LoadingText>
      ) : (
        listForView.map((room) => {
          const unread = Math.max(0, toSafeUnread(room?.unreadCount?.[uid]));
          const baseTs = room.lastMessageAt || room.lastUpdated;
          const lastDate = tsToDate(baseTs);
          const time = lastDate ? formatDistanceToNow(lastDate, { addSuffix: true, locale: ko }) : "N/A";
          const names = (room.participantProfiles || []).map((p) => p.displayName || p.uid);
          const unreadLabel = unread > 99 ? "99+" : String(unread);
          const hiddenMine = isHiddenRoom(room);
          const blocked = isBlockedRoom(room);
          const p = (room.participantProfiles || [])[0];

          return (
            <ChatItem key={room.id} onClick={() => onClick(room)} $highlight={unread > 0 && !blocked} role="button" aria-label={`${names.join(", ")} 채팅방 열기`}>
              <ChatMain>
                <p>
                  참여자: {names.length ? names.join(", ") : "알 수 없음"}{" "}
                  {hiddenMine && <Chip>숨김</Chip>} {blocked && <Chip $type="blocked">차단중</Chip>}
                </p>
                <p>최근: {room.lastMessage || "없음"}</p>
                <p>{time}</p>
              </ChatMain>

              <RightWrap
                ref={menuOpenId === room.id ? openMenuContainerRef : null}
                onClick={(e) => e.stopPropagation()}
              >
                <BigAvatarWrap $dim={blocked || hiddenMine}>
                  {p?.photoURL ? (
                    <BigAvatarImg src={p.photoURL} alt={p?.displayName || "프로필"} loading="lazy" />
                  ) : (
                    <BigAvatarFallback aria-label="기본 아바타">
                      {(p?.displayName || p?.uid || "?").toString().slice(0, 1).toUpperCase()}
                    </BigAvatarFallback>
                  )}
                </BigAvatarWrap>

                <UnreadBadge $hidden={unread <= 0} aria-live="polite">{unreadLabel}</UnreadBadge>

                <MenuBtn
                  onClick={() => setMenuOpenId(menuOpenId === room.id ? null : room.id)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpenId === room.id}
                  aria-label="채팅 옵션 열기"
                  title="채팅 옵션"
                >
                  ⋯
                </MenuBtn>

                {menuOpenId === room.id && (
                  <Popover role="menu" aria-label="채팅 옵션">
                    {hiddenMine ? (
                      <MenuItem onClick={() => unhideRoom(room.id)} disabled={working === room.id}>
                        숨김 해제
                      </MenuItem>
                    ) : (
                      <MenuItem onClick={() => hideRoom(room.id)} disabled={working === room.id}>
                        숨김
                      </MenuItem>
                    )}

                    {blocked ? (
                      <MenuItem onClick={() => unblockUser(room.otherId, room.id)} disabled={working === room.id}>
                        차단 해제
                      </MenuItem>
                    ) : (
                      <MenuItem onClick={() => blockUser(room.otherId, room.id)} disabled={working === room.id}>
                        차단
                      </MenuItem>
                    )}

                    <MenuItem $danger onClick={() => leaveRoom(room.id)} disabled={working === room.id}>
                      {working === room.id ? "처리 중..." : "나가기"}
                    </MenuItem>
                  </Popover>
                )}
              </RightWrap>
            </ChatItem>
          );
        })
      )}
    </Container>
  );
}
