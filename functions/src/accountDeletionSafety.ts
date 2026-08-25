import {
  FieldValue,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type UpdateData,
} from "firebase-admin/firestore";

/**
 * 계정 삭제처럼 되돌릴 수 없는 작업에 사용할 최근 인증 판정과
 * 필수 정리 단계 실행 순서를 모아 둔 헬퍼입니다.
 */
export function isRecentAuthentication(
  authTimeValue: unknown,
  nowSeconds: number,
  maxAgeSeconds: number
): boolean {
  const authTime = Number(authTimeValue);

  if (
    !Number.isFinite(authTime) ||
    authTime <= 0 ||
    !Number.isFinite(nowSeconds) ||
    !Number.isFinite(maxAgeSeconds) ||
    maxAgeSeconds < 0
  ) {
    return false;
  }

  const ageSeconds = nowSeconds - authTime;
  return ageSeconds >= 0 && ageSeconds <= maxAgeSeconds;
}

export type RequiredDeletionStage = {
  name: string;
  run: () => Promise<unknown>;
};

/**
 * 모든 필수 정리 단계가 성공한 뒤에만 Auth 삭제를 호출합니다.
 * 어느 단계에서든 예외가 발생하면 즉시 중단되며 deleteAuth는 호출되지 않습니다.
 */
export async function runRequiredDeletionStages(
  stages: readonly RequiredDeletionStage[],
  deleteAuth: () => Promise<void>
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};

  for (const stage of stages) {
    results[stage.name] = await stage.run();
  }

  await deleteAuth();
  return results;
}

export type AccountDeletionGroupResult = {
  exchangeUpdates: number;
  groupUpdates: number;
};

const USER_TRACE_FIELDS = [
  "scheduleChangeRequestedBy",
  "cancellationRequestedBy",
  "lastStatusChangedBy",
  "bonusGoldCanceledBy",
  "bonusGoldRestoredBy",
] as const;

function uidOwnedFieldDeletes(
  data: Record<string, unknown>,
  uid: string
): Record<string, unknown> {
  const deletes: Record<string, unknown> = {};

  USER_TRACE_FIELDS.forEach((field) => {
    if (String(data[field] || "") === uid) {
      deletes[field] = FieldValue.delete();
    }
  });

  return deletes;
}

/**
 * 한 예약 그룹의 교환 문서, 그룹 요약, 예약 슬롯을 하나의 Firestore
 * 트랜잭션에서 함께 변경합니다.
 *
 * - 트랜잭션 실패 시 세 영역 모두 부분 반영되지 않습니다.
 * - 고객 UID가 실제 값으로 남은 변경/취소/보너스 이력 필드만 삭제하고
 *   관리자 UID는 보존합니다.
 * - 이미 정리된 그룹은 no-op이므로 재시도에 안전합니다.
 */
export async function cleanupExchangeGroupForDeletion(params: {
  firestore: Firestore;
  uid: string;
  groupId: string;
  exchanges: CollectionReference;
  slotsRef: DocumentReference;
  isActiveExchangeStatus: (status: unknown) => boolean;
  setReservedTime: (
    raw: Record<string, unknown>,
    dateKey: string,
    time: string,
    reserved: boolean
  ) => Record<string, unknown>;
  /** 테스트에서 커밋 직전 실패를 주입하기 위한 선택적 훅입니다. */
  beforeCommit?: () => void | Promise<void>;
}): Promise<AccountDeletionGroupResult> {
  const {
    firestore,
    uid,
    groupId,
    exchanges,
    slotsRef,
    isActiveExchangeStatus,
    setReservedTime,
    beforeCommit,
  } = params;
  const groupRef = firestore.doc(`goldExchangeGroups/${groupId}`);

  return firestore.runTransaction(async (tx) => {
    const groupedSnap = await tx.get(exchanges.where("groupId", "==", groupId));
    const ownedDocs: DocumentSnapshot[] = groupedSnap.docs.filter(
      (document) => String(document.get("userId") || "") === uid
    );

    if (ownedDocs.length === 0) {
      const directSnap = await tx.get(exchanges.doc(groupId));
      if (
        directSnap.exists &&
        String(directSnap.get("userId") || "") === uid
      ) {
        ownedDocs.push(directSnap);
      }
    }

    if (ownedDocs.length === 0) {
      return { exchangeUpdates: 0, groupUpdates: 0 };
    }

    // Firestore 트랜잭션 규칙상 모든 읽기를 쓰기보다 먼저 끝냅니다.
    const [groupSnap, slotsSnap] = await Promise.all([
      tx.get(groupRef),
      tx.get(slotsRef),
    ]);

    const anonymizedAt = FieldValue.serverTimestamp();
    let slots = slotsSnap.exists
      ? (slotsSnap.data() as Record<string, unknown>)
      : {};
    const activeSchedules = new Map<
      string,
      { visitDate: string; visitTime: string }
    >();

    ownedDocs.forEach((document) => {
      const row = (document.data() || {}) as Record<string, unknown>;
      const visitDate = String(row.visitDate || "");
      const visitTime = String(row.visitTime || "");
      if (
        isActiveExchangeStatus(row.status) &&
        visitDate &&
        visitTime
      ) {
        activeSchedules.set(`${visitDate}|${visitTime}`, {
          visitDate,
          visitTime,
        });
      }
    });

    activeSchedules.forEach(({ visitDate, visitTime }) => {
      slots = setReservedTime(slots, visitDate, visitTime, false);
    });

    ownedDocs.forEach((document) => {
      const row = (document.data() || {}) as Record<string, unknown>;
      const active = isActiveExchangeStatus(row.status);
      const nextStatus = active
        ? "canceled"
        : String(row.status || "requested");

      tx.update(document.ref, {
        userId: "",
        participants: FieldValue.arrayRemove(uid),
        name: "탈퇴한 사용자",
        requesterName: "탈퇴한 사용자",
        phone: "",
        email: "",
        address: "",
        customerName: "탈퇴한 사용자",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        ownerDeleted: true,
        anonymizedAt,
        anonymizedReason: "account_deleted",
        status: nextStatus,
        ...uidOwnedFieldDeletes(row, uid),
        ...(active
          ? {
              canceledAt: anonymizedAt,
              cancellationReason: "회원 탈퇴",
              scheduleChangeType: "canceled",
            }
          : {}),
        updatedAt: anonymizedAt,
      } as UpdateData<DocumentData>);
    });

    let groupUpdates = 0;
    if (groupSnap.exists) {
      const groupData = (groupSnap.data() || {}) as Record<string, unknown>;
      const groupStatus = String(groupData.repStatus || "requested");
      const groupActive = isActiveExchangeStatus(groupStatus);

      tx.set(
        groupRef,
        {
          ownerUid: null,
          customerUid: null,
          bonusGoldRequestUid: FieldValue.delete(),
          ownerDeleted: true,
          anonymizedAt,
          anonymizedReason: "account_deleted",
          repStatus: groupActive ? "canceled" : groupStatus,
          ...uidOwnedFieldDeletes(groupData, uid),
          ...(groupActive
            ? {
                canceledAt: anonymizedAt,
                cancellationReason: "회원 탈퇴",
              }
            : {}),
          updatedAt: anonymizedAt,
        } as DocumentData,
        { merge: true }
      );
      groupUpdates = 1;
    }

    if (activeSchedules.size > 0) {
      tx.set(slotsRef, slots);
    }

    // 콜백이 예외를 던지면 Firestore는 위 쓰기들을 커밋하지 않습니다.
    if (beforeCommit) {
      await beforeCommit();
    }

    return {
      exchangeUpdates: ownedDocs.length,
      groupUpdates,
    };
  });
}

/**
 * 관리자 알림 등 다른 계정 아래에 복사된 고객 알림 중
 * meta.customerUid가 탈퇴 UID인 문서를 모두 삭제합니다.
 * 알림 본문의 고객 이름까지 함께 제거하기 위해 문서 자체를 삭제합니다.
 *
 * 필터된 collectionGroup 쿼리는 별도 COLLECTION_GROUP 인덱스가 필요할 수
 * 있으므로, 이번 패치에서는 items 컬렉션 그룹을 읽은 뒤 서버에서 UID를
 * 비교합니다. 현재 범위에서는 firestore.indexes.json을 변경하지 않습니다.
 */
export async function deleteCustomerNotificationCopies(
  firestore: Firestore,
  uid: string,
  batchSize = 200
): Promise<number> {
  const snap = await firestore
    .collectionGroup("items")
    .select("meta.customerUid")
    .get();
  const matches = snap.docs.filter(
    (document) => String(document.get("meta.customerUid") || "") === uid
  );

  let deleted = 0;
  for (let i = 0; i < matches.length; i += batchSize) {
    const chunk = matches.slice(i, i + batchSize);
    const batch = firestore.batch();
    chunk.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}
