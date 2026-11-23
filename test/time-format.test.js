import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, formatRowTimestamp } from '../src/core/time-format.js';

test('formatDuration formats milliseconds into HH:MM:SS', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(5000), '00:00:05');
  assert.equal(formatDuration(65_000), '00:01:05');
  assert.equal(formatDuration(3_661_000), '01:01:01');
  assert.equal(formatDuration(-1000), '00:00:00');
});

test('formatRowTimestamp formats ISO timestamp into local HH:MM:SS and DD.MM.YYYY', () => {
  const localDate = new Date(2026, 10, 23, 9, 5, 7); // 23.11.2026 09:05:07 local
  const result = formatRowTimestamp(localDate.toISOString());
  assert.deepEqual(result, {
    time: '09:05:07',
    date: '23.11.2026'
  });
});
