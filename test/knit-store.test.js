import test from 'node:test';
import assert from 'node:assert/strict';
import { createKnitStore } from '../src/core/knit-store.js';

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

test('KnitStore initializes with an active part at row 0, empty row log, and paused timer', () => {
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => 1_000_000 });

  const part = store.getActivePart();
  assert.equal(part.currentRow, 0);
  assert.deepEqual(part.rowLog, []);
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 0);
});

test('incrementRow increases row count, logs timestamp, auto-starts paused timer, and persists', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.incrementRow();
  let part = store.getActivePart();
  assert.equal(part.currentRow, 1);
  assert.equal(store.isTimerRunning(), true);
  assert.deepEqual(part.rowLog, [
    { rowNumber: 1, timestamp: new Date(1_700_000_000_000).toISOString() }
  ]);

  // Advance 5 seconds and increment again: timer stays running, elapsed grows
  currentTime += 5000;
  store.incrementRow();
  part = store.getActivePart();
  assert.equal(part.currentRow, 2);
  assert.equal(store.getElapsedMs(), 5000);
  assert.equal(part.rowLog.length, 2);
  assert.equal(part.rowLog[1].rowNumber, 2);

  // Restoring from storage preserves row count, log, and running timer
  const restored = createKnitStore({ storage, now: () => currentTime + 3000 });
  assert.equal(restored.getActivePart().currentRow, 2);
  assert.equal(restored.getActivePart().rowLog.length, 2);
  assert.equal(restored.isTimerRunning(), true);
  assert.equal(restored.getElapsedMs(), 8000);
});

test('decrementRow decreases row count without going below 0 and removes last log entry', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.decrementRow();
  assert.equal(store.getActivePart().currentRow, 0);

  store.incrementRow();
  currentTime += 1000;
  store.incrementRow();
  assert.equal(store.getActivePart().currentRow, 2);
  assert.equal(store.getActivePart().rowLog.length, 2);

  store.decrementRow();
  assert.equal(store.getActivePart().currentRow, 1);
  assert.equal(store.getActivePart().rowLog.length, 1);
  assert.equal(store.getActivePart().rowLog[0].rowNumber, 1);

  const restored = createKnitStore({ storage, now: () => currentTime });
  assert.equal(restored.getActivePart().currentRow, 1);
  assert.equal(restored.getActivePart().rowLog.length, 1);
});

test('resetPart resets row count, clears row log, and resets paused timer', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.incrementRow();
  currentTime += 10_000;
  store.resetPart();

  assert.equal(store.getActivePart().currentRow, 0);
  assert.deepEqual(store.getActivePart().rowLog, []);
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 0);

  const restored = createKnitStore({ storage, now: () => currentTime + 5000 });
  assert.equal(restored.getActivePart().currentRow, 0);
  assert.deepEqual(restored.getActivePart().rowLog, []);
  assert.equal(restored.isTimerRunning(), false);
  assert.equal(restored.getElapsedMs(), 0);
});

test('timer supports manual start/pause/toggle and auto-resumes on incrementRow', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.startTimer();
  assert.equal(store.isTimerRunning(), true);

  currentTime += 4000;
  store.pauseTimer();
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 4000);

  // Time passes while paused — elapsed does not grow
  currentTime += 10_000;
  assert.equal(store.getElapsedMs(), 4000);

  // Incrementing row auto-resumes the paused timer
  store.incrementRow();
  assert.equal(store.isTimerRunning(), true);
  currentTime += 2500;
  assert.equal(store.getElapsedMs(), 6500);

  // toggleTimer pauses then resumes
  store.toggleTimer();
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 6500);

  store.toggleTimer();
  assert.equal(store.isTimerRunning(), true);
});
