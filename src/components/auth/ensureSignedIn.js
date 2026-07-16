// src/auth/ensureSignedIn.js
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously } from "firebase/auth";

/** 쓰기 시점에만 익명로그인 생성(게으른 생성) */
export async function ensureSignedIn() {
  const auth = getAuth();
  if (auth.currentUser) return auth.currentUser;
  await setPersistence(auth, browserLocalPersistence); // 브라우저 재방문 시 유지
  const cred = await signInAnonymously(auth);
  return cred.user;
}
