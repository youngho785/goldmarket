// scripts/infer-firestore-schema.mjs
// Firestore에서 컬렉션/서브컬렉션을 샘플링해 "필드-타입" 스키마를 추론합니다.
// 실행: node scripts/infer-firestore-schema.mjs --sample 100 --depth 2

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────
// Args
const args = new Map(process.argv.slice(2).map(s => {
  const [k, v] = s.split('=');
  return [k.replace(/^--/, ''), v ?? true];
}));
const SAMPLE = Number(args.get('sample') ?? 50); // 컬렉션당 샘플 문서 수
const DEPTH  = Number(args.get('depth')  ?? 2);  // 서브컬렉션 추적 깊이
const OUT    = String(args.get('out')    ?? 'firestore-schema.json');
const SA     = args.get('sa'); // 서비스계정 json 경로 (옵션)

// ─────────────────────────────────────────────────────────────
// Init Admin
if (SA && fs.existsSync(SA)) {
  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(SA, 'utf8'))) });
} else {
  // GOOGLE_APPLICATION_CREDENTIALS 환경변수 또는 ADC를 사용
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

// ─────────────────────────────────────────────────────────────
// Utils: 타입 판별
function typeOf(v) {
  if (v === null) return 'null';
  if (v instanceof Timestamp) return 'timestamp';
  if (v instanceof GeoPoint) return 'geopoint';
  if (v && typeof v.toDate === 'function' && v.toDate() instanceof Date) return 'timestamp';
  const t = typeof v;
  if (Array.isArray(v)) return 'array';
  if (t === 'object')   return 'map';
  if (t === 'number')   return Number.isInteger(v) ? 'number' : 'number'; // 세분화 원하면 'double'등으로
  return t; // string, boolean 등
}

function mergeType(targetSet, newType) {
  targetSet.add(newType);
}

// 필드 구조 누적 (map/array 재귀)
function walkFields(base, data) {
  for (const [k, v] of Object.entries(data)) {
    const t = typeOf(v);
    if (!base[k]) base[k] = new Set();
    mergeType(base[k], t);
    if (t === 'map') {
      base[k + '.*'] = base[k + '.*'] || {};
      walkFields(base[k + '.*'], v);
    } else if (t === 'array') {
      // 배열 원소 타입 예시 기록
      const first = v.find(x => x !== null && x !== undefined);
      if (first !== undefined) {
        const at = typeOf(first);
        const key = k + '[]';
        base[key] = base[key] || new Set();
        mergeType(base[key], at);
        if (at === 'map') {
          base[k + '[].*'] = base[k + '[].*'] || {};
          walkFields(base[k + '[].*'], first);
        }
      }
    }
  }
}

// 출력 포맷 변환(Set → Array)
function toPrintable(schema) {
  const out = {};
  for (const [colPath, fields] of Object.entries(schema)) {
    out[colPath] = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v instanceof Set) out[colPath][k] = Array.from(v).sort();
      else if (typeof v === 'object') out[colPath][k] = toPrintable({ _: v })._ ;
      else out[colPath][k] = v;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 수집: 루트 컬렉션 → 각 문서 샘플링 → 서브컬렉션 재귀
async function listRootCollections() {
  // Admin SDK는 루트에서 listCollections() 지원
  const cols = await db.listCollections();
  return cols.map(c => ({ ref: c, path: c.id, depth: 0 }));
}

async function infer() {
  const schema = {}; // { 'chats': { field: Set(...) }, 'chats/{chatId}/messages': {...} }

  const queue = await listRootCollections();

  while (queue.length) {
    const { ref, path: colPath, depth } = queue.shift();
    const snap = await ref.limit(SAMPLE).get();
    if (!schema[colPath]) schema[colPath] = {};

    for (const doc of snap.docs) {
      walkFields(schema[colPath], doc.data() || {});

      // 서브컬렉션 (깊이 제한)
      if (depth < DEPTH) {
        const subcols = await doc.ref.listCollections();
        for (const sub of subcols) {
          const subPath = `${colPath}/{docId}/${sub.id}`;
          queue.push({ ref: sub, path: subPath, depth: depth + 1 });
        }
      }
    }
  }

  const printable = toPrintable(schema);
  const outPath = path.resolve(process.cwd(), OUT);
  fs.writeFileSync(outPath, JSON.stringify(printable, null, 2));
  console.log(`\n✅ Schema written to ${outPath}`);
  console.log('   (샘플 수, 깊이 등은 --sample, --depth로 조절하세요)');
}

infer().catch(e => {
  console.error('❌ Failed to infer schema:', e);
  process.exit(1);
});
