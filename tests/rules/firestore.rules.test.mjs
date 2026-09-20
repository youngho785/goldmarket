import fs from "node:fs";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const projectId = "goldmarket-rules-test";
const rules = fs.readFileSync(
  path.resolve(import.meta.dirname, "../../firestore.rules"),
  "utf8"
);
let env;

const verifiedContext = (uid, claims = {}) =>
  env.authenticatedContext(uid, { email_verified: true, ...claims });

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
    await setDoc(doc(db, "users", "admin"), {
      displayName: "관리자",
      role: "admin",
      disabled: false,
    });
    await setDoc(doc(db, "adminAuditLogs", "log-1"), {
      action: "exchange.status.changed",
    });
    await setDoc(doc(db, "notifications", "owner", "items", "notice-1"), {
      title: "예약 승인",
      read: false,
    });
    await setDoc(doc(db, "appConfig", "goldRates"), {
      version: 2,
      products: {
        "gold-18k-jewelry": { active: true, myGoldEnabled: true, exchangeEnabled: true },
        "gold-999-product": { active: true, myGoldEnabled: true, exchangeEnabled: true },
        "gold-pure-key": { active: true, myGoldEnabled: true, exchangeEnabled: true },
        "gold-disabled": { active: false, myGoldEnabled: true, exchangeEnabled: true }
      }
    });
    await setDoc(doc(db, "goldExchangeGroups", "group-owner"), {
      ownerUid: "owner",
      repStatus: "requested",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "goldExchanges", "exchange-owner-1"), {
      userId: "owner",
      groupId: "group-owner",
      status: "requested",
    });
    await setDoc(doc(db, "goldExchanges", "exchange-owner-2"), {
      userId: "legacy-other-id",
      participants: ["owner"],
      groupId: "group-owner",
      status: "requested",
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
  const db = verifiedContext("owner").firestore();
  await assertSucceeds(getDoc(doc(db, "users", "owner")));
  await assertFails(
    updateDoc(doc(db, "users", "owner"), {
      bonusGoldMilliGrams: 999999,
    })
  );
});

test("미인증 계정은 최소 가입 문서는 유지하지만 회원 전용 데이터에는 접근할 수 없다", async () => {
  const db = verifiedContext("owner", {
    email: "owner@example.com",
    email_verified: false,
  }).firestore();

  await assertFails(getDoc(doc(db, "users", "owner")));
  await assertSucceeds(
    updateDoc(doc(db, "users", "owner"), {
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(db, "users", "owner"), {
      phone: "010-1234-5678",
    })
  );
  await assertFails(
    getDoc(doc(db, "users", "owner", "goldVaultItems", "ring-1"))
  );
  await assertFails(getDoc(doc(db, "goldExchangeGroups", "group-owner")));
  await assertFails(
    getDoc(doc(db, "notifications", "owner", "items", "notice-1"))
  );
});

test("회원은 본인 예약 그룹의 상세 문서를 groupId로만 지연 조회할 수 있다", async () => {
  const ownerDb = verifiedContext("owner").firestore();
  const otherDb = verifiedContext("other").firestore();
  const ownerGroupQuery = query(
    collection(ownerDb, "goldExchanges"),
    where("groupId", "==", "group-owner")
  );
  const otherGroupQuery = query(
    collection(otherDb, "goldExchanges"),
    where("groupId", "==", "group-owner")
  );

  const ownerSnapshot = await assertSucceeds(getDocs(ownerGroupQuery));
  if (ownerSnapshot.size !== 2) {
    throw new Error(`expected 2 exchange details, got ${ownerSnapshot.size}`);
  }
  await assertFails(getDocs(otherGroupQuery));
});

test("관리자 감사 로그는 관리자만 읽을 수 있다", async () => {
  const ownerDb = verifiedContext("owner").firestore();
  const adminDb = verifiedContext("admin", { admin: true })
    .firestore();
  await assertFails(getDoc(doc(ownerDb, "adminAuditLogs", "log-1")));
  await assertSucceeds(getDoc(doc(adminDb, "adminAuditLogs", "log-1")));
});


test("관리자 claim이 남아 있어도 현재 role이 user이면 관리자 읽기를 차단한다", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", "stale-admin"), {
      role: "user",
      disabled: false,
    });
  });
  const staleAdminDb = verifiedContext("stale-admin", { admin: true })
    .firestore();
  await assertFails(getDoc(doc(staleAdminDb, "adminAuditLogs", "log-1")));
});

test("관리자 claim이 남아 있어도 disabled 계정은 관리자 읽기를 차단한다", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", "disabled-admin"), {
      role: "admin",
      disabled: true,
    });
  });
  const disabledAdminDb = verifiedContext("disabled-admin", { admin: true })
    .firestore();
  await assertFails(getDoc(doc(disabledAdminDb, "adminAuditLogs", "log-1")));
});

test("혜택 중복 방지 식별 기록은 클라이언트와 관리자 모두 직접 접근할 수 없다", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "benefitClaimLocks", "hash-1"), {
      identityType: "verified_email_sha256_v1",
      claims: { welcome: { claimed: true } },
    });
  });
  const ownerDb = verifiedContext("owner").firestore();
  const adminDb = verifiedContext("admin", { admin: true }).firestore();
  await assertFails(getDoc(doc(ownerDb, "benefitClaimLocks", "hash-1")));
  await assertFails(getDoc(doc(adminDb, "benefitClaimLocks", "hash-1")));
  await assertFails(
    setDoc(doc(ownerDb, "benefitClaimLocks", "forged"), {
      claims: { welcome: { claimed: false } },
    })
  );
});

test("회원은 자신의 문의만 유효한 형식으로 생성할 수 있다", async () => {
  const ownerDb = verifiedContext("owner").firestore();
  await assertSucceeds(
    setDoc(doc(ownerDb, "supportTickets", "ticket-1"), {
      title: "교환 문의",
      content: "방문 시간을 변경하고 싶습니다.",
      category: "inquiry",
      authorId: "owner",
      authorNickname: "고객",
      status: "open",
      relatedGroupId: "group-owner",
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
  await assertFails(
    setDoc(doc(ownerDb, "supportTickets", "ticket-3"), {
      title: "다른 교환건 문의",
      content: "소유하지 않은 교환건 연결 시도",
      category: "inquiry",
      authorId: "owner",
      authorNickname: "고객",
      status: "open",
      relatedGroupId: "group-other",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("회원은 자신의 알림만 읽음 처리할 수 있다", async () => {
  const ownerDb = verifiedContext("owner").firestore();
  const otherDb = verifiedContext("other").firestore();
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
  const adminDb = verifiedContext("admin", { admin: true })
    .firestore();

  await assertSucceeds(getDoc(doc(publicDb, "appConfig", "goldRates")));
  await assertFails(
    setDoc(doc(adminDb, "appConfig", "goldRates"), {
      purity: { forged: 1 },
    })
  );
});

test("환산율 이력은 관리자만 읽고 클라이언트는 쓸 수 없다", async () => {
  const ownerDb = verifiedContext("owner").firestore();
  const adminDb = verifiedContext("admin", { admin: true })
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
  const ownerDb = verifiedContext("owner").firestore();
  const otherDb = verifiedContext("other").firestore();
  const adminDb = verifiedContext("admin", { admin: true }).firestore();
  await assertSucceeds(getDoc(doc(ownerDb, "profiles", "owner")));
  await assertFails(getDoc(doc(otherDb, "profiles", "owner")));
  await assertSucceeds(getDoc(doc(adminDb, "profiles", "owner")));
});

test("회원은 임의의 사용자 필드를 추가할 수 없다", async () => {
  const ownerDb = verifiedContext("owner").firestore();
  await assertFails(updateDoc(doc(ownerDb, "users", "owner"), { arbitraryFlag: true }));
  await assertSucceeds(updateDoc(doc(ownerDb, "users", "owner"), { phone: "010-0000-0000" }));
});


test("회원은 users 닉네임을 직접 생성할 수 없다", async () => {
  const db = verifiedContext("new-owner").firestore();
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
  const db = verifiedContext("owner").firestore();
  await assertFails(updateDoc(doc(db, "users", "owner"), { nickname: "변경닉" }));
  await assertFails(updateDoc(doc(db, "users", "owner"), { nickname: deleteField() }));
  await assertSucceeds(updateDoc(doc(db, "users", "owner"), { phone: "010-1111-2222" }));
});

test("회원은 users 이메일을 Firebase Auth 이메일과 일치하게만 기록할 수 있다", async () => {
  const initialDb = verifiedContext("owner", {
      email: "owner@example.com",
      email_verified: false,
    })
    .firestore();
  const ref = doc(initialDb, "users", "owner");

  // 가입 직후 미인증 상태에서도 Auth에 등록된 자기 이메일의 최초 기록은 허용합니다.
  await assertSucceeds(updateDoc(ref, { email: "owner@example.com" }));
  await assertFails(updateDoc(ref, { email: "forged@example.com" }));

  // Firebase Auth에서 새 이메일 확인이 끝난 뒤의 인증 토큰만 이메일 변경을 허용합니다.
  const changedDb = verifiedContext("owner", {
      email: "new-owner@example.com",
      email_verified: true,
    })
    .firestore();
  const changedRef = doc(changedDb, "users", "owner");
  await assertSucceeds(updateDoc(changedRef, { email: "new-owner@example.com" }));
  await assertFails(updateDoc(changedRef, { email: "other@example.com" }));
  await assertFails(updateDoc(changedRef, { email: deleteField() }));
});

test("신규 회원은 이메일만으로 최소 users 문서를 만들 수 있다", async () => {
  const db = verifiedContext("minimal-new", {
      email: "minimal-new@example.com",
      email_verified: false,
    })
    .firestore();

  await assertSucceeds(
    setDoc(doc(db, "users", "minimal-new"), {
      email: "minimal-new@example.com",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("신규 users 문서의 이메일도 Firebase Auth 이메일과 일치해야 한다", async () => {
  // 이 테스트의 관심사는 이메일 위조 방지입니다.
  // 미인증 계정의 최소 필드 제한은 별도 테스트에서 검증합니다.
  const validDb = verifiedContext("email-new", {
      email: "email-new@example.com",
    })
    .firestore();

  await assertSucceeds(
    setDoc(doc(validDb, "users", "email-new"), {
      displayName: "신규회원",
      email: "email-new@example.com",
      createdAt: serverTimestamp(),
    })
  );

  const forgedDb = verifiedContext("email-forged", {
      email: "real@example.com",
    })
    .firestore();

  await assertFails(
    setDoc(doc(forgedDb, "users", "email-forged"), {
      displayName: "신규회원",
      email: "forged@example.com",
      createdAt: serverTimestamp(),
    })
  );
});

test("회원은 users createdAt을 최초 1회 서버시각으로만 설정할 수 있다", async () => {
  const db = verifiedContext("owner").firestore();
  const ref = doc(db, "users", "owner");

  await assertSucceeds(updateDoc(ref, { createdAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { createdAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { createdAt: deleteField() }));
});

test("회원은 가입 동의 원본을 최초 1회만 기록하고 필수 동의는 바꿀 수 없다", async () => {
  const db = verifiedContext("owner").firestore();
  const ref = doc(db, "users", "owner");

  await assertSucceeds(
    updateDoc(ref, {
      consents: {
        version: "v1.1",
        age14: { accepted: true, at: serverTimestamp() },
        tos: { accepted: true, at: serverTimestamp() },
        privacy: { accepted: true, at: serverTimestamp() },
        marketing: { accepted: false, at: serverTimestamp() },
      },
    })
  );

  await assertFails(
    updateDoc(ref, {
      "consents.tos": { accepted: false, at: serverTimestamp() },
    })
  );
  await assertFails(updateDoc(ref, { "consents.version": "forged-v9" }));
  await assertFails(updateDoc(ref, { "consents.privacy": deleteField() }));
});

test("회원은 마케팅 동의만 서버시각과 함께 변경할 수 있다", async () => {
  const db = verifiedContext("owner").firestore();
  const ref = doc(db, "users", "owner");

  await assertSucceeds(
    updateDoc(ref, {
      consents: {
        version: "v1.1",
        age14: { accepted: true, at: serverTimestamp() },
        tos: { accepted: true, at: serverTimestamp() },
        privacy: { accepted: true, at: serverTimestamp() },
        marketing: { accepted: false, at: serverTimestamp() },
      },
    })
  );

  await assertSucceeds(
    updateDoc(ref, {
      "consents.marketing": { accepted: true, at: serverTimestamp() },
    })
  );
  await assertFails(
    updateDoc(ref, {
      "consents.marketing": { accepted: true, at: new Date("2026-01-01T00:00:00Z") },
    })
  );
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
  const db = verifiedContext("owner").firestore();
  await assertFails(updateDoc(doc(db, "profiles", "owner"), { nickname: "위조닉" }));
  await assertFails(
    setDoc(doc(db, "nicknames", "위조닉"), { ownerUid: "owner", original: "위조닉" })
  );
});

test("회원은 자신의 내 금고 항목을 생성·조회·수정·삭제할 수 있다", async () => {
  const db = verifiedContext("owner").firestore();
  const ref = doc(db, "users", "owner", "goldVaultItems", "ring-1");

  await assertSucceeds(
    setDoc(ref, {
      label: "엄마에게 받은 반지",
      productId: "gold-18k-jewelry",
      goldType: "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
      weightG: 7.2,
      note: "기념품",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(
    updateDoc(ref, {
      label: "엄마에게 받은 18K 반지",
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(deleteDoc(ref));
});

test("내 금고 상세는 본인만 읽을 수 있고 관리자·다른 회원은 직접 열람할 수 없다", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", "owner", "goldVaultItems", "ring-1"), {
      label: "돌반지",
      productId: "gold-999-product",
      goldType: "순금 999제품(팔찌,목걸이, 반지,귀걸이)",
      weightG: 3.75,
      note: "",
      createdAt: new Date("2026-09-03T00:00:00Z"),
      updatedAt: new Date("2026-09-03T00:00:00Z"),
    });
  });

  const ownerDb = verifiedContext("owner").firestore();
  const otherDb = verifiedContext("other").firestore();
  const adminDb = verifiedContext("admin", { admin: true }).firestore();
  const itemRef = doc(ownerDb, "users", "owner", "goldVaultItems", "ring-1");

  await assertSucceeds(getDoc(itemRef));
  await assertFails(getDoc(doc(otherDb, "users", "owner", "goldVaultItems", "ring-1")));
  await assertFails(getDoc(doc(adminDb, "users", "owner", "goldVaultItems", "ring-1")));
  await assertFails(
    setDoc(doc(otherDb, "users", "owner", "goldVaultItems", "forged"), {
      label: "타인 금",
      productId: "gold-pure-key",
      goldType: "순금 열쇠",
      weightG: 10,
      note: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("기본 999.9 제품과 관리자 추가 제품은 MY GOLD 정책에 따라 저장할 수 있다", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const ref = doc(context.firestore(), "appConfig", "goldRates");
    const snap = await getDoc(ref);
    const products = snap.data()?.products || {};
    await setDoc(ref, {
      version: 3,
      products: {
        ...products,
        "custom-test-gold": { active: true, myGoldEnabled: true, exchangeEnabled: true },
        "custom-disabled-gold": { active: false, myGoldEnabled: true, exchangeEnabled: true },
      },
    });
  });

  const db = verifiedContext("owner").firestore();
  const base = {
    weightG: 3.75,
    note: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertSucceeds(setDoc(doc(db, "users", "owner", "goldVaultItems", "9999-bar"), {
    ...base,
    label: "999.9 골드바",
    productId: "gold-9999-bar",
    goldType: "999.9 골드바",
  }));

  await assertSucceeds(setDoc(doc(db, "users", "owner", "goldVaultItems", "custom"), {
    ...base,
    label: "관리자 추가 금",
    productId: "custom-test-gold",
    goldType: "관리자 추가 금",
  }));

  await assertFails(setDoc(doc(db, "users", "owner", "goldVaultItems", "disabled"), {
    ...base,
    label: "비활성 금",
    productId: "custom-disabled-gold",
    goldType: "비활성 금",
  }));
});

test("내 금고는 허용된 금 종류·무게·필드만 저장할 수 있다", async () => {
  const db = verifiedContext("owner").firestore();

  await assertFails(
    setDoc(doc(db, "users", "owner", "goldVaultItems", "bad-type"), {
      label: "알 수 없는 금",
      productId: "forged-product",
      goldType: "임의 금종류",
      weightG: 3.75,
      note: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  await assertFails(
    setDoc(doc(db, "users", "owner", "goldVaultItems", "forged-value"), {
      label: "위조 값",
      productId: "gold-pure-key",
      goldType: "순금 열쇠",
      weightG: 3.75,
      note: "",
      pureGoldG: 999999,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});
