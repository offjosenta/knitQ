import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTimerGuard,
  AWAY_PROMPT_THRESHOLD_MS,
  IDLE_AUTO_PAUSE_THRESHOLD_MS
} from '../src/core/timer-guard.js';

/**
 * @param {Record<string, string>} [initial]
 */
function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    /** @param {string} key */
    getItem(key) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    /**
     * @param {string} key
     * @param {string} value
     */
    setItem(key, value) {
      store.set(key, String(value));
    }
  };
}

test('timer guard prompts on return after 5+ minutes with running timer and ignores shorter absences', () => {
  const storage = createMemoryStorage();
  const guard = createTimerGuard({ storage });
  const t0 = 1_700_000_000_000;

  // Leave for 4m 59s -> no prompt
  guard.markLeft(t0, true);
  const shortReturn = guard.evaluateReturn(t0 + AWAY_PROMPT_THRESHOLD_MS - 1000, true);
  assert.equal(shortReturn.shouldPrompt, false);

  // Leave for 5m 00s -> prompt with leftAtMs
  guard.markLeft(t0, true);
  // Persisted across reload
  const reloadedGuard = createTimerGuard({ storage });
  const longReturn = reloadedGuard.evaluateReturn(t0 + AWAY_PROMPT_THRESHOLD_MS, true);
  assert.equal(longReturn.shouldPrompt, true);
  assert.equal(longReturn.leftAtMs, t0);
  assert.equal(longReturn.awayMs, AWAY_PROMPT_THRESHOLD_MS);

  // Subsequent evaluateReturn without markLeft does not re-prompt
  const secondCheck = reloadedGuard.evaluateReturn(t0 + AWAY_PROMPT_THRESHOLD_MS + 10_000, true);
  assert.equal(secondCheck.shouldPrompt, false);
});

test('timer guard does not prompt on return if timer was paused', () => {
  const guard = createTimerGuard({ storage: createMemoryStorage() });
  const t0 = 1_700_000_000_000;

  guard.markLeft(t0, false);
  const res = guard.evaluateReturn(t0 + AWAY_PROMPT_THRESHOLD_MS + 60_000, false);
  assert.equal(res.shouldPrompt, false);
});

test('timer guard triggers auto-pause after 60 minutes without +1 row activity', () => {
  const guard = createTimerGuard({ storage: createMemoryStorage() });
  const t0 = 1_700_000_000_000;

  guard.recordRowActivity(t0);
  assert.equal(guard.evaluateIdle(t0 + IDLE_AUTO_PAUSE_THRESHOLD_MS - 1000, true).shouldAutoPause, false);

  // Activity resets the 60-minute window
  const t1 = t0 + 40 * 60_000;
  guard.recordRowActivity(t1);
  assert.equal(guard.evaluateIdle(t0 + IDLE_AUTO_PAUSE_THRESHOLD_MS, true).shouldAutoPause, false);

  // 60 minutes after t1 -> auto-pause
  const idleRes = guard.evaluateIdle(t1 + IDLE_AUTO_PAUSE_THRESHOLD_MS, true);
  assert.equal(idleRes.shouldAutoPause, true);
  assert.equal(idleRes.idleSinceMs, t1);
  assert.equal(idleRes.idleMs, IDLE_AUTO_PAUSE_THRESHOLD_MS);

  // Does not trigger if main timer is not running
  assert.equal(guard.evaluateIdle(t1 + IDLE_AUTO_PAUSE_THRESHOLD_MS, false).shouldAutoPause, false);
});
