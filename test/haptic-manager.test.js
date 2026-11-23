import test from 'node:test';
import assert from 'node:assert/strict';
import { createHapticManager } from '../src/core/haptic-manager.js';

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

test('HapticManager is disabled by default and does not vibrate', () => {
  let vibrateCalls = 0;
  const storage = createMemoryStorage();
  const manager = createHapticManager({
    storage,
    navigator: {
      vibrate() {
        vibrateCalls += 1;
        return true;
      }
    }
  });

  assert.equal(manager.isEnabled(), false);
  manager.trigger();
  assert.equal(vibrateCalls, 0);
});

test('HapticManager persists enabled state and vibrates when enabled', () => {
  /** @type {Array<number | number[]>} */
  const patterns = [];
  const storage = createMemoryStorage();
  const manager = createHapticManager({
    storage,
    navigator: {
      /** @param {number | number[]} pattern */
      vibrate(pattern) {
        patterns.push(pattern);
        return true;
      }
    }
  });

  manager.setEnabled(true);
  assert.equal(manager.isEnabled(), true);
  manager.trigger(15);
  assert.deepEqual(patterns, [15]);

  const restored = createHapticManager({ storage });
  assert.equal(restored.isEnabled(), true);
});
