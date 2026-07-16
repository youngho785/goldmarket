// functions/src/index.ts
// Cloud Functions (ESM + TypeScript)
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type BatchResponse, type SendResponse } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

/* ── App init (중복 방지) */
if (!getApps().length) initializeApp();

/* ── Lazy getters */
const db = (): Firestore => getFirestore();
const msg = () => getMessaging();
const IN_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";

/* ── 공통 상수/유틸 */
const DON_TO_GRAMS = 3.75 as const;
const DEFAULT_PURITY: Record<string, number> = {
  "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.53,
  "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.70,
  "순금 995제품(목걸이,팔찌,반지,귀걸이)": 0.945,
  "순금 999제품(팔찌,목걸이, 반지,귀걸이)": 0.95,
  "순금 열쇠": 0.943,
  "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)": 0.94,
  "순금 마고자 단추 / 색상이 들어있는 제품": 0.93,
  "999,24k 순금덩어리(순도 측정후 999일 경우)": 0.96,
};
const DEFAULT_EXCHANGE: Record<string, number> = { "999.9골드바": 1 };

const roundTo3 = (n: number): number => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8);
  let thousands = Math.floor(t / 10);
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};

function computeFinalWeightFromRates(params: {
  grams: number;
  goldType?: string;
  exchangeType?: string;
  purity?: Record<string, number>;
  exchange?: Record<string, number>;
}): number {
  const { grams, goldType, exchangeType, purity, exchange } = params;
  const p =
    typeof purity?.[goldType ?? ""] === "number"
      ? (purity as Record<string, number>)[goldType as string]
      : (DEFAULT_PURITY[goldType ?? ""] ?? 0);
  const e =
    typeof exchange?.[exchangeType ?? ""] === "number"
      ? (exchange as Record<string, number>)[exchangeType as string]
      : (DEFAULT_EXCHANGE[exchangeType ?? ""] ?? 1);
  return roundTo3(grams * p * e);
}

async function addNotificationForUser(
  uid: string | undefined,
  payload: {
    type: string;
    title: string;
    body: string;
    link?: string;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  if (!uid) return;
  const ref = db().collection("notifications").doc(uid).collection("items").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  });
}

/* ─────────────────────────────────────────────────────────────
 * 1) 채팅 메시지 생성 시: 미읽음/최근메시지 메타 갱신 + 푸시 발송
 * ───────────────────────────────────────────────────────────── */
export const onChatMessageCreate = onDocumentCreated(
  { region: "asia-northeast3", document: "chats/{chatId}/messages/{messageId}" },
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) return;

      const message = (snap.data() || {}) as {
        sender?: string;
        text?: string;
        imageUrl?: string | null;
      };
      const { chatId } = event.params as { chatId: string; messageId: string };

      const chatRef = db().doc(`chats/${chatId}`);
      const chatSnap = await chatRef.get();
      if (!chatSnap.exists) return;

      const chat = (chatSnap.data() || {}) as {
        participants?: string[];
        participantsMap?: Record<string, boolean>;
      };

      const participants = Array.isArray(chat.participants)
        ? chat.participants
        : Object.keys(chat.participantsMap || {});
      const sender = message.sender || "";
      const receivers = participants.filter((u) => u && u !== sender);

      // (A) 채팅 메타 업데이트
      const lastMessage =
        (message.imageUrl && "[이미지]") ||
        (typeof message.text === "string" && message.text.trim().slice(0, 200)) ||
        "새 메시지";

      await db().runTransaction(async (tx) => {
        const cur = await tx.get(chatRef);
        if (!cur.exists) return;

        const updates: FirebaseFirestore.DocumentData = {
          lastMessage,
          lastMessageAt: FieldValue.serverTimestamp(),
          lastUpdated: FieldValue.serverTimestamp(),
        };
        receivers.forEach((uid) => {
          updates[`unreadCount.${uid}`] = FieldValue.increment(1);
        });

        tx.set(chatRef, updates, { merge: true });

        receivers.forEach((uid) => {
          const threadRef = db().doc(`chatSummaries/${uid}/threads/${chatId}`);
          tx.set(
            threadRef,
            {
              unread: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
              lastMessage,
              lastMessageAt: FieldValue.serverTimestamp(),
            } as FirebaseFirestore.DocumentData,
            { merge: true }
          );

          const metaRef = db().doc(`chatMeta/${uid}`);
          tx.set(
            metaRef,
            { unreadTotal: FieldValue.increment(1) } as FirebaseFirestore.DocumentData,
            { merge: true }
          );
        });
      });

      // (B) 푸시 발송 — 에뮬레이터에서는 스킵
      if (!receivers.length || IN_EMULATOR) return;

      // 수신자들의 FCM 토큰 수집 (중복 제거)
      const tokenSet = new Set<string>();
      await Promise.all(
        receivers.map(async (uid) => {
          const uSnap = await db().doc(`users/${uid}`).get();
          const tokens = (uSnap.get("fcmTokens") || []) as unknown[];
          (tokens || []).forEach((t) => {
            if (typeof t === "string" && t) tokenSet.add(t);
          });
        })
      );

      const tokens = [...tokenSet];
      if (!tokens.length) return;

      const title = "새 채팅 메시지";
      const body =
        message.imageUrl ? "이미지를 보냈습니다." : message.text || "새 메시지가 도착했습니다.";
      const link = `/chat/${chatId}`;

      // ✅ data + notification 동시 전송 (웹 자동 표시 + 앱 라우팅 유지)
      const res: BatchResponse = await msg().sendEachForMulticast({
        tokens,
        data: {
          type: "chat_message",
          chatId,
          sender,
          title,
          body,
          preferBadge: "true",
          link,
        },
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png",
            data: { url: link },
          },
          fcmOptions: { link },
          headers: { Urgency: "high" },
        },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });

      // 토큰 정리
      const bad: string[] = [];
      res.responses.forEach((r: SendResponse, i: number) => {
        if (!r.success) {
          const code = (r.error as { code?: string } | undefined)?.code || "";
          if (
            code.includes("registration-token-not-registered") ||
            code.includes("messaging/registration-token-not-registered") ||
            code.includes("invalid-argument")
          ) {
            bad.push(tokens[i]);
          }
        }
      });
      if (bad.length) {
        await Promise.all(
          receivers.map((uid) =>
            db().doc(`users/${uid}`).update({ fcmTokens: FieldValue.arrayRemove(...bad) })
          )
        );
      }
    } catch (err) {
      console.error("[onChatMessageCreate] error:", err);
    }
  }
);

/* ───────── 1-b) 채팅 읽음 처리 callable ───────── */
export const markChatAsRead = onCall<{ chatId: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const chatId = (req.data?.chatId || "").trim();
    if (!chatId) throw new HttpsError("invalid-argument", "chatId가 필요합니다.");

    const chatRef = db().doc(`chats/${chatId}`);
    const threadRef = db().doc(`chatSummaries/${uid}/threads/${chatId}`);
    const metaRef = db().doc(`chatMeta/${uid}`);

    let cleared = 0;

    await db().runTransaction(async (tx) => {
      // ---- 모든 READ를 먼저 수행 ----
      const [tSnap, mSnap] = await Promise.all([tx.get(threadRef), tx.get(metaRef)]);
      const prevUnread = (tSnap.exists ? Number(tSnap.get("unread") || 0) : 0) || 0;
      const curTotal = (mSnap.exists ? Number(mSnap.get("unreadTotal") || 0) : 0) || 0;
      cleared = prevUnread;

      // ---- 이후는 WRITE만 수행 ----
      const now = FieldValue.serverTimestamp();

      // 1) 쓰레드 읽음/최근 본 시각 갱신
      tx.set(
        threadRef,
        {
          unread: 0,
          updatedAt: now,
          lastSeenAt: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      // 2) 전체 미읽음 합계 차감
      if (prevUnread > 0) {
        tx.set(
          metaRef,
          { unreadTotal: Math.max(0, curTotal - prevUnread) } as FirebaseFirestore.DocumentData,
          { merge: true }
        );
      }

      // 3) 원본 chats 문서의 나의 미읽음 카운트/lastSeen 동기화
      tx.set(
        chatRef,
        {
          [`unreadCount.${uid}`]: 0,
          [`lastSeenAt.${uid}`]: now,
          lastUpdated: now,
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );
    });

    // (옵션) 해당 채팅 관련 알림 문서가 있으면 읽음 처리
    const itemsRef = db().collection(`notifications/${uid}/items`);
    const qs = await itemsRef.where("chatId", "==", chatId).where("read", "==", false).limit(200).get();
    if (!qs.empty) {
      const batch = db().batch();
      qs.docs.forEach((d) => batch.update(d.ref, { read: true, readAt: FieldValue.serverTimestamp() }));
      await batch.commit();
    }

    return { ok: true, cleared };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 2) 예약 슬롯 해제 (관리자 UI용)
 * ───────────────────────────────────────────────────────────── */
export const releaseReservedSlot = onCall<{ dateKey: string; time: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const { dateKey, time } = (req.data || {}) as Partial<{ dateKey: string; time: string }>;
    if (!dateKey || !time) {
      throw new HttpsError("invalid-argument", "dateKey와 time이 필요합니다.");
    }
    const ref = db().doc("appConfig/reservedSlots");

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.exists ? (snap.data() as Record<string, unknown>) : {};

      // array 또는 map 두 형태 모두 호환
      if (Array.isArray(raw?.[dateKey])) {
        const next = ((raw[dateKey] as unknown[]) || []).filter((t) => t !== time);
        tx.set(ref, { [dateKey]: next } as FirebaseFirestore.DocumentData, { merge: true });
      } else {
        tx.set(
          ref,
          { [`${dateKey}.${time}`]: FieldValue.delete() } as FirebaseFirestore.DocumentData,
          { merge: true }
        );
      }
    });

    return { ok: true, removed: time, dateKey };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 3) 그룹 생성 + 슬롯 선점 (사용자 제출)
 * ───────────────────────────────────────────────────────────── */
export const requestGoldExchangeGroup = onCall<{
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
}>({ region: "asia-northeast3" }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const {
    visitDate,
    visitTime,
    name,
    phone,
    address,
    email = null,
    products = [],
    barsPlan = null,
  } = (req.data || {}) as {
    visitDate?: string;
    visitTime?: string;
    name?: string;
    phone?: string;
    address?: string;
    email?: string | null;
    products?: Array<{
      goldType?: string;
      quantity?: number;
      inputUnit?: "g" | "don";
      exchangeType?: string;
    }>;
    barsPlan?: Record<string, unknown> | null;
  };

  if (!visitDate || !visitTime || !name || !phone || !address) {
    throw new HttpsError("invalid-argument", "방문일/시간, 성명/전화/주소는 필수입니다.");
  }

  const ratesSnap = await db().doc("appConfig/goldRates").get();
  const rates = ratesSnap.exists
    ? (ratesSnap.data() as {
        purity?: Record<string, number>;
        exchange?: Record<string, number>;
      })
    : { purity: DEFAULT_PURITY, exchange: DEFAULT_EXCHANGE };

  const slotsRef = db().doc("appConfig/reservedSlots");
  const exchanges = db().collection("goldExchanges");

  // 첫 문서 ref를 미리 만들어서 groupId로 사용
  const firstRef = exchanges.doc();
  const groupId = firstRef.id;
  const now = FieldValue.serverTimestamp();

  await db().runTransaction(async (tx) => {
    // 1) 슬롯 중복 확인
    const sSnap = await tx.get(slotsRef);
    const sData = sSnap.exists ? (sSnap.data() as Record<string, unknown>) : {};
    const v = sData?.[visitDate];
    const taken = Array.isArray(v)
      ? (v as string[]).includes(visitTime)
      : !!(v && typeof v === "object" && (v as Record<string, boolean>)[visitTime]);
    if (taken) throw new HttpsError("aborted", "이미 예약된 시간입니다.");

    // 2) 슬롯 선점
    tx.set(
      slotsRef,
      { [visitDate]: { [visitTime]: true } } as FirebaseFirestore.DocumentData,
      { merge: true }
    );

    // 3) 문서 생성
    if (Array.isArray(products) && products.length > 0) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i] || {};
        const qty = Number(p.quantity || 0);
        const unit: "g" | "don" = p.inputUnit === "don" ? "don" : "g";
        const gramsInput = unit === "g" ? qty : qty * DON_TO_GRAMS;
        const gramsRounded = roundTo3(gramsInput);
        const finalG = computeFinalWeightFromRates({
          grams: gramsRounded,
          goldType: p.goldType,
          exchangeType: p.exchangeType || "999.9골드바",
          purity: rates.purity,
          exchange: rates.exchange,
        });

        const docRef = i === 0 ? firstRef : exchanges.doc();
        tx.set(
          docRef,
          {
            userId: uid,
            groupId,
            createdAt: now,
            updatedAt: now,
            status: "requested",
            unknown: false,
            // 예약자
            name,
            phone,
            address,
            email,
            visitDate,
            visitTime,
            // 입력/환산 저장
            originalQuantity: qty,
            inputUnit: unit,
            quantity: roundTo3(gramsRounded),
            goldType: p.goldType,
            exchangeType: p.exchangeType || "999.9골드바",
            finalWeight: roundTo3(finalG),
            finalWeightDon: roundTo3(finalG / DON_TO_GRAMS),
            purityUsed: rates.purity?.[p.goldType ?? ""] ?? null,
            exchangeRatioUsed: rates.exchange?.[p.exchangeType ?? "999.9골드바"] ?? 1,
            calcVersion: 4,
            ...(barsPlan ? { barsPlan } : {}),
          } as FirebaseFirestore.DocumentData
        );
      }
    } else {
      // 현장 확인 only
      tx.set(
        firstRef,
        {
          userId: uid,
          groupId,
          createdAt: now,
          updatedAt: now,
          status: "requested",
          unknown: true,
          name,
          phone,
          address,
          email,
          visitDate,
          visitTime,
          goldType: "미확인",
          exchangeType: "999.9골드바",
          originalQuantity: 0,
          inputUnit: "g",
          quantity: 0,
          finalWeight: 0,
          finalWeightDon: 0,
          calcVersion: 4,
          ...(barsPlan ? { barsPlan } : {}),
        } as FirebaseFirestore.DocumentData
      );
    }
  });

  // 접수 알림 기록
  await addNotificationForUser(uid, {
    type: "exchange_requested",
    title: "금 교환 요청 접수",
    body: `방문 예약이 접수되었습니다. (${visitDate} ${visitTime})`,
    link: "/my-exchanges",
    meta: { groupId },
  });

  return { ok: true, groupId };
});

/* ─────────────────────────────────────────────────────────────
 * 4) 그룹 상태 일괄 변경 (관리자)
 * ───────────────────────────────────────────────────────────── */
export const setExchangeGroupStatus = onCall<{
  groupId: string;
  status: "requested" | "scheduled" | "in_progress" | "completed" | "canceled" | "rejected";
}>(
  { region: "asia-northeast3" },
  async (req) => {
    const claims = (req.auth?.token || {}) as Record<string, unknown>;
    if (!(claims.admin === true || claims.superAdmin === true)) {
      throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { groupId, status } = (req.data || {}) as {
      groupId?: string;
      status?: "requested" | "scheduled" | "in_progress" | "completed" | "canceled" | "rejected";
    };
    if (!groupId || !status) throw new HttpsError("invalid-argument", "groupId와 status가 필요합니다.");

    const now = FieldValue.serverTimestamp();
    const extra: Record<string, unknown> = {};
    if (status === "scheduled") extra.scheduledAt = now;
    if (status === "in_progress") extra.startedAt = now;
    if (status === "completed") extra.completedAt = now;
    if (status === "canceled") extra.canceledAt = now;
    if (status === "rejected") extra.rejectedAt = now;

    const col = db().collection("goldExchanges");
    let qs = await col.where("groupId", "==", groupId).get();

    // 혹시 옛 데이터에서 groupId가 없는 단일 문서 케이스 보완
    if (qs.empty) {
      const single = await col.doc(groupId).get();
      if (!single.exists) {
        throw new HttpsError("not-found", "그룹을 찾을 수 없습니다.");
      }
      qs = { empty: false, docs: [single] } as unknown as typeof qs;
    }

    const batch = db().batch();
    let targetUid: string | null = null;
    qs.docs.forEach((d) => {
      const data = (d.data() || {}) as { userId?: string };
      targetUid = targetUid || data.userId || null;
      batch.update(d.ref, { status, updatedAt: now, ...extra } as FirebaseFirestore.DocumentData);
    });
    await batch.commit();

    if (targetUid) {
      await addNotificationForUser(targetUid, {
        type: "exchange_status",
        title: "금 교환 요청 상태 변경",
        body: `요청(${groupId}) 상태가 '${status}'로 변경되었습니다.`,
        link: "/my-exchanges",
        meta: { groupId, newStatus: status },
      });
    }

    return { ok: true };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 5) 그룹 요약 집계
 * ───────────────────────────────────────────────────────────── */
export const aggregateGoldExchangeGroup = onDocumentWritten(
  { region: "asia-northeast3", document: "goldExchanges/{docId}" },
  async (event) => {
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const groupId =
      (after?.["groupId"] as string | undefined) || (before?.["groupId"] as string | undefined);
    if (!groupId) return;

    const qs = await db().collection("goldExchanges").where("groupId", "==", groupId).get();
    if (qs.empty) {
      await db().doc(`goldExchangeGroups/${groupId}`).delete().catch(() => {});
      return;
    }

    const priority = [
      "rejected",
      "canceled",
      "completed",
      "scheduled",
      "in_progress",
      "requested",
    ] as const;

    let totalG = 0;
    let repStatus: (typeof priority)[number] = "requested";
    let createdAt: Date | null = null;
    let updatedAt: Date | null = null;
    let visitDate = "";
    let visitTime = "";
    let ownerUid: string | null = null;

    qs.docs.forEach((d) => {
      const x = (d.data() || {}) as {
        userId?: string;
        finalWeight?: number;
        status?: (typeof priority)[number];
        createdAt?: FirebaseFirestore.Timestamp | Date;
        updatedAt?: FirebaseFirestore.Timestamp | Date;
        visitDate?: string;
        visitTime?: string;
      };

      totalG += Number(x.finalWeight || 0);

      const idx = priority.indexOf((x.status || "requested") as (typeof priority)[number]);
      const ridx = priority.indexOf(repStatus);
      if (idx > -1 && (ridx === -1 || idx < ridx)) {
        repStatus = (x.status || "requested") as (typeof priority)[number];
      }

      const c =
        x.createdAt instanceof Date
          ? x.createdAt
          : (x.createdAt as FirebaseFirestore.Timestamp | undefined)?.toDate?.() ?? null;
      const u =
        x.updatedAt instanceof Date
          ? x.updatedAt
          : (x.updatedAt as FirebaseFirestore.Timestamp | undefined)?.toDate?.() ?? null;

      if (!createdAt || (c && c < createdAt)) createdAt = c;
      if (!updatedAt || (u && u > updatedAt)) updatedAt = u;

      if (!ownerUid && x.userId) ownerUid = x.userId;

      if (!visitDate && x.visitDate) visitDate = x.visitDate;
      if (!visitTime && x.visitTime) visitTime = x.visitTime;
    });

    await db().doc(`goldExchangeGroups/${groupId}`).set(
      {
        totalG: roundTo3(totalG),
        totalDon: roundTo3(totalG / DON_TO_GRAMS),
        repStatus,
        createdAt: createdAt || FieldValue.serverTimestamp(),
        updatedAt: updatedAt || FieldValue.serverTimestamp(),
        visitDate,
        visitTime,
        ownerUid: ownerUid || null,
      } as FirebaseFirestore.DocumentData,
      { merge: true }
    );
  }
);

/* ─────────────────────────────────────────────────────────────
 * 6) 알림 문서 생성 시 FCM 발송
 * ───────────────────────────────────────────────────────────── */
export const onNotificationCreate = onDocumentCreated(
  { region: "asia-northeast3", document: "notifications/{uid}/items/{docId}" },
  async (event) => {
    try {
      if (IN_EMULATOR) return;
      const { uid } = event.params as { uid: string };
      const notif = (event.data?.data() || {}) as {
        title?: string;
        body?: string;
        type?: string;
        link?: string;
      };

      const userSnap = await db().doc(`users/${uid}`).get();
      const tokens = ((userSnap.get("fcmTokens") || []) as unknown[]).filter(
        (t): t is string => typeof t === "string" && t.length > 0
      );
      if (!tokens.length) return;

      const title = notif.title || "알림";
      const body = notif.body || "";
      const link = String(notif.link || "/");

      const res: BatchResponse = await msg().sendEachForMulticast({
        tokens,
        data: {
          type: String(notif.type || "notification"),
          link,
        },
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png",
            data: { url: link },
          },
          fcmOptions: { link },
          headers: { Urgency: "high" },
        },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });

      const bad: string[] = [];
      res.responses.forEach((r: SendResponse, i: number) => {
        if (!r.success) {
          const code = (r.error as { code?: string } | undefined)?.code || "";
          if (
            code.includes("registration-token-not-registered") ||
            code.includes("messaging/registration-token-not-registered") ||
            code.includes("invalid-argument")
          ) {
            bad.push(tokens[i]);
          }
        }
      });

      if (bad.length) {
        await db()
          .doc(`users/${uid}`)
          .update({ fcmTokens: FieldValue.arrayRemove(...bad) })
          .catch(() => {});
      }
    } catch (e) {
      console.error("[onNotificationCreate] error:", e);
    }
  }
);

/* ─────────────────────────────────────────────────────────────
 * 7) 예약 슬롯 청소 (스케줄러)
 * ───────────────────────────────────────────────────────────── */
export const cleanReservedSlots = onSchedule(
  { schedule: "every 60 minutes", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const toYmdSeoul = (): string => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .reduce<Record<string, string>>((acc, p) => {
          acc[p.type] = p.value;
          return acc;
        }, {});
      return `${parts.year}-${parts.month}-${parts.day}`;
    };
    const today = toYmdSeoul();

    const ref = db().doc("appConfig/reservedSlots");
    const snap = await ref.get();
    if (!snap.exists) return;
    const data = (snap.data() || {}) as Record<string, unknown>;

    const updates: FirebaseFirestore.DocumentData = {};
    Object.keys(data).forEach((dateKey) => {
      if (dateKey < today)
        (updates as Record<string, FirebaseFirestore.FieldValue>)[dateKey] = FieldValue.delete();
    });
    if (Object.keys(updates).length) {
      await ref.set(updates, { merge: true });
    }
  }
);

/* ─────────────────────────────────────────────────────────────
 * 8) 닉네임 유니크 인덱스 (콜러블)
 * ───────────────────────────────────────────────────────────── */
const normalizeNickname = (raw: string): { lower: string; original: string } => {
  const original = String(raw || "").trim();
  const lower = original.toLocaleLowerCase();
  return { lower, original };
};

/** 회원가입 직후 닉네임 선점 */
export const claimNickname = onCall<{ nickname: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (req.data?.nickname || "").trim();
    if (!raw) throw new HttpsError("invalid-argument", "nickname이 필요합니다.");
    if (raw.length > 16) throw new HttpsError("invalid-argument", "닉네임은 16자 이내여야 합니다.");

    const { lower, original } = normalizeNickname(raw);
    const nickRef = db().doc(`nicknames/${lower}`);
    const profileRef = db().doc(`profiles/${uid}`);

    await db().runTransaction(async (tx) => {
      const nickSnap = await tx.get(nickRef);

      if (nickSnap.exists) {
        const owner = (nickSnap.data() || {}).ownerUid as string | undefined;
        if (owner && owner !== uid) {
          throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
        }
      } else {
        tx.set(nickRef, {
          ownerUid: uid,
          original,
          createdAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData);
      }

      // 프로필 동기화
      tx.set(
        profileRef,
        {
          nickname: original,
          nicknameLower: lower,
          nicknameUpdatedAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );
    });

    return { ok: true, nickname: original };
  }
);

/** 닉네임 변경 */
export const changeNickname = onCall<{ newNickname: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (req.data?.newNickname || "").trim();
    if (!raw) throw new HttpsError("invalid-argument", "newNickname이 필요합니다.");
    if (raw.length > 16) throw new HttpsError("invalid-argument", "닉네임은 16자 이내여야 합니다.");

    const { lower: newLower, original: newOriginal } = normalizeNickname(raw);
    const profileRef = db().doc(`profiles/${uid}`);
    const newNickRef = db().doc(`nicknames/${newLower}`);

    await db().runTransaction(async (tx) => {
      // ---- READ FIRST ----
      const pSnap = await tx.get(profileRef);
      const prevLower =
        (pSnap.exists ? (pSnap.get("nicknameLower") as string | undefined) : undefined) || undefined;

      const newSnap = await tx.get(newNickRef);

      let prevRef: FirebaseFirestore.DocumentReference | null = null;
      let prevSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      if (prevLower && prevLower !== newLower) {
        prevRef = db().doc(`nicknames/${prevLower}`);
        prevSnap = await tx.get(prevRef);
      }

      // 점유 가능 검사
      if (newSnap.exists) {
        const owner = (newSnap.data() || {}).ownerUid as string | undefined;
        if (owner && owner !== uid) {
          throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
        }
      }

      // ---- WRITE ONLY AFTER ALL READS ----
      tx.set(
        newNickRef,
        {
          ownerUid: uid,
          original: newOriginal,
          createdAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      tx.set(
        profileRef,
        {
          nickname: newOriginal,
          nicknameLower: newLower,
          nicknameUpdatedAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      if (prevLower && prevLower !== newLower && prevRef && prevSnap?.exists) {
        const prevOwner = (prevSnap.data() || {}).ownerUid as string | undefined;
        if (prevOwner === uid) {
          tx.delete(prevRef);
        }
      }
    });

    return { ok: true, nickname: newOriginal };
  }
);

/* ─────────────────────────────────────────────────────────────
 * 9) 계정 탈퇴(데이터 비식별 + 채팅/알림 정리) — 클라이언트가 reauth 후 호출
 * ───────────────────────────────────────────────────────────── */
async function deleteCollectionInBatches(
  colRef: FirebaseFirestore.CollectionReference,
  whereField?: string,
  whereEq?: unknown,
  batchSize = 250
) {
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = colRef.orderBy("__name__").limit(batchSize) as FirebaseFirestore.Query;
    if (whereField) q = q.where(whereField as never, "==", whereEq as never);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    const batch = db().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }
}

export const deleteMyAccount = onCall<unknown>(
  { region: "asia-northeast3", timeoutSeconds: 540 },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    // 1) 프로필/유저 비식별화 + 닉네임 인덱스 반납
    const userRef = db().doc(`users/${uid}`);
    const profRef = db().doc(`profiles/${uid}`);

    const profSnap = await profRef.get();
    const prevLower = profSnap.exists ? (profSnap.get("nicknameLower") as string | null) : null;

    await db().runTransaction(async (tx) => {
      // ---- READ FIRST (조건부) ----
      let nickRef: FirebaseFirestore.DocumentReference | null = null;
      let nSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      if (prevLower) {
        nickRef = db().doc(`nicknames/${prevLower}`);
        nSnap = await tx.get(nickRef);
      }

      // ---- WRITE(S) ----
      tx.set(
        userRef,
        {
          displayName: "(탈퇴한 사용자)",
          email: "",
          phone: "",
          profileImage: "",
          fcmTokens: [],
          deleted: true,
          deletedAt: FieldValue.serverTimestamp(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      tx.set(
        profRef,
        {
          displayName: "탈퇴한 사용자",
          photoURL: "",
          nickname: FieldValue.delete(),
          nicknameLower: FieldValue.delete(),
        } as FirebaseFirestore.DocumentData,
        { merge: true }
      );

      if (prevLower && nickRef && nSnap?.exists) {
        const owner = (nSnap.data() || {}).ownerUid as string | undefined;
        if (owner === uid) tx.delete(nickRef);
      }
    });

    // 2) 나의 채팅 스레드 요약/메타 삭제
    await deleteCollectionInBatches(db().collection(`chatSummaries/${uid}/threads`));
    await db().doc(`chatMeta/${uid}`).delete().catch(() => {});

    // 3) 알림 문서/아이템 삭제
    await deleteCollectionInBatches(db().collection(`notifications/${uid}/items`));
    await db().doc(`notifications/${uid}`).delete().catch(() => {});

    // 4) 참여중인 채팅에 나 자신 상태 마킹(숨김+나감+미읽음 0, 마지막 본 시각 기록)
    const chatQs = await db().collection("chats").where("participants", "array-contains", uid).get();
    if (!chatQs.empty) {
      const now = FieldValue.serverTimestamp();
      const batches: FirebaseFirestore.WriteBatch[] = [];
      let batch = db().batch();
      let count = 0;

      chatQs.docs.forEach((d) => {
        const ref = d.ref;
        batch.set(
          ref,
          {
            [`hidden.${uid}`]: true,
            [`hiddenAt.${uid}`]: now,
            [`left.${uid}`]: true,
            [`leftAt.${uid}`]: now,
            [`unreadCount.${uid}`]: 0,
            [`lastSeenAt.${uid}`]: now,
            lastUpdated: now,
          } as FirebaseFirestore.DocumentData,
          { merge: true }
        );
        count += 1;
        if (count % 400 === 0) {
          batches.push(batch);
          batch = db().batch();
        }
      });
      batches.push(batch);
      for (const b of batches) {
        await b.commit();
      }
    }

    // ✅ 5) 내가 올린 상품 전부 '아카이브' 처리 (가격 숨김 + 보존)
    const prods = await db().collection("products").where("sellerId", "==", uid).get();
    if (!prods.empty) {
      const now = FieldValue.serverTimestamp();
      const batches: FirebaseFirestore.WriteBatch[] = [];
      let batch = db().batch();
      let count = 0;

      prods.docs.forEach((d) => {
        const data = d.data() as { price?: number | null; completed?: boolean };
        const curPrice = typeof data?.price === "number" ? data.price : null;

        batch.set(
          d.ref,
          {
            status: "archived",
            sellerDeleted: true,          // ← 프론트/백 양쪽에서 거래 차단 신호
            archivedReason: "seller_deleted",
            archivedAt: now,
            updatedAt: now,

            archivedPrice: curPrice,      // ← 현재가 보존
            price: null,                  // ← 노출 가격 제거
            // 선택) 이미 completed가 아니라면 표시용 완료처리도 가능
            completed: data?.completed === true ? true : true,
            completedAt: FieldValue.serverTimestamp(),
          } as FirebaseFirestore.DocumentData,
          { merge: true }
        );

        count += 1;
        if (count % 400 === 0) {
          batches.push(batch);
          batch = db().batch();
        }
      });

      batches.push(batch);
      for (const b of batches) await b.commit();
    }

    // 최종 응답
    return { ok: true };
  }
);

/* ─────────────────────────────────────────────────────────────
 * NEW) 퀵퀴즈 0.01g 보너스 지급 (1인 1회, 아이덤포턴트)
 * 클라이언트: quizClient.js → callable("quizClaimGoldBonus")
 * 요구 파라미터: { score: number, attemptId?: string }
 * 조건: score >= 3
 * 저장: users/{uid}/promotions/gold_bonus_v1
 * 부가: 알림 생성
 * ───────────────────────────────────────────────────────────── */
export const quizClaimGoldBonus = onCall<{ score: number; attemptId?: string }>(
  { region: "asia-northeast3" },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const scoreRaw = Number(req.data?.score ?? 0);
    const attemptId =
      req.data?.attemptId ? String(req.data.attemptId).slice(0, 64) : "";

    if (!Number.isFinite(scoreRaw) || scoreRaw < 0) {
      throw new HttpsError("invalid-argument", "유효한 점수가 필요합니다.");
    }

    const PASSING_SCORE = 3;
    if (scoreRaw < PASSING_SCORE) {
      throw new HttpsError("failed-precondition", "아쉽지만 기준 점수 미달입니다.");
    }

    const promoRef = db().doc(`users/${uid}/promotions/gold_bonus_v1`);
    const CREDIT_G = 0.01;

    const res = await db().runTransaction(async (tx) => {
      const snap = await tx.get(promoRef);
      if (snap.exists) {
        const already = (snap.data() || {}) as { creditedG?: number };
        return { ok: true, alreadyClaimed: true, creditedG: Number(already.creditedG || 0) };
      }

      tx.set(promoRef, {
        creditedG: CREDIT_G,
        score: scoreRaw,
        attemptId: attemptId || null,
        claimedAt: FieldValue.serverTimestamp(),
        source: "quiz_gold_bonus_v1",
      });

      return { ok: true, alreadyClaimed: false, creditedG: CREDIT_G };
    });

    await addNotificationForUser(uid, {
      type: "promo_bonus",
      title: "퀵퀴즈 보너스 지급",
      body: `축하합니다! 0.01g 보너스가 적립되었습니다.`,
      link: "/profile",
      meta: { event: "gold_bonus_v1", creditedG: res.creditedG, score: scoreRaw },
    });

    return res;
  }
);
