// Nickname security, account deletion, and completed-exchange reviews.
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import {
  ActiveExchangeBlocksDeletionError,
  cleanupExchangeGroupForDeletion,
  deleteCustomerNotificationCopies,
  runRequiredDeletionStages,
} from "../accountDeletionSafety.js";
import {
  checkNicknameAvailabilityForRequest,
  claimNicknameForUser,
  releaseNicknameOwnershipForDeletedUid,
} from "../nicknameSecurity.js";
import {
  db,
  ENFORCE_APP_CHECK,
  requireRecentAuthentication,
  ACTIVE_EXCHANGE_STATUSES,
  setReservedTime,
} from "../core/runtime.js";
import {
  QUIZ_BONUS_PROMO_ID,
  WELCOME_BONUS_PROMO_ID,
  MARKETING_PUSH_BONUS_PROMO_ID,
  BENEFIT_IDENTITY_TYPE,
  type BenefitRewardKey,
  benefitIdentityHashFromEmail,
  benefitClaimLockRef,
} from "../rewards/shared.js";

/* ─────────────────────────────────────────────────────────────
 * 9) 닉네임 유니크 인덱스 (콜러블)
 * ───────────────────────────────────────────────────────────── */
const normalizeNickname = (raw: string): { lower: string; original: string } => {
  const original = String(raw || "").trim();
  if (!/^[\p{Script=Hangul}A-Za-z0-9 _]{2,16}$/u.test(original)) {
    throw new HttpsError(
      "invalid-argument",
      "닉네임은 2~16자, 한글/영문/숫자/공백/밑줄만 사용할 수 있습니다."
    );
  }
  const lower = original.toLocaleLowerCase();
  return { lower, original };
};

/** 가입 화면용 닉네임 사용 가능 여부 확인
 * - 비로그인 사용자는 전체 중복 여부만 확인
 * - 가입 도중 재시도 중인 동일 UID가 이미 같은 닉네임을 선점했다면 사용 가능으로 처리
 */
export const checkNicknameAvailability = onCall<{ nickname: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const normalized = normalizeNickname(req.data?.nickname || "");
    const result = await checkNicknameAvailabilityForRequest(
      db(),
      req.auth?.uid,
      normalized
    );
    return { ok: true, ...result };
  }
);

/** 회원가입 직후 닉네임 최초 1회 선점
 * - nicknames/profiles/users를 하나의 트랜잭션으로 동기화
 * - 동일 UID + 동일 닉네임 재호출은 멱등 성공
 * - 동일 UID의 다른 닉네임 추가 선점은 거부
 */
export const claimNickname = onCall<{ nickname: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const normalized = normalizeNickname(req.data?.nickname || "");
    const result = await claimNicknameForUser(db(), uid, normalized);
    return { ok: true, ...result };
  }
);

/** 닉네임 변경
 * 현재 정책: 가입 시 최초 1회 설정 후 변경 불가.
 * 이미 배포된 callable 이름은 남겨 두되 직접 호출도 항상 거부합니다.
 */
export const changeNickname = onCall<{ newNickname: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    throw new HttpsError(
      "failed-precondition",
      "닉네임은 가입 시 최초 1회 설정되며 변경할 수 없습니다."
    );
  }
);

/** Firebase Auth 계정 삭제 후 고아 닉네임 자동 해제
 * Auth 자체가 삭제된 UID만 대상으로 nickname 관련 필드/인덱스만 제거합니다.
 * 다른 회원/예약/문의/보너스 데이터는 건드리지 않습니다.
 */
export const cleanupNicknameAfterAuthDelete = functionsV1
  .region("asia-northeast3")
  .auth.user()
  .onDelete(async (user) => {
    await releaseNicknameOwnershipForDeletedUid(db(), user.uid);
  });

/* ─────────────────────────────────────────────────────────────
 * 9) 계정 탈퇴
 * - 서버에서 최근 재인증(auth_time)을 다시 검증
 * - 활성 예약은 그룹/교환 문서/예약 슬롯을 그룹별 트랜잭션으로 함께 정리
 * - 보존이 필요한 거래/문의 기록은 식별정보만 제거
 * - 필수 Firestore/Storage 정리 실패 시 Auth 계정은 삭제하지 않음
 * - 모든 정리가 성공한 뒤 마지막 단계에서 Firebase Auth 계정 삭제
 * ───────────────────────────────────────────────────────────── */
async function deleteCollectionInBatches(
  colRef: FirebaseFirestore.CollectionReference,
  batchSize = 250
): Promise<number> {
  let deleted = 0;

  for (;;) {
    const snap = await colRef.orderBy("__name__").limit(batchSize).get();
    if (snap.empty) break;

    const batch = db().batch();
    snap.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();

    deleted += snap.size;
    if (snap.size < batchSize) break;
  }

  return deleted;
}

async function updateQueryInBatches(
  makeQuery: () => FirebaseFirestore.Query,
  buildUpdate: (
    document: FirebaseFirestore.QueryDocumentSnapshot
  ) => FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
  batchSize = 200
): Promise<number> {
  let updated = 0;

  for (;;) {
    const snap = await makeQuery().limit(batchSize).get();
    if (snap.empty) break;

    const batch = db().batch();
    snap.docs.forEach((document) => {
      batch.update(document.ref, buildUpdate(document));
    });
    await batch.commit();

    updated += snap.size;
    if (snap.size < batchSize) break;
  }

  return updated;
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const bucket = getStorage().bucket();
  let deleted = 0;
  let pageToken: string | undefined;

  do {
    const [files, , response] = await bucket.getFiles({
      prefix,
      autoPaginate: false,
      maxResults: 1000,
      pageToken,
    });

    for (let i = 0; i < files.length; i += 100) {
      const chunk = files.slice(i, i + 100);
      const settled = await Promise.allSettled(
        chunk.map((file) => file.delete({ ignoreNotFound: true }))
      );

      const failures = settled.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ fileName: chunk[index].name, error: result.reason }]
          : []
      );

      deleted += settled.filter((result) => result.status === "fulfilled").length;

      if (failures.length > 0) {
        console.error("[deleteMyAccount] storage delete failed", {
          prefix,
          failures,
        });
        throw new Error(`Storage 정리에 실패했습니다: ${prefix}`);
      }
    }

    const nextPageToken = (
      response as { nextPageToken?: unknown } | undefined
    )?.nextPageToken;
    pageToken =
      typeof nextPageToken === "string"
        ? nextPageToken
        : undefined;
  } while (pageToken);

  return deleted;
}

function isActiveExchangeStatus(status: unknown): boolean {
  return ACTIVE_EXCHANGE_STATUSES.has(String(status || "requested"));
}

export const deleteMyAccount = onCall<unknown>(
  {
    region: "asia-northeast3",
    timeoutSeconds: 540,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    // 반드시 어떤 데이터 변경보다 먼저 최근 재인증을 확인합니다.
    requireRecentAuthentication(
      (req.auth?.token || {}) as Record<string, unknown>
    );

    const startedAt = Date.now();
    const userRef = db().doc(`users/${uid}`);
    const profileRef = db().doc(`profiles/${uid}`);
    const slotsRef = db().doc("appConfig/reservedSlots");
    const exchanges = db().collection("goldExchanges");

    let exchangeUpdates = 0;
    let groupUpdates = 0;
    let supportUpdates = 0;
    let confirmationUpdates = 0;
    let reviewClaimUpdates = 0;
    let customerNotificationCopiesDeleted = 0;
    let notificationItemsDeleted = 0;
    let ledgerDeleted = 0;
    let promotionsDeleted = 0;
    let benefitClaimLocksRecorded = 0;
    let profilePhotosDeleted = 0;
    let legacyProfilesDeleted = 0;

    try {
      // 읽기만 먼저 수행합니다. auth_time 검사는 이미 끝난 상태입니다.
      const [profileSnap, exchangeSnap, authUser] = await Promise.all([
        profileRef.get(),
        exchanges.where("userId", "==", uid).get(),
        getAuth().getUser(uid),
      ]);
      const benefitIdentityHash = authUser.emailVerified
        ? benefitIdentityHashFromEmail(authUser.email)
        : "";

      const activeExchangeCount = exchangeSnap.docs.filter((document) =>
        isActiveExchangeStatus(document.get("status"))
      ).length;
      if (activeExchangeCount > 0) {
        throw new HttpsError(
          "failed-precondition",
          "진행 중인 예약·교환이 있습니다. 해당 건을 완료하거나 정상 취소한 뒤 계정 탈퇴를 진행해 주세요.",
          {
            reason: "active-exchange",
            activeExchangeCount,
          }
        );
      }

      const previousNicknameLower = profileSnap.exists
        ? String(profileSnap.get("nicknameLower") || "").trim()
        : "";
      const ownedGroupIds: string[] = [
        ...new Set<string>(
          exchangeSnap.docs.map((document) => {
            const row = document.data() || {};
            return String(row.groupId || document.id);
          })
        ),
      ];

      const groupRefs = ownedGroupIds.map((groupId) =>
        db().doc(`goldExchangeGroups/${groupId}`)
      );
      const groupSnapshots =
        groupRefs.length > 0 ? await db().getAll(...groupRefs) : [];
      const activeGroupCount = groupSnapshots.filter(
        (snapshot) =>
          snapshot.exists &&
          isActiveExchangeStatus(snapshot.get("repStatus"))
      ).length;
      if (activeGroupCount > 0) {
        throw new HttpsError(
          "failed-precondition",
          "진행 중인 예약·교환이 있습니다. 해당 건을 완료하거나 정상 취소한 뒤 계정 탈퇴를 진행해 주세요.",
          {
            reason: "active-exchange",
            activeGroupCount,
          }
        );
      }

      const anonymizedAt = FieldValue.serverTimestamp();

      await runRequiredDeletionStages(
        [
          {
            name: "exchangeGroups",
            run: async () => {
              for (const groupId of ownedGroupIds) {
                const result = await cleanupExchangeGroupForDeletion({
                  firestore: db(),
                  uid,
                  groupId,
                  exchanges,
                  slotsRef,
                  isActiveExchangeStatus,
                  setReservedTime,
                });
                exchangeUpdates += result.exchangeUpdates;
                groupUpdates += result.groupUpdates;
              }
              return { exchangeUpdates, groupUpdates };
            },
          },
          {
            name: "supportTickets",
            run: async () => {
              supportUpdates = await updateQueryInBatches(
                () => db().collection("supportTickets").where("authorId", "==", uid),
                () => ({
                  authorId: "",
                  authorNickname: "탈퇴한 사용자",
                  authorDeleted: true,
                  anonymizedAt,
                  updatedAt: anonymizedAt,
                })
              );
              return supportUpdates;
            },
          },
          {
            name: "exchangeConfirmations",
            run: async () => {
              confirmationUpdates = await updateQueryInBatches(
                () => db().collection("exchangeConfirmations").where("customerUid", "==", uid),
                () => ({
                  customerUid: "",
                  customerName: "탈퇴한 사용자",
                  name: "탈퇴한 사용자",
                  phone: "",
                  email: "",
                  address: "",
                  customerPhone: "",
                  customerEmail: "",
                  customerAddress: "",
                  customerDeleted: true,
                  anonymizedAt,
                  updatedAt: anonymizedAt,
                })
              );
              return confirmationUpdates;
            },
          },
          {
            name: "reviewClaims",
            run: async () => {
              reviewClaimUpdates = await updateQueryInBatches(
                () => db().collection("goldExchangeReviewClaims").where("ownerUid", "==", uid),
                () => ({
                  ownerUid: "",
                  ownerDeleted: true,
                  anonymizedAt,
                })
              );
              return reviewClaimUpdates;
            },
          },
          {
            name: "customerNotificationCopies",
            run: async () => {
              customerNotificationCopiesDeleted =
                await deleteCustomerNotificationCopies(db(), uid);
              return customerNotificationCopiesDeleted;
            },
          },
          {
            name: "bonusGoldRedemptionRequest",
            run: async () => {
              await db().doc(`bonusGoldRedemptionRequests/${uid}`).delete();
              return true;
            },
          },
          {
            name: "notificationItems",
            run: async () => {
              notificationItemsDeleted = await deleteCollectionInBatches(
                db().collection(`notifications/${uid}/items`)
              );
              return notificationItemsDeleted;
            },
          },
          {
            name: "ledger",
            run: async () => {
              ledgerDeleted = await deleteCollectionInBatches(
                db().collection(`users/${uid}/ledger`)
              );
              return ledgerDeleted;
            },
          },
          {
            name: "benefitClaimLocks",
            run: async () => {
              if (!benefitIdentityHash) return 0;

              const rewardEntries: Array<{ key: BenefitRewardKey; promoId: string }> = [
                { key: "welcome", promoId: WELCOME_BONUS_PROMO_ID },
                { key: "quiz", promoId: QUIZ_BONUS_PROMO_ID },
                { key: "marketingPush", promoId: MARKETING_PUSH_BONUS_PROMO_ID },
              ];
              const promotionSnapshots = await db().getAll(
                ...rewardEntries.map((entry) =>
                  db().doc(`users/${uid}/promotions/${entry.promoId}`)
                )
              );
              const claimedRewards = rewardEntries.filter(
                (_entry, index) => promotionSnapshots[index]?.exists
              );
              if (claimedRewards.length === 0) return 0;

              const claimLockRef = benefitClaimLockRef(benefitIdentityHash);
              const now = FieldValue.serverTimestamp();
              const claims = Object.fromEntries(
                claimedRewards.map((entry) => [
                  entry.key,
                  {
                    claimed: true,
                    promoId: entry.promoId,
                    recordedAt: now,
                  },
                ])
              );
              await claimLockRef.set(
                {
                  schemaVersion: 1,
                  identityType: BENEFIT_IDENTITY_TYPE,
                  claims,
                  updatedAt: now,
                },
                { merge: true }
              );
              benefitClaimLocksRecorded = claimedRewards.length;
              return benefitClaimLocksRecorded;
            },
          },
          {
            name: "promotions",
            run: async () => {
              promotionsDeleted = await deleteCollectionInBatches(
                db().collection(`users/${uid}/promotions`)
              );
              return promotionsDeleted;
            },
          },
          {
            name: "notificationsParent",
            run: async () => {
              await db().doc(`notifications/${uid}`).delete();
              return true;
            },
          },
          {
            name: "pushTestRateLimit",
            run: async () => {
              await db().doc(`pushTestRateLimits/${uid}`).delete();
              return true;
            },
          },
          {
            name: "profileAndNickname",
            run: async () => {
              await db().runTransaction(async (tx) => {
                let nicknameRef: FirebaseFirestore.DocumentReference | null = null;
                let nicknameSnap: FirebaseFirestore.DocumentSnapshot | null = null;

                if (previousNicknameLower) {
                  nicknameRef = db().doc(`nicknames/${previousNicknameLower}`);
                  nicknameSnap = await tx.get(nicknameRef);
                }

                tx.set(
                  userRef,
                  {
                    displayName: "(탈퇴한 사용자)",
                    name: "(탈퇴한 사용자)",
                    email: "",
                    phone: "",
                    profileImage: "",
                    photoURL: "",
                    fcmTokens: [],
                    nativeFcmTokens: [],
                    pushDevices: {},
                    marketingFcmToken: null,
                    marketingFcmBrowser: "",
                    marketingFcmTokenUpdatedAt: FieldValue.serverTimestamp(),
                    role: "user",
                    disabled: true,
                    deleted: true,
                    deletedAt: anonymizedAt,
                    anonymizedAt,
                  } as FirebaseFirestore.DocumentData,
                  { merge: true }
                );

                tx.set(
                  profileRef,
                  {
                    displayName: "탈퇴한 사용자",
                    photoURL: "",
                    profileImage: "",
                    nickname: FieldValue.delete(),
                    nicknameLower: FieldValue.delete(),
                    nicknameUpdatedAt: FieldValue.delete(),
                    deleted: true,
                    deletedAt: anonymizedAt,
                  } as FirebaseFirestore.DocumentData,
                  { merge: true }
                );

                if (
                  nicknameRef &&
                  nicknameSnap?.exists &&
                  String(nicknameSnap.get("ownerUid") || "") === uid
                ) {
                  tx.delete(nicknameRef);
                }
              });
              return true;
            },
          },
          {
            name: "profilePhotosStorage",
            run: async () => {
              profilePhotosDeleted = await deleteStoragePrefix(`profilePhotos/${uid}/`);
              return profilePhotosDeleted;
            },
          },
          {
            name: "legacyProfilesStorage",
            run: async () => {
              legacyProfilesDeleted = await deleteStoragePrefix(`profiles/${uid}/`);
              return legacyProfilesDeleted;
            },
          },
        ],
        async () => {
          // 모든 필수 정리가 성공한 경우에만, 그리고 항상 마지막에 Auth 계정을 삭제합니다.
          await getAuth()
            .deleteUser(uid)
            .catch((error: { code?: string }) => {
              if (error?.code !== "auth/user-not-found") throw error;
            });
        }
      );

      console.info("[deleteMyAccount] completed", {
        uid,
        durationMs: Date.now() - startedAt,
        exchanges: exchangeUpdates,
        groups: groupUpdates,
        supportTickets: supportUpdates,
        confirmations: confirmationUpdates,
        reviewClaims: reviewClaimUpdates,
        customerNotificationCopiesDeleted,
        notificationItemsDeleted,
        ledgerDeleted,
        promotionsDeleted,
        benefitClaimLocksRecorded,
        profilePhotosDeleted,
        legacyProfilesDeleted,
      });

      return {
        ok: true,
        authDeleted: true,
        anonymizedExchanges: exchangeUpdates,
        anonymizedGroups: groupUpdates,
      };
    } catch (error) {
      console.error("[deleteMyAccount] failed", {
        uid,
        durationMs: Date.now() - startedAt,
        error,
      });

      if (error instanceof ActiveExchangeBlocksDeletionError) {
        throw new HttpsError(
          "failed-precondition",
          "진행 중인 예약·교환이 있습니다. 해당 건을 완료하거나 정상 취소한 뒤 계정 탈퇴를 진행해 주세요.",
          { reason: "active-exchange" }
        );
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "계정 정리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  }
);

/* ─────────────────────────────────────────────────────────────
 * 완료된 금교환 후기 등록
 * - 교환 완료·본인 소유 여부를 서버에서 확인
 * - 거래당 1회, 공개 문서에는 회원 식별자를 저장하지 않음
 * ───────────────────────────────────────────────────────────── */
export const submitGoldExchangeReview = onCall<{
  exchangeId: string;
  rating: number;
  comment: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const exchangeId = String(req.data?.exchangeId || "").trim();
    const rating = Number(req.data?.rating);
    const comment = String(req.data?.comment || "").trim();

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(exchangeId)) {
      throw new HttpsError("invalid-argument", "교환 번호를 확인해 주세요.");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpsError("invalid-argument", "평점은 1점부터 5점까지 선택해 주세요.");
    }
    if (comment.length < 10 || comment.length > 500) {
      throw new HttpsError("invalid-argument", "후기는 10자 이상 500자 이하로 입력해 주세요.");
    }

    const exchanges = db().collection("goldExchanges");
    const groupedSnap = await exchanges.where("groupId", "==", exchangeId).limit(50).get();
    const exchangeDocs: FirebaseFirestore.DocumentSnapshot[] = [...groupedSnap.docs];

    if (exchangeDocs.length === 0) {
      const directSnap = await exchanges.doc(exchangeId).get();
      if (directSnap.exists) exchangeDocs.push(directSnap);
    }
    if (exchangeDocs.length === 0) {
      throw new HttpsError("not-found", "교환 내역을 찾을 수 없습니다.");
    }

    const ownedDocs = exchangeDocs.filter((item) => item.data()?.userId === uid);
    if (ownedDocs.length === 0) {
      throw new HttpsError("permission-denied", "본인의 교환 내역만 평가할 수 있습니다.");
    }

    const completedDoc = ownedDocs.find((item) => item.data()?.status === "completed");
    if (!completedDoc) {
      throw new HttpsError("failed-precondition", "교환 완료 처리된 건만 후기를 작성할 수 있습니다.");
    }

    const claimRef = db().doc(`goldExchangeReviewClaims/${exchangeId}`);
    const publicReviewRef = db().collection("verifiedGoldExchangeReviews").doc();

    await db().runTransaction(async (tx) => {
      const [claimSnap, completedSnap] = await Promise.all([
        tx.get(claimRef),
        tx.get(completedDoc.ref),
      ]);

      if (claimSnap.exists) {
        throw new HttpsError("already-exists", "이미 후기를 작성했습니다.");
      }

      const completedExchange = completedSnap.data() || {};
      if (
        completedExchange.userId !== uid ||
        completedExchange.status !== "completed"
      ) {
        throw new HttpsError("failed-precondition", "교환 완료 상태를 다시 확인해 주세요.");
      }

      const now = FieldValue.serverTimestamp();
      tx.create(publicReviewRef, {
        rating,
        comment,
        reviewerLabel: "교환 완료 고객",
        serviceType: "골드바 교환",
        verified: true,
        createdAt: now,
      });
      tx.create(claimRef, {
        ownerUid: uid,
        reviewId: publicReviewRef.id,
        createdAt: now,
      });

      for (const exchangeDoc of ownedDocs) {
        tx.set(
          exchangeDoc.ref,
          { reviewed: true, reviewedAt: now },
          { merge: true }
        );
      }
    });

    return { ok: true, reviewId: publicReviewRef.id };
  }
);

