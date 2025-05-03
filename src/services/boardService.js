// src/services/boardService.js
import { db } from "../firebase/firebase";
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
} from "firebase/firestore";

const boardCollection = collection(db, "board");

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
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`Error fetching ${category || "all"} posts:`, error);
    throw error;
  }
};

/**
 * 전체 게시글(공지+문의)을 최신 순으로 가져옵니다.
 */
export const fetchPosts = () => fetchPostsByCategory(null);

/**
 * 공지사항(category === "notice")만 최신 순으로 가져옵니다.
 */
export const fetchNotices = () => fetchPostsByCategory("notice");

/**
 * 문의글(category === "inquiry")만 최신 순으로 가져옵니다.
 */
export const fetchInquiries = () => fetchPostsByCategory("inquiry");

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

/**
 * 새 게시글을 생성합니다.
 * @param {{ title:string, content:string, category:string, authorId:string }} post
 */
export const createPost = async ({ title, content, category, authorId }) => {
  try {
    const data = {
      title,
      content,
      category,       // "notice" 또는 "inquiry"
      authorId,
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
