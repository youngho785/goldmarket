export declare const onChatMessageCreate: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    chatId: string;
    messageId: string;
}>>;
export declare const markChatAsRead: import("firebase-functions/v2/https").CallableFunction<{
    chatId: string;
}, any, unknown>;
export declare const releaseReservedSlot: import("firebase-functions/v2/https").CallableFunction<{
    dateKey: string;
    time: string;
}, any, unknown>;
export declare const setUserRole: import("firebase-functions/v2/https").CallableFunction<{
    uid: string;
    role: "user" | "admin";
}, any, unknown>;
export declare const requestGoldExchangeGroup: import("firebase-functions/v2/https").CallableFunction<{
    visitDate: string;
    visitTime: string;
    name: string;
    phone: string;
    email?: string | null;
    privacyConsent: boolean;
    privacyConsentVersion: string;
    products?: Array<{
        goldType?: string;
        quantity?: number;
        inputUnit?: "g" | "don";
        exchangeType?: string;
    }>;
    barsPlan?: Record<string, unknown> | null;
}, any, unknown>;
export declare const setExchangeGroupStatus: import("firebase-functions/v2/https").CallableFunction<{
    groupId: string;
    status: "requested" | "scheduled" | "in_progress" | "completed" | "canceled" | "rejected";
}, any, unknown>;
export declare const aggregateGoldExchangeGroup: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    docId: string;
}>>;
export declare const onNotificationCreate: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    docId: string;
    uid: string;
}>>;
export declare const cleanReservedSlots: import("firebase-functions/v2/scheduler").ScheduleFunction;
/** 회원가입 직후 닉네임 선점 */
export declare const claimNickname: import("firebase-functions/v2/https").CallableFunction<{
    nickname: string;
}, any, unknown>;
/** 닉네임 변경 */
export declare const changeNickname: import("firebase-functions/v2/https").CallableFunction<{
    newNickname: string;
}, any, unknown>;
export declare const deleteMyAccount: import("firebase-functions/v2/https").CallableFunction<unknown, any, unknown>;
export declare const submitTransactionReview: import("firebase-functions/v2/https").CallableFunction<{
    orderId: string;
    rating: number;
    comment: string;
}, any, unknown>;
export declare const submitGoldExchangeReview: import("firebase-functions/v2/https").CallableFunction<{
    exchangeId: string;
    rating: number;
    comment: string;
}, any, unknown>;
type QuizBonusState = {
    ok: true;
    claimed: boolean;
    alreadyClaimed: boolean;
    claimedNow: boolean;
    creditedG: number;
    balanceG: number;
};
type WelcomeBonusState = {
    ok: true;
    claimed: true;
    alreadyClaimed: boolean;
    claimedNow: boolean;
    creditedG: number;
    balanceG: number;
};
export declare const welcomeClaimGoldBonus: import("firebase-functions/v2/https").CallableFunction<any, Promise<WelcomeBonusState>, unknown>;
export declare const quizGetGoldBonusStatus: import("firebase-functions/v2/https").CallableFunction<any, Promise<QuizBonusState>, unknown>;
export declare const quizClaimGoldBonus: import("firebase-functions/v2/https").CallableFunction<{
    answers: Record<string, number>;
    attemptId?: string;
}, any, unknown>;
type BonusUsageStatus = "requested" | "used" | "canceled" | "restored";
export declare const bonusGetGoldUsageState: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    ok: boolean;
    balanceG: number;
    spendableG: number;
    request: {
        status: BonusUsageStatus;
        amountG: number;
        groupId: string;
        requestCode: string;
        visitDate: string;
        visitTime: string;
        finalRecognizedG: number;
        finalAppliedG: number;
        createdAtMillis: number | null;
        usedAtMillis: number | null;
        canceledAtMillis: number | null;
        restoredAtMillis: number | null;
    } | null;
    eligibleGroups: {
        groupId: string;
        status: string;
        visitDate: string;
        visitTime: string;
        totalG: number;
    }[];
}>, unknown>;
export declare const bonusRequestGoldUsage: import("firebase-functions/v2/https").CallableFunction<{
    groupId: string;
}, any, unknown>;
export declare const bonusCancelGoldUsage: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    groupId: string;
    amountG: number;
    ok: boolean;
}>, unknown>;
export declare const bonusAdminConfirmGoldUsage: import("firebase-functions/v2/https").CallableFunction<{
    groupId: string;
    requestCode: string;
    finalRecognizedG: number;
}, any, unknown>;
export declare const bonusAdminCancelGoldUsage: import("firebase-functions/v2/https").CallableFunction<{
    groupId: string;
    reason?: string;
}, any, unknown>;
export {};
