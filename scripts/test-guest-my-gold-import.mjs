import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the real import-draft implementation. Stub only catalog/price
// dependencies; do not mock the save, read, sanitization or localStorage logic.
const source = readFileSync(new URL('../src/lib/goldVaultImportDraft.js', import.meta.url), 'utf8');
const executable = source
  .replace(/^import\s+\{[^}]*\}\s+from\s+["']@\/lib\/(goldRates|goldVaultCatalog)["'];\s*/gm, '')
  .replace(/\bexport\s+(?=(?:const|function)\b)/g, '');

function harness({ denyWrite = false } = {}) {
  const memory = new Map();
  const localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem(key, value) {
      if (denyWrite) throw new Error('storage denied');
      memory.set(key, String(value));
    },
    removeItem: (key) => memory.delete(key),
  };
  const validateGoldVaultValues = (x) => {
    if (!x || !x.productId || !(Number(x.weightG) > 0)) throw new Error('invalid gold');
    return {
      label: String(x.label || '금제품'), productId: String(x.productId),
      goldType: String(x.goldType || '18K'), weightG: Number(x.weightG), note: String(x.note || ''),
    };
  };
  const api = new Function(
    'localStorage', 'window', 'DON_TO_GRAMS', 'GOLD_VAULT_MAX_ITEMS', 'GOLD_VAULT_MAX_WEIGHT_G',
    'getGoldVaultTypeLabel', 'isSupportedGoldVaultType', 'validateGoldVaultValues',
    `${executable}\nreturn { saveGoldVaultGuestDraft, readGoldVaultImportDraft, saveGoldVaultImportDraft, clearGoldVaultImportDraft };`
  )(localStorage, {}, 3.75, 30, 10000, (x) => x || '금제품', (x) => x === '18K', validateGoldVaultValues);
  return { api, memory };
}
const gold = (i) => ({ label: `반지 ${i}`, productId: '18k-jewelry', goldType: '18K', weightG: i + 1, note: `기록 ${i}` });

test('guest MY GOLD 30-item limit round-trips through sign-up draft without dropping 21–30', () => {
  const { api } = harness();
  const records = Array.from({ length: 30 }, (_, i) => gold(i));
  assert.equal(api.saveGoldVaultGuestDraft(records).items.length, 30);
  const after = api.readGoldVaultImportDraft('guest-my-gold');
  assert.equal(after.items.length, 30);
  assert.deepEqual(after.items, records);
});

test('31st guest record is rejected, not silently truncated', () => {
  const { api } = harness();
  assert.throws(() => api.saveGoldVaultGuestDraft(Array.from({ length: 31 }, (_, i) => gold(i))), /최대 30개/);
  assert.equal(api.readGoldVaultImportDraft('guest-my-gold'), null);
});

test('invalid guest item blocks incomplete migration and leaves prior draft unchanged', () => {
  const { api } = harness();
  api.saveGoldVaultGuestDraft([gold(0)]);
  assert.throws(() => api.saveGoldVaultGuestDraft([gold(1), {...gold(2), weightG:-1}]), /확인이 필요한/);
  assert.deepEqual(api.readGoldVaultImportDraft('guest-my-gold').items, [gold(0)]);
});

test('blocked browser storage rejects guest import draft rather than claiming success', () => {
  const { api } = harness({ denyWrite: true });
  assert.throws(() => api.saveGoldVaultGuestDraft([gold(0)]), /임시 저장하지 못했습니다/);
});

test('corrupted partial guest draft is not presented as a full transfer', () => {
  const { api, memory } = harness();
  api.saveGoldVaultGuestDraft([gold(0), gold(1)]);
  const key = [...memory.keys()][0];
  const draft = JSON.parse(memory.get(key));
  draft.items[1].weightG = -1;
  memory.set(key, JSON.stringify(draft));
  assert.equal(api.readGoldVaultImportDraft('guest-my-gold'), null);
  assert.ok(memory.has(key), 'do not erase the draft or guest data while diagnosing failed migration');
});

test('GOLD TO GOLD calculator import stays at the original 20 product cap', () => {
  const { api } = harness();
  const products = Array.from({ length: 25 }, (_, i) => ({
    goldType: '18K', productId: '18k-jewelry', quantity: i + 1, inputUnit: 'g',
  }));
  assert.equal(api.saveGoldVaultImportDraft(products).items.length, 20);
  assert.equal(api.readGoldVaultImportDraft('gold-exchange-calculator').items.length, 20);
});
