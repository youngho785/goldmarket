import fs from "node:fs";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const projectId = "goldmarket-rules-test";
const rules = fs.readFileSync(
  path.resolve(import.meta.dirname, "../../firestore.rules"),
  "utf8"
);
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "owner"), {
      displayName: "고객",
      nickname: "골드고객",
      bonusGoldMilliGrams: 10,
    });
    await setDoc(doc(db, "adminAuditLogs", "log-1"), {
      action: "exchange.status.changed",
    });
    await setDoc(doc(db, "notifications", "owner", "items", "notice-1"), {
      title: "예약 승인",
      read: false,
    });
  });
});

after(async () => {
  await env.cleanup();
});

test("비로그인 사용자는 회원 문서를 읽을 수 없다", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "users", "owner")));
});

test("회원은 본인 문서를 읽되 보너스 잔액은 바꿀 수 없다", async () => {
  const db = env.authenticatedContext("owner").firestore();
  await assertSucceeds(getDoc(doc(db, "users", "owner")));
  await assertFails(
    updateDoc(doc(db, "users", "owner"), {
      bonusGoldMilliGrams: 999999,
    })
  );
});

test("관리자 감사 로그는 관리자만 읽을 수 있다", async () => {
  const ownerDb = env.authenticatedContext("owner").firestore();
  const adminDb = env
    .authenticatedContext("admin", { admin: true })
    .firestore();
  await assertFails(getDoc(doc(ownerDb, "adminAuditLogs", "log-1")));
  await assertSucceeds(getDoc(doc(adminDb, "adminAuditLogs", "log-1")));
});

test("회원은 자신의 문의만 유효한 형식으로 생성할 수 있다", async () => {
  const ownerDb = env.authenticatedContext("owner").firestore();
  await assertSucceeds(
    setDoc(doc(ownerDb, "supportTickets", "ticket-1"), {
      title: "교환 문의",
      content: "방문 시간을 변경하고 싶습니다.",
      category: "inquiry",
      authorId: "owner",
      authorNickname: "고객",
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    setDoc(doc(ownerDb, "supportTickets", "ticket-2"), {
      title: "위조 문의",
      content: "다른 회원 명의로 작성",
      category: "inquiry",
      authorId: "other",
      authorNickname: "고객",
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("회원은 자신의 알림만 읽음 처리할 수 있다", async () => {
  const ownerDb = env.authenticatedContext("owner").firestore();
  const otherDb = env.authenticatedContext("other").firestore();
  const ref = doc(ownerDb, "notifications", "owner", "items", "notice-1");
  await assertSucceeds(
    updateDoc(ref, { read: true, readAt: serverTimestamp() })
  );
  await assertFails(
    updateDoc(
      doc(otherDb, "notifications", "owner", "items", "notice-1"),
      { read: true, readAt: serverTimestamp() }
    )
  );
});

test("환산율은 공개 조회되지만 클라이언트가 덮어쓸 수 없다", async () => {
  const publicDb = env.unauthenticatedContext().firestore();
  const adminDb = env
    .authenticatedContext("admin", { admin: true })
    .firestore();

  await assertSucceeds(getDoc(doc(publicDb, "appConfig", "goldRates")));
  await assertFails(
    setDoc(doc(adminDb, "appConfig", "goldRates"), {
      purity: { forged: 1 },
    })
  );
});

test("환산율 이력은 관리자만 읽고 클라이언트는 쓸 수 없다", async () => {
  const ownerDb = env.authenticatedContext("owner").firestore();
  const adminDb = env
    .authenticatedContext("admin", { admin: true })
    .firestore();

  await assertFails(getDoc(doc(ownerDb, "goldRateHistory", "history-1")));
  await assertSucceeds(getDoc(doc(adminDb, "goldRateHistory", "history-1")));
  await assertFails(
    setDoc(doc(adminDb, "goldRateHistory", "history-1"), { version: 2 })
  );
});


test("공개 appConfig는 필요한 문서만 읽을 수 있다", async () => {
  const publicDb = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(publicDb, "appConfig", "bookingAvailability")));
  await assertFails(getDoc(doc(publicDb, "appConfig", "internalSecrets")));
});

test("회원 프로필은 본인과 관리자만 읽을 수 있다", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "profiles", "owner"), {
      displayName: "고객",
      nickname: "골드고객",
      nicknameLower: "골드고객",
      photoURL: "",
    });
  });
  const ownerDb = env.authenticatedContext("owner").firestore();
  const otherDb = env.authenticatedContext("other").firestore();
  const adminDb = env.authenticatedContext("admin", { admin: true }).firestore();
  await assertSucceeds(getDoc(doc(ownerDb, "profiles", "owner")));
  await assertFails(getDoc(doc(otherDb, "profiles", "owner")));
  await assertSucceeds(getDoc(doc(adminDb, "profiles", "owner")));
});

test("회원은 임의의 사용자 필드를 추가할 수 없다", async () => {
  const ownerDb = env.authenticatedContext("owner").firestore();
  await assertFails(updateDoc(doc(ownerDb, "users", "owner"), { arbitraryFlag: true }));
  await assertSucceeds(updateDoc(doc(ownerDb, "users", "owner"), { phone: "010-0000-0000" }));
});


test("회원은 users 닉네임을 직접 생성할 수 없다", async () => {
  const db = env.authenticatedContext("new-owner").firestore();
  await assertFails(
    setDoc(doc(db, "users", "new-owner"), {
      displayName: "신규회원",
      nickname: "직접닉",
      email: "new@example.com",
      createdAt: serverTimestamp(),
    })
  );
});

test("회원은 users 닉네임을 직접 변경하거나 삭제할 수 없다", async () => {
  const db = env.authenticatedContext("owner").firestore();
  await assertFails(updateDoc(doc(db, "users", "owner"), { nickname: "변경닉" }));
  await assertFails(updateDoc(doc(db, "users", "owner"), { nickname: deleteField() }));
  await assertSucceeds(updateDoc(doc(db, "users", "owner"), { phone: "010-1111-2222" }));
});

test("회원은 profiles 닉네임과 nicknames 인덱스를 직접 쓸 수 없다", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "profiles", "owner"), {
      displayName: "고객",
      nickname: "골드고객",
      nicknameLower: "골드고객",
      photoURL: "",
    });
  });
  const db = env.authenticatedContext("owner").firestore();
  await assertFails(updateDoc(doc(db, "profiles", "owner"), { nickname: "위조닉" }));
  await assertFails(
    setDoc(doc(db, "nicknames", "위조닉"), { ownerUid: "owner", original: "위조닉" })
  );
});
