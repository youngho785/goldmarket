// src/services/boardService.js
import { db, auth } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  startAfter,
  limit as fbLimit,
} from "firebase/firestore";

/* ─────────────────────────────
 * 공통
 * ───────────────────────────── */
const boardCollection = collection(db, "board");

/** 간단 이메일 마스킹: abcd****@domain */
const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  const [id, domain] = email.split("@");
  if (!id || !domain) return email;
  const head = id.slice(0, Math.min(4, id.length));
  return `${head}${"*".repeat(Math.max(0, id.length - head.length))}@${domain}`;
};

/* ─────────────────────────────
 * 목록 조회 (카테고리별)
 * ───────────────────────────── */
/**
 * 범용 게시글 조회 함수
 * @param {string|null} category - "notice", "inquiry" 또는 null(전체)
 * @returns {Promise<Array<Object>>}
 */
const fetchPostsByCategory = async (category = null) => {
  try {
    const constraints = [];
    if (category) {
      constraints.push(where("category", "==", category));
    }
    constraints.push(orderBy("createdAt", "desc"));
    const q = query(boardCollection, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`Error fetching ${category || "all"} posts:`, error);
    throw error;
  }
};

/** 전체 게시글(공지+문의)을 최신 순으로 */
export const fetchPosts = () => fetchPostsByCategory(null);
/** 공지사항만 최신 순으로 */
export const fetchNotices = () => fetchPostsByCategory("notice");
/** 문의글만 최신 순으로 */
export const fetchInquiries = () => fetchPostsByCategory("inquiry");

/* ─────────────────────────────
 * 단건 조회
 * ───────────────────────────── */
/**
 * 단일 게시글을 ID로 가져옵니다.
 * @param {string} postId
 */
export const fetchPostById = async (postId) => {
  try {
    const ref = doc(db, "board", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("존재하지 않는 글입니다.");
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`Error fetching post ${postId}:`, error);
    throw error;
  }
};

/* ─────────────────────────────
 * 생성/수정/삭제
 * ───────────────────────────── */
/**
 * 새 게시글을 생성합니다.
 * authorNickname 저장 로직:
 *  - users/{uid}.nickname 사용
 *  - 없으면 Auth displayName
 *  - 그래도 없으면 이메일 마스킹
 *  - 최후 폴백 "익명"
 * @param {{ title:string, content:string, category:string, authorId:string }} post
 */
export const createPost = async ({ title, content, category, authorId }) => {
  try {
    let authorNickname = "";

    // 1) users/{uid}.nickname 우선
    try {
      if (authorId) {
        const userRef = doc(db, "users", authorId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          authorNickname = (userSnap.data()?.nickname || "").trim();
        }
      }
    } catch (_) {
      // 닉네임 조회 실패해도 글 생성은 계속
    }

    // 2) 비어있다면 Auth 프로필(displayName) 폴백(공유 인스턴스)
    if (!authorNickname) {
      const cu = auth.currentUser;
      authorNickname =
        (cu?.displayName && cu.displayName.trim()) ||
        (cu?.email ? maskEmail(cu.email) : "") ||
        "익명";
    }

    const data = {
      title,
      content,
      category, // "notice" | "inquiry"
      authorId,
      authorNickname, // 목록/상세에서 바로 사용
      status: category === "inquiry" ? "open" : "published",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return await addDoc(boardCollection, data);
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

/**
 * 게시글을 수정합니다.
 * @param {string} postId
 * @param {{ title:string, content:string, category:string }} updates
 */
export const updatePost = async (postId, { title, content, category }) => {
  try {
    const ref = doc(db, "board", postId);
    await updateDoc(ref, {
      title,
      content,
      category,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating post ${postId}:`, error);
    throw error;
  }
};

/**
 * 게시글을 삭제합니다.
 * @param {string} postId
 */
export const deletePost = async (postId) => {
  try {
    const ref = doc(db, "board", postId);
    await deleteDoc(ref);
  } catch (error) {
    console.error(`Error deleting post ${postId}:`, error);
    throw error;
  }
};

/* ─────────────────────────────
 * 문의 답변 (관리자)
 * ───────────────────────────── */
/**
 * (관리자) 문의글에 답변 등록/수정
 * @param {string} postId
 * @param {{ text:string, adminId:string, adminNickname?:string }} payload
 */
export const answerInquiry = async (postId, { text, adminId, adminNickname }) => {
  try {
    const ref = doc(db, "board", postId);
    await updateDoc(ref, {
      answer: text,
      answeredBy: { uid: adminId, nickname: (adminNickname || "").trim() },
      answeredAt: serverTimestamp(),
      status: "answered",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error answering post ${postId}:`, error);
    throw error;
  }
};

/**
 * (관리자) 문의글 답변 삭제/초기화
 * @param {string} postId
 */
export const clearAnswer = async (postId) => {
  try {
    const ref = doc(db, "board", postId);
    await updateDoc(ref, {
      answer: "",
      answeredBy: null,
      answeredAt: null,
      status: "open",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error clearing answer ${postId}:`, error);
    throw error;
  }
};

/* ─────────────────────────────
 * 내 문의글 조회(탭/페이징)
 * ───────────────────────────── */
/**
 * @param {Object} opt
 * @param {string} opt.uid - 내 uid (필수)
 * @param {'open'|'answered'|''} [opt.status] - 상태 필터 (없으면 전체)
 * @param {number} [opt.limit=20] - 페이지 크기
 * @param {import('firebase/firestore').QueryDocumentSnapshot} [opt.cursor] - startAfter 커서
 * @returns {Promise<{items: Array<Object>, nextCursor: any}>}
 */
export const fetchMyInquiriesPaged = async ({ uid, status = "", limit = 20, cursor = null }) => {
  if (!uid) return { items: [], nextCursor: null };

  // 기본 제약
  const constraints = [where("authorId", "==", uid), where("category", "==", "inquiry")];

  // 상태 필터
  if (status === "open" || status === "answered") {
    constraints.push(where("status", "==", status));
  }

  // 정렬
  constraints.push(orderBy("createdAt", "desc"));

  let q = query(collection(db, "board"), ...constraints);

  // 페이징
  q = cursor ? query(q, startAfter(cursor), fbLimit(limit)) : query(q, fbLimit(limit));

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
};

// 편의 함수
export const fetchMyOpenInquiries = (uid) =>
  fetchMyInquiriesPaged({ uid, status: "open", limit: 50 });
export const fetchMyAnsweredInquiries = (uid) =>
  fetchMyInquiriesPaged({ uid, status: "answered", limit: 50 });


// [ADD] 관리자가 상태별 문의를 빠르게 조회
export async function fetchInquiriesByStatus({ status = "all", pageSize = 100 } = {}) {
  try {
    const base = [ where("category", "==", "inquiry") ];
    if (status !== "all") base.push(where("status", "==", status));
    base.push(orderBy("createdAt", "desc"));

    const q = query(boardCollection, ...base);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // 인덱스 준비 전 우회(임시)
    const needsIndex = err?.code === "failed-precondition" || String(err?.message || "").includes("index");
    if (!needsIndex) throw err;

    // category만으로 가져와 클라이언트 필터/정렬
    const q = query(boardCollection, where("category", "==", "inquiry"));
    const snap = await getDocs(q);
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (status !== "all") items = items.filter(x => x?.status === status);
    items.sort((a, b) => {
      const ta = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const tb = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return tb - ta;
    });
    return items.slice(0, pageSize);
  }
}