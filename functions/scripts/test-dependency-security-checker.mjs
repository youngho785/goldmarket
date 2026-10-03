import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checker = fileURLToPath(new URL('./test-dependency-security.mjs', import.meta.url));

function run(version, installed = version, name = 'brace-expansion') {
  const dir = mkdtempSync(path.join(tmpdir(), 'kgm-dependency-check-'));
  try {
    const key = `node_modules/${name}`;
    mkdirSync(path.join(dir, key), { recursive: true });
    writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify({ packages: { [key]: { version } } }));
    writeFileSync(path.join(dir, key, 'package.json'), JSON.stringify({ name, version: installed }));
    return spawnSync(process.execPath, [checker], { cwd: dir, encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function expectRejected(name, badVersion, pattern = /known vulnerable|must be >=/) {
  const result = run(badVersion, badVersion, name);
  assert.notEqual(result.status, 0, `${name}@${badVersion} should be rejected`);
  assert.match(result.stderr, pattern);
}

function expectAccepted(name, goodVersion) {
  const result = run(goodVersion, goodVersion, name);
  assert.equal(result.status, 0, result.stderr);
}

test('brace-expansion 1.1.20 is rejected and 1.1.21 is accepted', () => {
  expectRejected('brace-expansion', '1.1.20');
  expectAccepted('brace-expansion', '1.1.21');
});

test('brace-expansion 2.1.6 is rejected and 2.1.7 is accepted', () => {
  expectRejected('brace-expansion', '2.1.6');
  expectAccepted('brace-expansion', '2.1.7');
});

test('@fastify/busboy 3.2.1 is rejected and 3.2.2 is accepted', () => {
  expectRejected('@fastify/busboy', '3.2.1', /must be >= 3\.2\.2/);
  expectAccepted('@fastify/busboy', '3.2.2');
});

test('qs 6.15.3 is rejected and 6.16.0 is accepted', () => {
  expectRejected('qs', '6.15.3', /must be >= 6\.16\.0/);
  expectAccepted('qs', '6.16.0');
});

test('uuid 9.0.1 and 11.1.0 are rejected; 11.1.1 is accepted', () => {
  expectRejected('uuid', '9.0.1');
  expectRejected('uuid', '11.1.0');
  expectAccepted('uuid', '11.1.1');
});

test('stale node_modules is rejected', () => {
  const result = run('2.1.7', '2.1.4');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Lock\/install mismatch/);
});
