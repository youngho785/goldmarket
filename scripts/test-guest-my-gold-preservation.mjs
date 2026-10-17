import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Run the *actual local-storage implementation* with an isolated storage fake.
// Only the external gold-item validator is stubbed, not the save/append logic.
const source = readFileSync(new URL('../src/lib/myGoldGuestDemo.js', import.meta.url), 'utf8');
const executable = source
  .replace(/^import\s+\{[^}]*\}\s+from\s+["']@\/lib\/goldVaultCatalog["'];\s*/m, '')
  .replace(/\bexport\s+(?=(?:const|function)\b)/g, '');

function createHarness({ denyWrites = false } = {}) {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem(key, val) {
      if (denyWrites) throw new Error('storage denied');
      values.set(key, String(val));
    },
    removeItem: (key) => values.delete(key),
  };
  const validateGoldVaultValues = (item) => {
    if (!item?.productId || !(Number(item.weightG) > 0)) throw new Error('invalid gold item');
    return { label: String(item.label || '금제품'), productId: item.productId,
      goldType: String(item.goldType || '18K'), weightG: Number(item.weightG), note: String(item.note || '') };
  };
  const api = new Function('validateGoldVaultValues', 'localStorage', 'window', 'crypto',
    `${executable}\nreturn { saveGuestMyGoldItems, appendGuestMyGoldItem, readSavedGuestMyGoldItems, resetGuestMyGoldItems };`
  )(validateGoldVaultValues, localStorage, {}, { randomUUID: () => `${Math.random().toString(36).slice(2)}-${Date.now()}` });
  return { api, values };
}
const gold = (label, weightG) => ({ label, goldType: '18K', productId: 'gold-18k-jewelry', weightG });

test('calculator additions append: existing items and unique IDs survive', () => {
  const { api } = createHarness();
  api.appendGuestMyGoldItem(gold('첫 반지', 3.75));
  api.appendGuestMyGoldItem(gold('두 번째 반지', 7.5));
  const result = api.readSavedGuestMyGoldItems();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((x) => x.label), ['두 번째 반지', '첫 반지']);
  assert.notEqual(result[0].id, result[1].id);
});

test('editing and deleting still replace the complete list explicitly', () => {
  const { api } = createHarness();
  api.appendGuestMyGoldItem(gold('가', 3.75));
  api.appendGuestMyGoldItem(gold('나', 7.5));
  const items = api.readSavedGuestMyGoldItems();
  api.saveGuestMyGoldItems(items.map(x => x.label === '가' ? { ...x, note: '수정됨' } : x));
  assert.equal(api.readSavedGuestMyGoldItems().find(x => x.label === '가').note, '수정됨');
  api.saveGuestMyGoldItems(api.readSavedGuestMyGoldItems().filter(x => x.label !== '나'));
  assert.deepEqual(api.readSavedGuestMyGoldItems().map(x => x.label), ['가']);
});

test('guest capacity 30: reject the 31st without deleting any item', () => {
  const { api } = createHarness();
  for (let i = 0; i < 30; i++) api.appendGuestMyGoldItem(gold(`반지 ${i}`, i + 1));
  const before = api.readSavedGuestMyGoldItems();
  assert.throws(() => api.appendGuestMyGoldItem(gold('초과', 99)), /최대 30개/);
  assert.deepEqual(api.readSavedGuestMyGoldItems().map(x => x.id), before.map(x => x.id));
});

test('blocked browser storage surfaces an error instead of faking a saved record', () => {
  const { api } = createHarness({ denyWrites: true });
  assert.throws(() => api.appendGuestMyGoldItem(gold('실패', 3.75)), /저장하지 못했습니다/);
  assert.equal(api.readSavedGuestMyGoldItems().length, 0);
});

test('invalid input does not damage prior saved records', () => {
  const { api } = createHarness();
  api.appendGuestMyGoldItem(gold('유효', 7.5));
  assert.throws(() => api.appendGuestMyGoldItem(gold('비정상', -1)), /invalid gold item/);
  assert.deepEqual(api.readSavedGuestMyGoldItems().map(x => x.label), ['유효']);
});
