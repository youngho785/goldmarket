// functions/cleanupAnonymousUsers.js
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

if (!getApps().length) initializeApp();
const auth = getAuth();
const db = getFirestore();

/**
 * 30일 이상 미접속 + 실데이터(favorites) 없음 → 익명계정/유저문서 정리
 * - 리전/타임존 고정(asia-northeast3 / Asia/Seoul)
 * - 페이지네이션 처리
 */
export const cleanupAnonymousUsers = onSchedule(
  { schedule: 'every 24 hours', timeZone: 'Asia/Seoul', region: 'asia-northeast3' },
  async () => {
    const CUTOFF = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let nextPageToken;
    do {
      const { users, pageToken } = await auth.listUsers(1000, nextPageToken);
      for (const u of users) {
        try {
          const isAnon = (u.providerData || []).length === 0;
          const last = u.metadata?.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : 0;
          if (!isAnon || last >= CUTOFF) continue;

          const favSnap = await db.collection('users').doc(u.uid).collection('favorites').limit(1).get();
          if (!favSnap.empty) continue;

          await auth.deleteUser(u.uid).catch(() => {});
          await db.collection('users').doc(u.uid).delete().catch(() => {});
        } catch {
          // 개별 유저 에러는 건너뜀(루프 지속)
        }
      }
      nextPageToken = pageToken;
    } while (nextPageToken);
  }
);
