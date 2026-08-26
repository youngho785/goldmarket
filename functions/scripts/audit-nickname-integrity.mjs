import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp();
const db = getFirestore();
const auth = getAuth();

const lower = (value) => (typeof value === "string" ? value.trim().toLocaleLowerCase() : "");
const text = (value) => (typeof value === "string" ? value.trim() : "");

const [usersSnap, profilesSnap, nicknamesSnap] = await Promise.all([
  db.collection("users").get(),
  db.collection("profiles").get(),
  db.collection("nicknames").get(),
]);

const users = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));
const profiles = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
const nicknameOwners = new Map();
const issues = [];

for (const doc of nicknamesSnap.docs) {
  const ownerUid = text(doc.get("ownerUid"));
  const original = text(doc.get("original"));
  const docLower = doc.id.toLocaleLowerCase();
  if (!ownerUid) {
    issues.push({ type: "nickname-index-missing-owner", nickname: doc.id });
    continue;
  }
  const list = nicknameOwners.get(ownerUid) || [];
  list.push(doc.id);
  nicknameOwners.set(ownerUid, list);
  if (original && lower(original) !== docLower) {
    issues.push({ type: "nickname-index-original-mismatch", nickname: doc.id, ownerUid, original });
  }
}

for (const [uid, data] of users) {
  const userNickname = text(data.nickname);
  const profile = profiles.get(uid) || {};
  const profileNickname = text(profile.nickname);
  const profileLower = lower(profile.nicknameLower || profileNickname);
  const userLower = lower(userNickname);
  const owned = nicknameOwners.get(uid) || [];

  if (userLower && profileLower && userLower !== profileLower) {
    issues.push({ type: "user-profile-mismatch", uid, userNickname, profileNickname });
  }
  if (owned.length > 1) {
    issues.push({ type: "multiple-nickname-indexes", uid, nicknames: owned });
  }
  const expectedLower = profileLower || userLower;
  if (expectedLower && !owned.map((v) => v.toLocaleLowerCase()).includes(expectedLower)) {
    issues.push({ type: "missing-nickname-index", uid, expectedLower, userNickname, profileNickname });
  }
}

for (const [uid, data] of profiles) {
  if (users.has(uid)) continue;
  if (text(data.nickname) || text(data.nicknameLower)) {
    issues.push({ type: "profile-without-user-doc", uid, nickname: text(data.nickname) });
  }
}

const ownerUids = [...new Set(nicknamesSnap.docs.map((doc) => text(doc.get("ownerUid"))).filter(Boolean))];
const authExisting = new Set();
for (let i = 0; i < ownerUids.length; i += 100) {
  const chunk = ownerUids.slice(i, i + 100);
  const result = await auth.getUsers(chunk.map((uid) => ({ uid })));
  result.users.forEach((user) => authExisting.add(user.uid));
}
for (const uid of ownerUids) {
  if (!authExisting.has(uid)) {
    issues.push({ type: "nickname-owner-auth-missing", uid, nicknames: nicknameOwners.get(uid) || [] });
  }
}

console.log(JSON.stringify({
  mode: "READ_ONLY",
  counts: {
    users: usersSnap.size,
    profiles: profilesSnap.size,
    nicknames: nicknamesSnap.size,
    issues: issues.length,
  },
  issues,
}, null, 2));

if (issues.length > 0) process.exitCode = 2;
