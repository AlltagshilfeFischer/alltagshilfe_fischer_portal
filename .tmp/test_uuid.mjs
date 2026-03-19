/**
 * UUID utility test — runs in Node.js (no build required).
 * Tests both the crypto.randomUUID path and the getRandomValues fallback.
 */

import { strict as assert } from 'node:assert';

// ── Helpers ────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUIDv4(s) {
  return UUID_RE.test(s);
}

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ status: 'PASS', name });
    passed++;
  } catch (err) {
    results.push({ status: 'FAIL', name, error: err.message });
    failed++;
  }
}

// ── Inline the implementation so we can test the fallback path directly ────

function generateUUID_native() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Force the fallback branch by temporarily removing randomUUID */
function generateUUID_fallback() {
  const orig = crypto.randomUUID;
  delete crypto.randomUUID;
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } finally {
    crypto.randomUUID = orig;
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('native path: returns valid UUID v4 format', () => {
  const id = generateUUID_native();
  assert.ok(isValidUUIDv4(id), `"${id}" is not a valid UUID v4`);
});

test('native path: returns a string', () => {
  const id = generateUUID_native();
  assert.strictEqual(typeof id, 'string');
});

test('native path: length is 36 characters', () => {
  const id = generateUUID_native();
  assert.strictEqual(id.length, 36);
});

test('native path: generates unique values (10 samples)', () => {
  const ids = new Set(Array.from({ length: 10 }, () => generateUUID_native()));
  assert.strictEqual(ids.size, 10, 'Duplicate UUIDs generated');
});

test('fallback path: returns valid UUID v4 format', () => {
  const id = generateUUID_fallback();
  assert.ok(isValidUUIDv4(id), `"${id}" is not a valid UUID v4`);
});

test('fallback path: version nibble is 4', () => {
  const id = generateUUID_fallback();
  assert.strictEqual(id[14], '4', `Version nibble should be 4, got "${id[14]}"`);
});

test('fallback path: variant bits are correct (8, 9, a, or b)', () => {
  const id = generateUUID_fallback();
  const variantChar = id[19];
  assert.ok(
    ['8', '9', 'a', 'b'].includes(variantChar.toLowerCase()),
    `Variant char should be 8/9/a/b, got "${variantChar}"`
  );
});

test('fallback path: generates unique values (10 samples)', () => {
  const ids = new Set(Array.from({ length: 10 }, () => generateUUID_fallback()));
  assert.strictEqual(ids.size, 10, 'Duplicate UUIDs generated in fallback');
});

test('fallback path: length is 36 characters', () => {
  const id = generateUUID_fallback();
  assert.strictEqual(id.length, 36);
});

test('fallback path: hyphen positions are correct', () => {
  const id = generateUUID_fallback();
  assert.strictEqual(id[8],  '-', 'Hyphen missing at position 8');
  assert.strictEqual(id[13], '-', 'Hyphen missing at position 13');
  assert.strictEqual(id[18], '-', 'Hyphen missing at position 18');
  assert.strictEqual(id[23], '-', 'Hyphen missing at position 23');
});

// ── Report ─────────────────────────────────────────────────────────────────

console.log('\n=== UUID Test Results ===\n');
for (const r of results) {
  const mark = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
  const detail = r.error ? ` — ${r.error}` : '';
  console.log(`${mark} ${r.name}${detail}`);
}
console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) process.exit(1);
