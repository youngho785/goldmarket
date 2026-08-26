import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export type NormalizedNickname = {
  lower: string;
  original: string;
};

export type NicknameAvailabilityResult = {
  available: boolean;
  ownedByMe: boolean;
  reason: "available" | "owned-by-me" | "in-use" | "nickname-locked" | "integrity-check-required";
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function lowerOf(value: unknown): string {
  return cleanString(value).toLocaleLowerCase();
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function lockedNicknameError(): HttpsError {
  return new HttpsError(
    "failed-precondition",
    "닉네임은 가입 시 최초 1회 설정되며 변경할 수 없습니다."
  );
}

function integrityError(): HttpsError {
  return new HttpsError(
    "failed-precondition",
    "닉네임 데이터 상태를 확인해야 합니다. 관리자에게 문의해 주세요."
  );
}

export async function checkNicknameAvailabilityForRequest(
  firestore: Firestore,
  uid: string | undefined,
  nickname: NormalizedNickname
): Promise<NicknameAvailabilityResult> {
  const { lower, original } = nickname;
  const nickRef = firestore.doc(`nicknames/${lower}`);

  const reads = [
    nickRef.get(),
    firestore.collection("profiles").where("nicknameLower", "==", lower).limit(2).get(),
    firestore.collection("profiles").where("nickname", "==", original).limit(2).get(),
  ] as const;

  const [indexSnap, lowerSnap, exactSnap] = await Promise.all(reads);

  const matchingProfileIds = uniqueNonEmpty([
    ...lowerSnap.docs.map((doc) => doc.id),
    ...exactSnap.docs.map((doc) => doc.id),
  ]);

  if (matchingProfileIds.some((id) => !uid || id !== uid)) {
    return { available: false, ownedByMe: false, reason: "in-use" };
  }

  if (!uid) {
    if (indexSnap.exists || matchingProfileIds.length > 0) {
      return { available: false, ownedByMe: false, reason: "in-use" };
    }
    return { available: true, ownedByMe: false, reason: "available" };
  }

  const [profileSnap, userSnap, ownedSnap] = await Promise.all([
    firestore.doc(`profiles/${uid}`).get(),
    firestore.doc(`users/${uid}`).get(),
    firestore.collection("nicknames").where("ownerUid", "==", uid).limit(3).get(),
  ]);

  const ownEvidence = uniqueNonEmpty([
    lowerOf(profileSnap.get("nicknameLower")),
    lowerOf(profileSnap.get("nickname")),
    lowerOf(userSnap.get("nickname")),
    ...ownedSnap.docs.map((doc) => doc.id.toLocaleLowerCase()),
  ]);

  if (ownEvidence.length > 1) {
    return { available: false, ownedByMe: false, reason: "integrity-check-required" };
  }

  if (ownEvidence.length === 1 && ownEvidence[0] !== lower) {
    return { available: false, ownedByMe: false, reason: "nickname-locked" };
  }

  if (indexSnap.exists) {
    const ownerUid = cleanString(indexSnap.get("ownerUid"));
    if (ownerUid === uid) {
      return { available: true, ownedByMe: true, reason: "owned-by-me" };
    }
    return { available: false, ownedByMe: false, reason: "in-use" };
  }

  if (ownEvidence.length === 1 || matchingProfileIds.length > 0) {
    return { available: true, ownedByMe: true, reason: "owned-by-me" };
  }

  return { available: true, ownedByMe: false, reason: "available" };
}

export async function claimNicknameForUser(
  firestore: Firestore,
  uid: string,
  nickname: NormalizedNickname
): Promise<{ nickname: string; repaired: boolean }> {
  const { lower, original } = nickname;
  const nickRef = firestore.doc(`nicknames/${lower}`);
  const profileRef = firestore.doc(`profiles/${uid}`);
  const userRef = firestore.doc(`users/${uid}`);

  return firestore.runTransaction(async (tx) => {
    const ownedQuery = firestore.collection("nicknames").where("ownerUid", "==", uid).limit(3);
    const lowerQuery = firestore.collection("profiles").where("nicknameLower", "==", lower).limit(2);
    const exactQuery = firestore.collection("profiles").where("nickname", "==", original).limit(2);

    const [nickSnap, profileSnap, userSnap, ownedSnap, lowerSnap, exactSnap] = await Promise.all([
      tx.get(nickRef),
      tx.get(profileRef),
      tx.get(userRef),
      tx.get(ownedQuery),
      tx.get(lowerQuery),
      tx.get(exactQuery),
    ]);

    const legacyConflict = uniqueNonEmpty([
      ...lowerSnap.docs.map((doc) => doc.id),
      ...exactSnap.docs.map((doc) => doc.id),
    ]).some((id) => id !== uid);

    if (legacyConflict) {
      throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
    }

    if (nickSnap.exists) {
      const ownerUid = cleanString(nickSnap.get("ownerUid"));
      if (!ownerUid) throw integrityError();
      if (ownerUid !== uid) {
        throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
      }
    }

    const profileNickname = cleanString(profileSnap.get("nickname"));
    const profileLower = cleanString(profileSnap.get("nicknameLower")).toLocaleLowerCase();
    const userNickname = cleanString(userSnap.get("nickname"));
    const ownedLowers = ownedSnap.docs.map((doc) => doc.id.toLocaleLowerCase());

    const existingLowers = uniqueNonEmpty([
      profileLower,
      lowerOf(profileNickname),
      lowerOf(userNickname),
      ...ownedLowers,
    ]);

    if (existingLowers.length > 1) {
      throw integrityError();
    }

    if (existingLowers.length === 1 && existingLowers[0] !== lower) {
      throw lockedNicknameError();
    }

    const canonicalOriginal =
      [profileNickname, userNickname, cleanString(nickSnap.get("original"))]
        .find((value) => lowerOf(value) === lower) || original;

    let repaired = false;

    if (!nickSnap.exists) {
      tx.set(nickRef, {
        ownerUid: uid,
        original: canonicalOriginal,
        createdAt: FieldValue.serverTimestamp(),
      });
      repaired = true;
    } else if (cleanString(nickSnap.get("original")) !== canonicalOriginal) {
      tx.set(
        nickRef,
        { ownerUid: uid, original: canonicalOriginal },
        { merge: true }
      );
      repaired = true;
    }

    if (
      profileNickname !== canonicalOriginal ||
      profileLower !== lower
    ) {
      tx.set(
        profileRef,
        {
          nickname: canonicalOriginal,
          nicknameLower: lower,
          nicknameUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      repaired = true;
    }

    if (userNickname !== canonicalOriginal) {
      tx.set(
        userRef,
        {
          nickname: canonicalOriginal,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      repaired = true;
    }

    return { nickname: canonicalOriginal, repaired };
  });
}

/**
 * Firebase Auth 계정이 실제로 삭제된 뒤 해당 UID가 소유하던 닉네임만 해제합니다.
 * 다른 프로필/거래 데이터는 보존하고 nickname 관련 필드만 제거합니다.
 */
export async function releaseNicknameOwnershipForDeletedUid(
  firestore: Firestore,
  uid: string
): Promise<{
  releasedIndexes: number;
  clearedProfile: boolean;
  clearedUser: boolean;
}> {
  const profileRef = firestore.doc(`profiles/${uid}`);
  const userRef = firestore.doc(`users/${uid}`);
  const ownedQuery = firestore.collection("nicknames").where("ownerUid", "==", uid);

  return firestore.runTransaction(async (tx) => {
    const [ownedSnap, profileSnap, userSnap] = await Promise.all([
      tx.get(ownedQuery),
      tx.get(profileRef),
      tx.get(userRef),
    ]);

    for (const doc of ownedSnap.docs) {
      tx.delete(doc.ref);
    }

    const profileHasNickname =
      profileSnap.exists &&
      (
        cleanString(profileSnap.get("nickname")) !== "" ||
        cleanString(profileSnap.get("nicknameLower")) !== "" ||
        profileSnap.get("nicknameUpdatedAt") !== undefined
      );

    if (profileHasNickname) {
      tx.set(
        profileRef,
        {
          nickname: FieldValue.delete(),
          nicknameLower: FieldValue.delete(),
          nicknameUpdatedAt: FieldValue.delete(),
        },
        { merge: true }
      );
    }

    const userHasNickname =
      userSnap.exists && cleanString(userSnap.get("nickname")) !== "";

    if (userHasNickname) {
      tx.set(
        userRef,
        {
          nickname: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return {
      releasedIndexes: ownedSnap.size,
      clearedProfile: profileHasNickname,
      clearedUser: userHasNickname,
    };
  });
}
