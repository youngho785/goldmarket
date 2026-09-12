// 금교환 회원 프로필 전용 서비스
import {
  doc,
  getDoc,
  runTransaction,
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
  const email = String(authUser.email || formValues.email || "").trim();
  const phone = String(formValues.phone || "").trim();
  const photoURL = String(authUser.photoURL || "").trim();

  if (!displayName) throw new Error("가입 이름 정보가 없습니다.");
  if (!email) throw new Error("가입 이메일 정보가 없습니다.");
  if (!phone) throw new Error("가입 휴대전화 정보가 없습니다.");

  const profileRef = doc(db, "profiles", authUser.uid);
  const userRef = doc(db, "users", authUser.uid);

  /*
   * Android에서는 Auth 로그인 직후 Native Push가 먼저 연결되면서
   * users/{uid} 문서가 먼저 만들어질 수 있습니다.
   *
   * 기존 구현은 가입 기본정보 저장 때 createdAt을 매번 다시 썼기 때문에,
   * 이미 users 문서에 createdAt이 있으면 Firestore Rules가 업데이트를 차단했고
   * phone/displayName/name까지 함께 저장되지 않는 문제가 있었습니다.
   *
   * transaction에서 최신 users 문서를 다시 읽고 createdAt이 "없는 경우에만"
   * 최초 생성 시각을 추가합니다. 동시에 다른 쓰기가 발생하면 Firestore가
   * transaction을 재시도하므로 Push 등록과 가입 저장의 경쟁 상태도 피합니다.
   */
  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const existingData = userSnapshot.exists() ? userSnapshot.data() || {} : {};
    const hasCreatedAt =
      userSnapshot.exists() &&
      Object.prototype.hasOwnProperty.call(existingData, "createdAt");

    const userPatch = {
      displayName,
      name: displayName,
      email,
      phone,
      profileImage: photoURL,
      updatedAt: serverTimestamp(),
    };

    if (!hasCreatedAt) {
      userPatch.createdAt = serverTimestamp();
    }

    transaction.set(userRef, userPatch, { merge: true });
  });

  // nickname은 claimNickname 서버 함수가 이미 users/profiles/nicknames에 동기화합니다.
  // 클라이언트에서는 nickname을 직접 생성/수정하지 않습니다.
  await setDoc(
    profileRef,
    {
      displayName,
      photoURL,
    },
    { merge: true }
  );

  // 가입 완료 전에 필수 회원정보가 실제 users 문서에 남았는지 확인합니다.
  const savedUserSnapshot = await getDoc(userRef);
  const savedUser = savedUserSnapshot.exists() ? savedUserSnapshot.data() || {} : {};

  if (
    !savedUserSnapshot.exists() ||
    String(savedUser.displayName || "").trim() !== displayName ||
    String(savedUser.name || "").trim() !== displayName ||
    String(savedUser.email || "").trim().toLowerCase() !== email.toLowerCase() ||
    String(savedUser.phone || "").trim() !== phone
  ) {
    throw new Error("회원 기본정보 저장을 확인하지 못했습니다. 다시 시도해 주세요.");
  }
}

export const getUserProfile = fetchUserProfile;
