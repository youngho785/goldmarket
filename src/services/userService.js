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
  const [profileSnapshot, userSnapshot] = await Promise.all([
    getDoc(profileRef),
    getDoc(userRef),
  ]);

  const profileNickname = String(profileSnapshot.data()?.nickname || "").trim();
  const userNickname = String(userSnapshot.data()?.nickname || "").trim();
  const existingNickname = profileNickname || userNickname;
  const requestedNickname = String(values.nickname || "").trim();

  if (
    existingNickname &&
    requestedNickname &&
    existingNickname.toLocaleLowerCase() !== requestedNickname.toLocaleLowerCase()
  ) {
    throw new Error("닉네임은 가입 시 최초 1회 설정되며 변경할 수 없습니다.");
  }

  if (!existingNickname && requestedNickname) {
    await claimNickname(requestedNickname);
  } else if (
    existingNickname &&
    (!profileNickname || !userNickname || profileNickname !== userNickname)
  ) {
    // 레거시/부분 저장 상태는 같은 닉네임의 멱등 선점으로 서버에서 복구합니다.
    await claimNickname(existingNickname);
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
      phone: String(values.phone || "").trim(),
      profileImage: String(values.profileImage || values.photoURL || "").trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}

export async function ensureUserProfileOnSignup(authUser, formValues = {}) {
  if (!authUser?.uid) throw new Error("가입 사용자 정보가 없습니다.");
  const displayName = String(
    formValues.displayName || formValues.name || authUser.displayName || ""
  ).trim();
  const photoURL = String(authUser.photoURL || "").trim();

  // nickname은 claimNickname 서버 함수가 이미 users/profiles/nicknames에 동기화합니다.
  // 클라이언트에서는 nickname을 직접 생성/수정하지 않습니다.
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
