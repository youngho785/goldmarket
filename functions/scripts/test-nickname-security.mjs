import assert from "node:assert/strict";
import test, { beforeEach, after } from "node:test";
import { initializeApp, getApps, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  checkNicknameAvailabilityForRequest,
  claimNicknameForUser,
  releaseNicknameOwnershipForDeletedUid,
} from "../lib/nicknameSecurity.js";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("FIRESTORE_EMULATOR_HOST가 없습니다. Firestore Emulator에서 실행하세요.");
}

const projectId = process.env.GCLOUD_PROJECT || "demo-goldmarket";
const app = getApps()[0] || initializeApp({ projectId });
const db = getFirestore(app);

const norm = (value) => ({
  original: String(value).trim(),
  lower: String(value).trim().toLocaleLowerCase(),
});

async function clearCollection(name) {
  while (true) {
    const snap = await db.collection(name).limit(250).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

beforeEach(async () => {
  await clearCollection("nicknames");
  await clearCollection("profiles");
  await clearCollection("users");
});

after(async () => {
  await deleteApp(app);
});

test("최초 선점은 nicknames/profiles/users를 함께 만든다", async () => {
  const result = await claimNicknameForUser(db, "u1", norm("골드맨"));
  assert.equal(result.nickname, "골드맨");
  assert.equal((await db.doc("nicknames/골드맨").get()).get("ownerUid"), "u1");
  assert.equal((await db.doc("profiles/u1").get()).get("nickname"), "골드맨");
  assert.equal((await db.doc("users/u1").get()).get("nickname"), "골드맨");
});

test("같은 UID의 같은 닉네임 재호출은 멱등 성공한다", async () => {
  await claimNicknameForUser(db, "u1", norm("Gold_User"));
  const second = await claimNicknameForUser(db, "u1", norm("Gold_User"));
  assert.equal(second.nickname, "Gold_User");
  const owned = await db.collection("nicknames").where("ownerUid", "==", "u1").get();
  assert.equal(owned.size, 1);
  const availability = await checkNicknameAvailabilityForRequest(db, "u1", norm("Gold_User"));
  assert.equal(availability.available, true);
  assert.equal(availability.ownedByMe, true);
});

test("같은 UID가 다른 닉네임을 추가 선점할 수 없다", async () => {
  await claimNicknameForUser(db, "u1", norm("첫닉네임"));
  await assert.rejects(() => claimNicknameForUser(db, "u1", norm("둘째닉네임")));
  assert.equal((await db.doc("nicknames/둘째닉네임").get()).exists, false);
});

test("다른 UID의 동일 닉네임 동시 선점은 정확히 한 명만 성공한다", async () => {
  const results = await Promise.allSettled([
    claimNicknameForUser(db, "u1", norm("동시닉")),
    claimNicknameForUser(db, "u2", norm("동시닉")),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  const nick = await db.doc("nicknames/동시닉").get();
  assert.equal(nick.exists, true);
  assert.ok(["u1", "u2"].includes(nick.get("ownerUid")));
});

test("본인 소유 닉네임은 가입 재시도 중복검사에서 사용 가능으로 본다", async () => {
  await claimNicknameForUser(db, "u1", norm("재시도닉"));
  const mine = await checkNicknameAvailabilityForRequest(db, "u1", norm("재시도닉"));
  const otherChoice = await checkNicknameAvailabilityForRequest(db, "u1", norm("다른새닉"));
  const stranger = await checkNicknameAvailabilityForRequest(db, "u2", norm("재시도닉"));
  const signedOut = await checkNicknameAvailabilityForRequest(db, undefined, norm("재시도닉"));
  assert.equal(mine.available, true);
  assert.equal(mine.reason, "owned-by-me");
  assert.equal(otherChoice.available, false);
  assert.equal(otherChoice.reason, "nickname-locked");
  assert.equal(stranger.available, false);
  assert.equal(signedOut.available, false);
});

test("users/profiles가 서로 다른 닉네임이면 실패하며 부분 쓰기를 남기지 않는다", async () => {
  await db.doc("profiles/u1").set({ nickname: "프로필닉", nicknameLower: "프로필닉" });
  await db.doc("users/u1").set({ nickname: "유저닉" });
  await assert.rejects(() => claimNicknameForUser(db, "u1", norm("새닉네임")));
  assert.equal((await db.doc("nicknames/새닉네임").get()).exists, false);
  assert.equal((await db.doc("profiles/u1").get()).get("nickname"), "프로필닉");
  assert.equal((await db.doc("users/u1").get()).get("nickname"), "유저닉");
});

test("레거시 본인 프로필만 있으면 같은 닉네임 선점 재호출로 인덱스를 복구한다", async () => {
  await db.doc("profiles/u1").set({ nickname: "복구닉", nicknameLower: "복구닉" });
  const result = await claimNicknameForUser(db, "u1", norm("복구닉"));
  assert.equal(result.nickname, "복구닉");
  assert.equal((await db.doc("nicknames/복구닉").get()).get("ownerUid"), "u1");
  assert.equal((await db.doc("users/u1").get()).get("nickname"), "복구닉");
});


test("Auth 삭제 후 닉네임 인덱스와 nickname 필드만 해제하고 다른 프로필 데이터는 보존한다", async () => {
  await claimNicknameForUser(db, "u1", norm("재사용닉"));
  await db.doc("profiles/u1").set({ displayName: "보존이름", photoURL: "photo" }, { merge: true });
  await db.doc("users/u1").set({ phone: "010-1234-5678" }, { merge: true });

  const released = await releaseNicknameOwnershipForDeletedUid(db, "u1");
  assert.equal(released.releasedIndexes, 1);
  assert.equal(released.clearedProfile, true);
  assert.equal(released.clearedUser, true);

  const profile = await db.doc("profiles/u1").get();
  const user = await db.doc("users/u1").get();
  assert.equal(profile.get("nickname"), undefined);
  assert.equal(profile.get("nicknameLower"), undefined);
  assert.equal(profile.get("displayName"), "보존이름");
  assert.equal(user.get("nickname"), undefined);
  assert.equal(user.get("phone"), "010-1234-5678");
  assert.equal((await db.doc("nicknames/재사용닉").get()).exists, false);

  const reclaimed = await claimNicknameForUser(db, "u2", norm("재사용닉"));
  assert.equal(reclaimed.nickname, "재사용닉");
  assert.equal((await db.doc("nicknames/재사용닉").get()).get("ownerUid"), "u2");
});

test("다른 UID 삭제 정리는 정상 소유자의 닉네임을 건드리지 않는다", async () => {
  await claimNicknameForUser(db, "u1", norm("보존닉"));
  const released = await releaseNicknameOwnershipForDeletedUid(db, "u2");
  assert.equal(released.releasedIndexes, 0);
  assert.equal((await db.doc("nicknames/보존닉").get()).get("ownerUid"), "u1");
  assert.equal((await db.doc("profiles/u1").get()).get("nickname"), "보존닉");
});
