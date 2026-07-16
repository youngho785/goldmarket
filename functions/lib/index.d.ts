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
export declare const requestGoldExchangeGroup: import("firebase-functions/v2/https").CallableFunction<{
    visitDate: string;
    visitTime: string;
    name: string;
    phone: string;
    address: string;
    email?: string | null;
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
export declare const quizClaimGoldBonus: import("firebase-functions/v2/https").CallableFunction<{
    score: number;
    attemptId?: string;
}, any, unknown>;
