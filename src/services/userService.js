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

function formatProfileMobilePhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  // 프로필 전화번호는 현재 UI 검증 규칙(국내 휴대전화)에 맞는 값만 저장합니다.
  if (!/^01[016789]\d{7,8}$/.test(digits)) return "";

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

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

export async function saveReservationContact(uid, values = {}) {
  if (!uid) throw new Error("로그인이 필요합니다.");

  const displayName = String(values.displayName || values.name || "").trim();
  const reservationPhone = String(values.phone || "").trim();
  const profilePhone = formatProfileMobilePhone(reservationPhone);
  if (!displayName || !reservationPhone) {
    throw new Error("예약자 이름과 전화번호를 확인해 주세요.");
  }

  const profileRef = doc(db, "profiles", uid);
  const userRef = doc(db, "users", uid);

  // 예약 연락처는 최초 입력값만 프로필 기본값으로 보관합니다.
  // 이미 사용자가 프로필에서 저장한 이름/전화번호가 있으면 예약 입력값으로 덮어쓰지 않습니다.
  await runTransaction(db, async (transaction) => {
    const [profileSnapshot, userSnapshot] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(userRef),
    ]);

    const profileData = profileSnapshot.exists() ? profileSnapshot.data() || {} : {};
    const userData = userSnapshot.exists() ? userSnapshot.data() || {} : {};

    const existingPublicDisplayName = String(profileData.displayName || "").trim();
    const existingUserDisplayName = String(userData.displayName || "").trim();
    const existingUserName = String(userData.name || "").trim();
    const existingPhone = String(userData.phone || "").trim();

    if (!existingPublicDisplayName) {
      transaction.set(profileRef, { displayName }, { merge: true });
    }

    const userPatch = {};
    if (!existingUserDisplayName) userPatch.displayName = displayName;
    if (!existingUserName) userPatch.name = displayName;
    if (!existingPhone && profilePhone) userPatch.phone = profilePhone;

    if (Object.keys(userPatch).length > 0) {
      userPatch.updatedAt = serverTimestamp();
      transaction.set(userRef, userPatch, { merge: true });
    }
  });
}

export async function ensureUserProfileOnSignup(authUser, formValues = {}) {
  if (!authUser?.uid) throw new Error("가입 사용자 정보가 없습니다.");

  const displayName = String(
    formValues.displayName || formValues.name || authUser.displayName || ""
  ).trim();
  const email = String(authUser.email || formValues.email || "").trim();
  const phone = String(formValues.phone || "").trim();
  const photoURL = String(authUser.photoURL || "").trim();

  if (!email) throw new Error("가입 이메일 정보가 없습니다.");

  const profileRef = doc(db, "profiles", authUser.uid);
  const userRef = doc(db, "users", authUser.uid);

  /*
   * 회원가입은 이메일만으로 최소 계정을 만듭니다. displayName/phone은
   * 첫 예약이나 프로필 설정처럼 실제로 필요한 순간에 점진적으로 추가합니다.
   * Android Push가 users/{uid}를 먼저 만들 수 있으므로 createdAt은 없을 때만 씁니다.
   */
  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const existingData = userSnapshot.exists() ? userSnapshot.data() || {} : {};
    const hasCreatedAt =
      userSnapshot.exists() &&
      Object.prototype.hasOwnProperty.call(existingData, "createdAt");

    const userPatch = {
      email,
      updatedAt: serverTimestamp(),
    };

    if (displayName) {
      userPatch.displayName = displayName;
      userPatch.name = displayName;
    }
    if (phone) userPatch.phone = phone;
    if (photoURL) userPatch.profileImage = photoURL;
    if (!hasCreatedAt) userPatch.createdAt = serverTimestamp();

    transaction.set(userRef, userPatch, { merge: true });
  });

  // 공개 프로필 문서는 실제 공개 프로필 값이 있을 때만 만듭니다.
  if (displayName || photoURL) {
    const publicPatch = {};
    if (displayName) publicPatch.displayName = displayName;
    if (photoURL) publicPatch.photoURL = photoURL;
    await setDoc(profileRef, publicPatch, { merge: true });
  }

  // 가입 완료 전에 최소 계약인 이메일이 실제 users 문서에 남았는지 확인합니다.
  const savedUserSnapshot = await getDoc(userRef);
  const savedUser = savedUserSnapshot.exists() ? savedUserSnapshot.data() || {} : {};

  if (
    !savedUserSnapshot.exists() ||
    String(savedUser.email || "").trim().toLowerCase() !== email.toLowerCase()
  ) {
    throw new Error("회원 계정 정보 저장을 확인하지 못했습니다. 다시 시도해 주세요.");
  }
}

export const getUserProfile = fetchUserProfile;
