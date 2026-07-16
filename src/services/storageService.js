// src/services/storageService.js
import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// 이미지 파일 업로드, url 반환
export async function uploadImage(file) {
  if (!file) return null;

  // 파일 타입/용량 체크 (예: 10MB 이하)
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("최대 10MB 이하 이미지만 업로드 가능합니다.");
  }

  try {
    const fileRef = ref(storage, `chatImages/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (err) {
    // 로깅 및 사용자 알림 용
    console.error("이미지 업로드 실패:", err);
    throw err;
  }
}
