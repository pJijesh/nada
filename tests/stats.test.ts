import assert from 'node:assert/strict';
import test from 'node:test';
import { pct, streakDays } from '../lib/stats';

test('pct rounds and handles zero', () => {
  assert.equal(pct(5, 8), 63);
  assert.equal(pct(0, 0), 0);
});

test('streak counts consecutive days ending today or yesterday', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  assert.equal(streakDays(['2026-10-21T08:00:00Z', '2026-10-20T20:00:00Z', '2026-10-19T09:00:00Z'], now), 3);
  assert.equal(streakDays(['2026-10-20T08:00:00Z', '2026-10-19T20:00:00Z'], now), 2);
  assert.equal(streakDays(['2026-10-18T08:00:00Z'], now), 0);
  assert.equal(streakDays([], now), 0);
  assert.equal(streakDays(['2026-10-21T08:00:00Z', '2026-10-19T08:00:00Z'], now), 1);
});
