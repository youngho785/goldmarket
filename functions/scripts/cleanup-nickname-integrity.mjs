import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  claimNicknameForUser,
  releaseNicknameOwnershipForDeletedUid,
} from "../lib/nicknameSecurity.js";

const EXPECTED_PROJECT_ID = "goldmarket-0";
const writeMode = process.argv.includes("--write");

if (!getApps().length) initializeApp({ projectId: EXPECTED_PROJECT_ID });
const db = getFirestore();
const auth = getAuth();

const text = (value) => (typeof value === "string" ? value.trim() : "");
const lower = (value) => text(value).toLocaleLowerCase();
const uniq = (values) => [...new Set(values.filter(Boolean))];

function jsonSafe(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      return { __type: "timestamp", value: value.toDate().toISOString() };
    }
    if (typeof value.path === "string" && value.firestore) {
      return { __type: "reference", path: value.path };
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, jsonSafe(v)]));
  }
  return value;
}

async function fetchAuthExisting(uids) {
  const existing = new Map();
  const ordered = [...new Set(uids.filter(Boolean))];
  for (let i = 0; i < ordered.length; i += 100) {
    const chunk = ordered.slice(i, i + 100);
    const result = await auth.getUsers(chunk.map((uid) => ({ uid })));
    for (const user of result.users) {
      existing.set(user.uid, {
        uid: user.uid,
        email: user.email || "",
        emailVerified: user.emailVerified === true,
        disabled: user.disabled === true,
      });
    }
  }
  return existing;
}

async function readState() {
  const [usersSnap, profilesSnap, nicknamesSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("profiles").get(),
    db.collection("nicknames").get(),
  ]);

  const users = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));
  const profiles = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const nicknames = new Map(nicknamesSnap.docs.map((doc) => [doc.id, doc.data()]));

  const ownerUids = nicknamesSnap.docs.map((doc) => text(doc.get("ownerUid"))).filter(Boolean);
  const allUids = uniq([...users.keys(), ...profiles.keys(), ...ownerUids]);
  const authExisting = await fetchAuthExisting(allUids);

  return { usersSnap, profilesSnap, nicknamesSnap, users, profiles, nicknames, authExisting };
}

function buildPlan(state) {
  const { users, profiles, nicknames, authExisting } = state;
  const releases = [];
  const repairs = [];
  const manual = [];

  const indexesByOwner = new Map();
  const indexesByLower = new Map();

  for (const [docId, data] of nicknames) {
    const ownerUid = text(data.ownerUid);
    const normalizedDocId = docId.toLocaleLowerCase();
    const byLower = indexesByLower.get(normalizedDocId) || [];
    byLower.push({ docId, ownerUid, original: text(data.original) });
    indexesByLower.set(normalizedDocId, byLower);

    if (!ownerUid) {
      manual.push({
        type: "nickname-index-missing-owner",
        nickname: docId,
        action: "manual-review",
      });
      continue;
    }
    const list = indexesByOwner.get(ownerUid) || [];
    list.push({ docId, original: text(data.original) });
    indexesByOwner.set(ownerUid, list);
  }

  const allUids = uniq([
    ...users.keys(),
    ...profiles.keys(),
    ...indexesByOwner.keys(),
  ]);

  // Auth가 없는 UID의 nickname 관련 흔적은 안전하게 해제 후보로 분류합니다.
  for (const uid of allUids) {
    if (authExisting.has(uid)) continue;
    const user = users.get(uid) || {};
    const profile = profiles.get(uid) || {};
    const owned = indexesByOwner.get(uid) || [];
    const hasNicknameEvidence = Boolean(
      text(user.nickname) ||
      text(profile.nickname) ||
      text(profile.nicknameLower) ||
      owned.length
    );
    if (!hasNicknameEvidence) continue;

    releases.push({
      uid,
      userNickname: text(user.nickname),
      profileNickname: text(profile.nickname),
      profileNicknameLower: text(profile.nicknameLower),
      nicknameIndexes: owned.map((item) => item.docId),
      action: "release-orphan-nickname-only",
    });
  }

  // 살아있는 Auth UID별 닉네임 증거를 모읍니다.
  const liveEvidence = new Map();
  for (const uid of allUids) {
    if (!authExisting.has(uid)) continue;
    const user = users.get(uid) || {};
    const profile = profiles.get(uid) || {};
    const owned = indexesByOwner.get(uid) || [];
    const evidenceLowers = uniq([
      lower(user.nickname),
      lower(profile.nickname),
      lower(profile.nicknameLower),
      ...owned.map((item) => item.docId.toLocaleLowerCase()),
    ]);

    if (evidenceLowers.length > 1) {
      manual.push({
        type: "live-user-conflicting-nickname-evidence",
        uid,
        evidence: evidenceLowers,
        userNickname: text(user.nickname),
        profileNickname: text(profile.nickname),
        profileNicknameLower: text(profile.nicknameLower),
        nicknameIndexes: owned.map((item) => item.docId),
        action: "manual-review",
      });
      continue;
    }
    if (evidenceLowers.length === 0) continue;

    const canonicalLower = evidenceLowers[0];
    const candidates = [
      text(profile.nickname),
      text(user.nickname),
      ...owned.map((item) => text(item.original)),
    ].filter((value) => lower(value) === canonicalLower);
    const canonicalOriginal = candidates[0] || canonicalLower;
    liveEvidence.set(uid, { canonicalLower, canonicalOriginal, user, profile, owned });
  }

  const liveClaimsByLower = new Map();
  for (const [uid, evidence] of liveEvidence) {
    const list = liveClaimsByLower.get(evidence.canonicalLower) || [];
    list.push(uid);
    liveClaimsByLower.set(evidence.canonicalLower, list);
  }

  for (const [nicknameLower, uids] of liveClaimsByLower) {
    if (uids.length > 1) {
      manual.push({
        type: "multiple-live-users-claim-same-nickname",
        nicknameLower,
        uids,
        action: "manual-review",
      });
    }
  }

  const manualUids = new Set(
    manual.flatMap((item) => Array.isArray(item.uids) ? item.uids : item.uid ? [item.uid] : [])
  );

  for (const [uid, evidence] of liveEvidence) {
    if (manualUids.has(uid)) continue;
    const { canonicalLower, canonicalOriginal, user, profile, owned } = evidence;
    const sameLowerIndexes = indexesByLower.get(canonicalLower) || [];

    const remainingSameLowerIndexes = sameLowerIndexes.filter(
      (item) => !item.ownerUid || authExisting.has(item.ownerUid)
    );
    if (remainingSameLowerIndexes.length > 1) {
      manual.push({
        type: "duplicate-normalized-nickname-indexes",
        uid,
        nicknameLower: canonicalLower,
        indexes: remainingSameLowerIndexes,
        action: "manual-review",
      });
      continue;
    }
    if (
      remainingSameLowerIndexes.length === 1 &&
      remainingSameLowerIndexes[0].ownerUid === uid &&
      remainingSameLowerIndexes[0].docId !== canonicalLower
    ) {
      manual.push({
        type: "noncanonical-nickname-index-id",
        uid,
        nicknameLower: canonicalLower,
        index: remainingSameLowerIndexes[0],
        action: "manual-review",
      });
      continue;
    }

    const canonicalIndex = nicknames.get(canonicalLower);
    if (canonicalIndex) {
      const ownerUid = text(canonicalIndex.ownerUid);
      if (!ownerUid) {
        manual.push({
          type: "canonical-index-missing-owner",
          uid,
          nicknameLower: canonicalLower,
          action: "manual-review",
        });
        continue;
      }
      if (ownerUid !== uid && authExisting.has(ownerUid)) {
        manual.push({
          type: "canonical-index-owned-by-other-live-user",
          uid,
          ownerUid,
          nicknameLower: canonicalLower,
          action: "manual-review",
        });
        continue;
      }
    }

    const userNickname = text(user.nickname);
    const profileNickname = text(profile.nickname);
    const profileLower = lower(profile.nicknameLower || profileNickname);
    const ownedCanonical = owned.some((item) => item.docId.toLocaleLowerCase() === canonicalLower);
    const exactCanonicalIndex = nicknames.get(canonicalLower);
    const indexCorrect = Boolean(
      exactCanonicalIndex &&
      text(exactCanonicalIndex.ownerUid) === uid &&
      lower(exactCanonicalIndex.original || canonicalOriginal) === canonicalLower
    );

    const needsRepair =
      lower(userNickname) !== canonicalLower ||
      lower(profileNickname) !== canonicalLower ||
      profileLower !== canonicalLower ||
      !ownedCanonical ||
      !indexCorrect;

    if (needsRepair) {
      repairs.push({
        uid,
        nickname: canonicalOriginal,
        nicknameLower: canonicalLower,
        userNickname,
        profileNickname,
        nicknameIndexes: owned.map((item) => item.docId),
        action: "repair-live-user-nickname",
      });
    }
  }

  return { releases, repairs, manual };
}

async function writeBackup(state, plan) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(here, "../..");
  const driveRoot = path.parse(projectRoot).root;
  const backupRoot = process.platform === "win32"
    ? path.join(driveRoot, "goldmarket-backups")
    : path.join(projectRoot, ".nickname-backups");
  fs.mkdirSync(backupRoot, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupRoot, `nickname-integrity-before-${stamp}.json`);

  const payload = {
    projectId: EXPECTED_PROJECT_ID,
    createdAt: new Date().toISOString(),
    plan,
    users: state.usersSnap.docs.map((doc) => ({ id: doc.id, data: jsonSafe(doc.data()) })),
    profiles: state.profilesSnap.docs.map((doc) => ({ id: doc.id, data: jsonSafe(doc.data()) })),
    nicknames: state.nicknamesSnap.docs.map((doc) => ({ id: doc.id, data: jsonSafe(doc.data()) })),
    authUsers: [...state.authExisting.values()],
  };

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), "utf8");
  return backupPath;
}

async function main() {
  const state = await readState();
  const plan = buildPlan(state);

  const output = {
    mode: writeMode ? "WRITE_REQUESTED" : "PREVIEW",
    projectId: EXPECTED_PROJECT_ID,
    counts: {
      users: state.usersSnap.size,
      profiles: state.profilesSnap.size,
      nicknames: state.nicknamesSnap.size,
      authUsersFound: state.authExisting.size,
      releaseOrphans: plan.releases.length,
      repairLiveUsers: plan.repairs.length,
      manualReview: plan.manual.length,
    },
    releaseOrphans: plan.releases,
    repairLiveUsers: plan.repairs,
    manualReview: plan.manual,
  };

  console.log(JSON.stringify(output, null, 2));

  if (!writeMode) {
    console.log("\nPREVIEW only. No data was changed.");
    if (plan.manual.length > 0) {
      console.log("Manual-review items exist. Do NOT run --write until they are reviewed.");
    } else {
      console.log("If this preview is approved, run the same command with -- --write.");
    }
    return;
  }

  if (plan.manual.length > 0) {
    throw new Error(
      `WRITE blocked: ${plan.manual.length} manual-review item(s) exist. No data was changed.`
    );
  }

  const backupPath = await writeBackup(state, plan);
  console.log(`\nBackup saved: ${backupPath}`);

  // 1) Auth가 없는 UID의 닉네임 흔적을 먼저 해제합니다.
  for (const item of plan.releases) {
    const result = await releaseNicknameOwnershipForDeletedUid(db, item.uid);
    console.log(JSON.stringify({ step: "release", uid: item.uid, result }));
  }

  // 2) 살아있는 Auth UID의 닉네임 3계층을 서버 helper로 복구합니다.
  for (const item of plan.repairs) {
    const result = await claimNicknameForUser(db, item.uid, {
      original: item.nickname,
      lower: item.nicknameLower,
    });
    console.log(JSON.stringify({ step: "repair", uid: item.uid, result }));
  }

  const after = await readState();
  const afterPlan = buildPlan(after);
  console.log("\nPOST_CHECK");
  console.log(JSON.stringify({
    counts: {
      releaseOrphans: afterPlan.releases.length,
      repairLiveUsers: afterPlan.repairs.length,
      manualReview: afterPlan.manual.length,
    },
    releaseOrphans: afterPlan.releases,
    repairLiveUsers: afterPlan.repairs,
    manualReview: afterPlan.manual,
  }, null, 2));

  if (
    afterPlan.releases.length > 0 ||
    afterPlan.repairs.length > 0 ||
    afterPlan.manual.length > 0
  ) {
    process.exitCode = 2;
    console.error("Cleanup completed, but nickname integrity still needs review.");
  } else {
    console.log("Nickname integrity cleanup completed successfully.");
  }
}

await main();
