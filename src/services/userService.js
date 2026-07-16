// src/services/userService.js
import { db } from "../firebase/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/**
 * 공개 프로필 1건 조회 (profiles/{uid})
 * - 판매자 카드/상세에서 보여줄 공개 필드용
 */
export const fetchUserProfile = async (uid) => {
  if (!uid) return null;
  try {
    const ref = doc(db, "profiles", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    return {
      uid: snap.id,
      ...data,
      sellerRatingAvg: data.sellerRatingAvg ?? 0,
      sellerRatingCount: data.sellerRatingCount ?? 0,
    };
  } catch {
    return null;
  }
};

// 필요시 동일 별칭
export const getUserProfile = fetchUserProfile;

/**
 * 🔒 내정보 병합 조회 (본인 전용)
 * - users/{uid} (개인/민감) + profiles/{uid} (공개) 병합
 */
export const fetchMyProfile = async (uid) => {
  if (!uid) return null;
  const [pSnap, uSnap] = await Promise.all([
    getDoc(doc(db, "profiles", uid)),
    getDoc(doc(db, "users", uid)),
  ]);
  const pub = pSnap.exists() ? (pSnap.data() || {}) : {};
  const priv = uSnap.exists() ? (uSnap.data() || {}) : {};
  return {
    uid,
    // 공개
    displayName: pub.displayName || priv.displayName || "",
    nickname: pub.nickname || "",
    photoURL: pub.photoURL || "",            // 공개 아바타
    sellerRatingAvg: pub.sellerRatingAvg ?? 0,
    sellerRatingCount: pub.sellerRatingCount ?? 0,
    // 비공개
    email: priv.email || "",
    phone: priv.phone || "",
    profileImage: priv.profileImage || "",   // 필요 시 비공개용 아바타(원본/고화질 등)
  };
};

/**
 * 사용자 프로필 업데이트
 * - 공개: profiles/{uid} → displayName/nickname/photoURL
 * - 비공개: users/{uid} → email/phone/profileImage(+displayName)
 */
export const updateUserProfile = async (uid, profileData) => {
  if (!uid) throw new Error("uid is required");

  const {
    displayName = "",
    nickname = "",
    // 사진: 공개(photoURL) 우선, 없으면 비공개(profileImage) 사용
    photoURL,
    profileImage,
    // 비공개
    email = "",
    phone = "",
    // 공개 평점 필드는 별도 로직이 갱신
    sellerRatingAvg,
    sellerRatingCount,
    ..._rest // 무통과 방지
  } = profileData || {};

  const finalPhotoURL = (photoURL ?? profileImage ?? "").trim();

  // 공개 프로필 (누구나 읽음)
  await setDoc(
    doc(db, "profiles", uid),
    {
      displayName,
      nickname,
      ...(finalPhotoURL ? { photoURL: finalPhotoURL } : {}),
      ...(sellerRatingAvg != null ? { sellerRatingAvg } : {}),
      ...(sellerRatingCount != null ? { sellerRatingCount } : {}),
    },
    { merge: true }
  );

  // 비공개 사용자 문서 (본인만)
  await setDoc(
    doc(db, "users", uid),
    {
      displayName,
      email,
      phone,
      // 비공개 아바타는 공개 아바타가 있으면 동일하게 맞춰 저장
      ...(finalPhotoURL || profileImage
        ? { profileImage: finalPhotoURL || profileImage }
        : {}),
    },
    { merge: true }
  );
};

/**
 * 최초 가입 시 기본 문서 보장
 * - 가입 폼 입력값을 그대로 반영
 */
export const ensureUserProfile = async (uid, defaults = {}) => {
  if (!uid) throw new Error("uid is required");

  const {
    displayName = "",
    nickname = "",
    email = "",
    phone = "",
    photoURL = "",
    profileImage = "",
  } = defaults || {};

  // 공개 프로필
  await setDoc(
    doc(db, "profiles", uid),
    {
      displayName,
      nickname,
      ...(photoURL ? { photoURL } : {}),
      sellerRatingAvg: 0,
      sellerRatingCount: 0,
    },
    { merge: true }
  );

  // 비공개 사용자 문서
  await setDoc(
    doc(db, "users", uid),
    {
      displayName,
      email,
      phone,
      ...(profileImage || photoURL ? { profileImage: profileImage || photoURL } : {}),
    },
    { merge: true }
  );

  return fetchUserProfile(uid);
};

/**
 * 회원가입 완료 직후 호출용 헬퍼
 * - authUser + 가입 폼 값으로 profiles/users 동시 생성
 */
export const ensureUserProfileOnSignup = async (authUser, formValues = {}) => {
  const uid = authUser?.uid;
  if (!uid) throw new Error("uid is required");

  const payload = {
    displayName: formValues.name || authUser.displayName || "",
    nickname: formValues.nickname || "",
    email: authUser.email || formValues.email || "",
    phone: formValues.phone || "",
    photoURL: authUser.photoURL || "",
    profileImage: "", // 필요하면 폼에서 원본 파일 업로드 후 URL 넣기
  };
  return ensureUserProfile(uid, payload);
};

/**
 * 판매자 평점 집계 반영 (트랜잭션)
 */
export async function applySellerRatingAggregate(sellerId, newRating) {
  const r = Number(newRating);
  if (!sellerId || Number.isNaN(r)) return;

  const usersRef = doc(db, "users", sellerId);
  const profilesRef = doc(db, "profiles", sellerId);

  await runTransaction(db, async (tx) => {
    // users
    const userSnap = await tx.get(usersRef);
    const uData = userSnap.exists() ? (userSnap.data() || {}) : {};
    const uPrevAvg = Number(uData.sellerRatingAvg || 0);
    const uPrevCnt = Number(uData.sellerRatingCount || 0);
    const uTotal = uPrevAvg * uPrevCnt + r;
    const uNextCnt = uPrevCnt + 1;
    const uNextAvg = uNextCnt > 0 ? uTotal / uNextCnt : 0;

    // profiles
    const pSnap = await tx.get(profilesRef);
    const pData = pSnap.exists() ? (pSnap.data() || {}) : {};
    const pPrevAvg = Number(pData.sellerRatingAvg || 0);
    const pPrevCnt = Number(pData.sellerRatingCount || 0);
    const pTotal = pPrevAvg * pPrevCnt + r;
    const pNextCnt = pPrevCnt + 1;
    const pNextAvg = pNextCnt > 0 ? pTotal / pNextCnt : 0;

    tx.set(usersRef, { sellerRatingAvg: uNextAvg, sellerRatingCount: uNextCnt }, { merge: true });
    tx.set(profilesRef, { sellerRatingAvg: pNextAvg, sellerRatingCount: pNextCnt }, { merge: true });
  });
}

/**
 * 리뷰 전체로부터 판매자 평점 재계산
 * - 결과를 profiles/{uid} + users/{uid} 모두에 반영
 */
export async function recalcSellerAggregateFromReviews(sellerId) {
  if (!sellerId) throw new Error("sellerId is required");
  const qRef = query(collection(db, "transactionReviews"), where("sellerId", "==", sellerId));
  const snap = await getDocs(qRef);

  let sum = 0;
  let count = 0;
  snap.forEach((docSnap) => {
    const rating = Number(docSnap.data()?.rating || 0);
    if (!Number.isNaN(rating) && rating > 0) {
      sum += rating;
      count += 1;
    }
  });

  const avg = count > 0 ? sum / count : 0;
  await Promise.all([
    updateDoc(doc(db, "profiles", sellerId), {
      sellerRatingAvg: avg,
      sellerRatingCount: count,
    }),
    updateDoc(doc(db, "users", sellerId), {
      sellerRatingAvg: avg,
      sellerRatingCount: count,
    }).catch(() => {}),
  ]);

  return { avg, count };
}

/**
 * 판매자 요약 (공개)
 */
export async function getSellerSummary(uid) {
  const prof = await fetchUserProfile(uid);
  if (!prof) return null;
  const {
    displayName = "",
    photoURL = "",
    sellerRatingAvg = 0,
    sellerRatingCount = 0,
    nickname = "",
  } = prof;
  return { displayName, nickname, photoURL, sellerRatingAvg, sellerRatingCount };
}
