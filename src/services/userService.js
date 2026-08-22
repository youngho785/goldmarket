// 금교환 회원 프로필 전용 서비스
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { claimNickname } from "@/services/nicknameClient";

export async function fetchUserProfile(uid) {
  if (!uid) return null;
  const snapshot = await getDoc(doc(db, "profiles", uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function fetchMyProfile(uid) {
  if (!uid) return null;
  const [privateSnapshot, publicSnapshot] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDoc(doc(db, "profiles", uid)),
  ]);
  const privateData = privateSnapshot.exists() ? privateSnapshot.data() : {};
  const publicData = publicSnapshot.exists() ? publicSnapshot.data() : {};
  return {
    id: uid,
    ...publicData,
    ...privateData,
    displayName: publicData.displayName || privateData.displayName || "",
    nickname: publicData.nickname || privateData.nickname || "",
    photoURL: publicData.photoURL || privateData.profileImage || "",
    profileImage: privateData.profileImage || publicData.photoURL || "",
  };
}

export async function updateUserProfile(uid, values = {}) {
  if (!uid) throw new Error("로그인이 필요합니다.");

  const profileRef = doc(db, "profiles", uid);
  const userRef = doc(db, "users", uid);
  const profileSnapshot = await getDoc(profileRef);
  const existingNickname = String(profileSnapshot.data()?.nickname || "").trim();
  const requestedNickname = String(values.nickname || "").trim();

  if (!profileSnapshot.exists() && requestedNickname) {
    await claimNickname(requestedNickname);
  }

  const batch = writeBatch(db);
  batch.set(
    profileRef,
    {
      displayName: String(values.displayName || "").trim(),
      photoURL: String(values.photoURL || values.profileImage || "").trim(),
    },
    { merge: true }
  );
  batch.set(
    userRef,
    {
      displayName: String(values.displayName || "").trim(),
      email: String(values.email || "").trim(),
      phone: String(values.phone || "").trim(),
      profileImage: String(values.profileImage || values.photoURL || "").trim(),
      ...(existingNickname || requestedNickname
        ? { nickname: existingNickname || requestedNickname }
        : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}

export async function ensureUserProfileOnSignup(authUser, formValues = {}) {
  if (!authUser?.uid) throw new Error("가입 사용자 정보가 없습니다.");
  const nickname = String(formValues.nickname || "").trim();
  const displayName = String(
    formValues.displayName || formValues.name || authUser.displayName || nickname
  ).trim();
  const photoURL = String(authUser.photoURL || "").trim();

  await Promise.all([
    setDoc(
      doc(db, "profiles", authUser.uid),
      {
        displayName,
        photoURL,
      },
      { merge: true }
    ),
    setDoc(
      doc(db, "users", authUser.uid),
      {
        displayName,
        name: displayName,
        nickname,
        email: String(authUser.email || formValues.email || "").trim(),
        phone: String(formValues.phone || "").trim(),
        profileImage: photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
  ]);
}

export const getUserProfile = fetchUserProfile;
