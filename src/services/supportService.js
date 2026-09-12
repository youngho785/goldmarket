// 금교환 고객지원 전용 Firestore 서비스
import { db, auth } from "../firebase/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";

const tickets = collection(db, "supportTickets");

const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  const [id, domain] = email.split("@");
  if (!id || !domain) return email;
  const head = id.slice(0, Math.min(4, id.length));
  return `${head}${"*".repeat(Math.max(0, id.length - head.length))}@${domain}`;
};

async function getAuthorNickname(authorId) {
  try {
    const userSnap = await getDoc(doc(db, "users", authorId));
    const nickname = String(userSnap.data()?.nickname || "").trim();
    if (nickname) return nickname;
  } catch {
    // 문의 생성 자체는 프로필 조회 실패와 무관하게 계속합니다.
  }
  const current = auth.currentUser;
  return (
    String(current?.displayName || "").trim() ||
    maskEmail(current?.email) ||
    "고객"
  );
}

export async function createPost({ title, content, authorId }) {
  const cleanTitle = String(title || "").trim();
  const cleanContent = String(content || "").trim();
  if (!authorId || !cleanTitle || !cleanContent) {
    throw new Error("문의 제목과 내용을 입력해 주세요.");
  }

  return addDoc(tickets, {
    title: cleanTitle,
    content: cleanContent,
    category: "inquiry",
    authorId,
    authorNickname: await getAuthorNickname(authorId),
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchPostById(postId) {
  const snapshot = await getDoc(doc(db, "supportTickets", postId));
  if (!snapshot.exists()) throw new Error("존재하지 않는 문의입니다.");
  return { id: snapshot.id, ...snapshot.data() };
}

export async function updatePost(postId, { title, content }) {
  const cleanTitle = String(title || "").trim();
  const cleanContent = String(content || "").trim();
  if (!cleanTitle || !cleanContent) throw new Error("제목과 내용을 입력해 주세요.");
  await updateDoc(doc(db, "supportTickets", postId), {
    title: cleanTitle,
    content: cleanContent,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePost(postId) {
  await deleteDoc(doc(db, "supportTickets", postId));
}

export async function answerInquiry(postId, { text, adminId, adminNickname }) {
  const answer = String(text || "").trim();
  if (!answer) throw new Error("답변 내용을 입력해 주세요.");
  await updateDoc(doc(db, "supportTickets", postId), {
    answer,
    answeredBy: {
      uid: adminId,
      nickname: String(adminNickname || "관리자").trim() || "관리자",
    },
    answeredAt: serverTimestamp(),
    status: "answered",
    updatedAt: serverTimestamp(),
  });
}

export async function clearAnswer(postId) {
  await updateDoc(doc(db, "supportTickets", postId), {
    answer: "",
    answeredBy: null,
    answeredAt: null,
    status: "open",
    updatedAt: serverTimestamp(),
  });
}

export async function fetchMyInquiriesPaged({
  uid,
  status = "",
  limit = 20,
  cursor = null,
}) {
  if (!uid) return { items: [], nextCursor: null };

  const constraints = [where("authorId", "==", uid)];
  if (status === "open" || status === "answered") {
    constraints.push(where("status", "==", status));
  }
  constraints.push(orderBy("createdAt", "desc"));

  let request = query(tickets, ...constraints);
  request = cursor
    ? query(request, startAfter(cursor), fbLimit(limit))
    : query(request, fbLimit(limit));

  const snapshot = await getDocs(request);
  return {
    items: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    nextCursor:
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null,
  };
}

export async function fetchInquiriesByStatus({
  status = "all",
  pageSize = 100,
} = {}) {
  const constraints = [];
  if (status === "open" || status === "answered") {
    constraints.push(where("status", "==", status));
  }
  constraints.push(orderBy("createdAt", "desc"), fbLimit(pageSize));
  const snapshot = await getDocs(query(tickets, ...constraints));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}
