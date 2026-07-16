// src/services/productService.js
import { db, storage } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { compressImages } from "../utils/imageCompression";

/** 고유 키 생성(경로 충돌 방지) */
function nanoid(len = 10) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
  let id = "";
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  array.forEach((n) => (id += chars[n % chars.length]));
  return id;
}

/**
 * (선택) 상품 이미지 업로드 + 압축 + 실패 시 롤백
 * @param {File[]|FileList} files
 * @param {Object} opts
 * @param {string} [opts.ownerUid] - 경로 구분용 사용자 UID(선택)
 * @param {number} [opts.maxW=1600]
 * @param {number} [opts.maxH=1600]
 * @param {number} [opts.targetMaxBytes=1200000] - 목표 용량(≈1.2MB)
 * @param {number} [opts.quality=0.88]
 * @param {string} [opts.preferMime="image/webp"]
 * @param {(p:number)=>void} [opts.onProgress] - 전체 진행률 콜백(0~100)
 * @returns {Promise<string[]>} 업로드된 파일의 다운로드 URL 배열(원본 순서 보존)
 */
export async function uploadProductImages(
  files,
  {
    ownerUid,
    maxW = 1600,
    maxH = 1600,
    targetMaxBytes = 1_200_000,
    quality = 0.88,
    preferMime = "image/webp",
    onProgress,
  } = {}
) {
  const fileArr = Array.from(files || []).filter(Boolean);
  if (!fileArr.length) return [];

  // 1) 사전 압축
  const list = await compressImages(fileArr, {
    maxW,
    maxH,
    targetMaxBytes,
    quality,
    preferMime,
  });

  // 2) 전체 바이트 합계(진행률 계산용)
  const totalBytes = list.reduce((sum, f) => sum + (f.size || 0), 0) || 1;
  let uploadedBytes = 0;

  // 3) 업로드 (실패 시 롤백)
  const urls = new Array(list.length);
  const uploadedRefs = [];
  const tasks = [];

  try {
    await Promise.all(
      list.map(
        (file, i) =>
          new Promise((resolve, reject) => {
            const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
            const key = `${Date.now()}_${i}_${nanoid(6)}`;
            const path = `productImages/${ownerUid || "anonymous"}/${key}.${ext}`;
            const storageRef = ref(storage, path);

            const task = uploadBytesResumable(storageRef, file, {
              contentType: file.type || "application/octet-stream",
              cacheControl: "public,max-age=31536000,immutable",
            });
            tasks.push(task);

            let lastBytes = 0;
            task.on(
              "state_changed",
              (s) => {
                const delta = Math.max(0, s.bytesTransferred - lastBytes);
                lastBytes = s.bytesTransferred;
                uploadedBytes += delta;
                if (onProgress) {
                  onProgress(Math.round((uploadedBytes / totalBytes) * 100));
                }
              },
              (err) => reject(err),
              async () => {
                try {
                  const url = await getDownloadURL(task.snapshot.ref);
                  urls[i] = url; // 순서 보존
                  uploadedRefs.push(task.snapshot.ref);
                  resolve();
                } catch (e) {
                  reject(e);
                }
              }
            );
          })
      )
    );

    return urls;
  } catch (e) {
    // 실패 시 이미 올라간 파일 삭제(롤백)
    await Promise.allSettled(uploadedRefs.map((r) => deleteObject(r)));
    // 현재 진행 중인 업로드 취소
    tasks.forEach((t) => {
      try {
        t.cancel();
      } catch {}
    });
    throw e;
  }
}

/** 상품 생성 */
export const addProduct = async (product) => {
  try {
    const colRef = collection(db, "products");
    const data = {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(colRef, data);
    return docRef;
  } catch (error) {
    console.error("상품 추가 중 오류 발생:", error);
    throw error;
  }
};

/** 상품 단건 조회 보조 */
export const fetchProductById = async (id) => {
  const snap = await getDoc(doc(db, "products", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** 상품 목록 조회 (최신순) */
export const fetchProducts = async () => {
  try {
    const colRef = collection(db, "products");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("상품 조회 중 오류 발생:", error);
    throw error;
  }
};

/**
 * 상품 수정
 * @param {string} productId
 * @param {object} updatedFields
 */
export const updateProduct = async (productId, updatedFields) => {
  try {
    const refDoc = doc(db, "products", productId);
    await updateDoc(refDoc, {
      ...updatedFields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`상품(${productId}) 수정 중 오류 발생:`, error);
    throw error;
  }
};

/** 상품 삭제(이미지 정리를 원하면 상위에서 별도 처리 필요) */
export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (error) {
    console.error(`상품(${productId}) 삭제 중 오류 발생:`, error);
    throw error;
  }
};
