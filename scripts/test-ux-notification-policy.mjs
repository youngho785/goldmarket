import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getNextMarketingPreferences, myGoldGoalServiceAllowed } from '../src/lib/notificationChannelPolicy.js';
import { myGoldGoalServiceAllowed as serverAllows } from '../functions/lib/notifications/shared.js';

const scenarios = [
  ['new account', {}, true],
  ['legacy whole-push OFF', { notificationPreferences: { allEnabled: false } }, false],
  ['user explicitly saves MY GOLD goals even if marketing is OFF', { notificationPreferences: { allEnabled: false, goldNews: false, myGoldGoalAlertsEnabled: true } }, true],
  ['user disables MY GOLD goals even if marketing is ON', { notificationPreferences: { allEnabled: true, goldNews: true, myGoldGoalAlertsEnabled: false } }, false],
  ['marketing consent absent, goals explicitly ON', { notificationPreferences: { myGoldGoalAlertsEnabled: true }, consents: { marketing: { accepted: false } } }, true],
];
for (const [title, data, expected] of scenarios) {
  test(title, () => {
    assert.equal(myGoldGoalServiceAllowed(data), expected);
    assert.equal(serverAllows(data), expected);
  });
}

test('marketing OFF does not disable service goals', () => {
  const start = { allEnabled: true, exchange: true, goldNews: true, benefits: true, myGoldGoalAlertsEnabled: true };
  const off = getNextMarketingPreferences(start, false);
  assert.deepEqual([off.allEnabled, off.goldNews, off.benefits, off.exchange, off.myGoldGoalAlertsEnabled], [true, false, false, true, true]);
  assert.equal(myGoldGoalServiceAllowed({ notificationPreferences: off }), true);
});

test('marketing ON restores older marketing preference without changing explicit goal opt-out', () => {
  const on = getNextMarketingPreferences({ allEnabled: false, myGoldGoalAlertsEnabled: false }, true);
  assert.equal(on.allEnabled, true);
  assert.equal(on.goldNews, true);
  assert.equal(on.myGoldGoalAlertsEnabled, false);
});

test('legacy all OFF remains OFF if customer only rejects marketing', () => {
  const off = getNextMarketingPreferences({ allEnabled: false }, false);
  assert.equal(off.allEnabled, false);
  assert.equal(off.goldNews, false);
});

test('MY GOLD save updates only its own nested notification preference', () => {
  const code = readFileSync('functions/src/notifications/myGoldAlerts.ts', 'utf8');
  assert.match(code, /notificationPreferences: \{ myGoldGoalAlertsEnabled: goals\.enabled \}/);
  assert.match(code, /return myGoldGoalServiceAllowed\(userData\) && hasServicePushTarget\(userData\)/);
});
