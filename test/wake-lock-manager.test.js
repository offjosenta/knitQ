import test from 'node:test';
import assert from 'node:assert/strict';
import { createWakeLockManager } from '../src/core/wake-lock-manager.js';

test('WakeLockManager detects when wakeLock is supported or unsupported', () => {
  const supportedManager = createWakeLockManager({
    navigator: {
      wakeLock: { request: async () => ({ release: async () => {}, addEventListener: () => {} }) }
    }
  });
  assert.strictEqual(supportedManager.isSupported(), true);

  const unsupportedManager = createWakeLockManager({
    navigator: {}
  });
  assert.strictEqual(unsupportedManager.isSupported(), false);
});

test('WakeLockManager requests and holds screen wake lock', async () => {
  /** @type {string | null} */
  let requestedType = null;
  let released = false;
  const mockSentinel = {
    released: false,
    release: async () => {
      mockSentinel.released = true;
      released = true;
    },
    addEventListener: () => {}
  };

  const manager = createWakeLockManager({
    navigator: {
      wakeLock: {
        /**
         * @param {string} type
         */
        request: async (type) => {
          requestedType = type;
          return mockSentinel;
        }
      }
    }
  });

  assert.strictEqual(manager.isActive(), false);
  const success = await manager.request();
  assert.strictEqual(success, true);
  assert.strictEqual(requestedType, 'screen');
  assert.strictEqual(manager.isActive(), true);

  await manager.release();
  assert.strictEqual(released, true);
  assert.strictEqual(manager.isActive(), false);
});

test('WakeLockManager gracefully handles unsupported environment on request', async () => {
  const manager = createWakeLockManager({
    navigator: {}
  });

  const success = await manager.request();
  assert.strictEqual(success, false);
  assert.strictEqual(manager.isActive(), false);
  await manager.release(); // should not throw
});

test('WakeLockManager re-acquires lock on document visibilitychange when visible', async () => {
  let requestCount = 0;
  /** @type {Map<string, Function>} */
  const listeners = new Map();
  const mockDocument = {
    visibilityState: 'visible',
    /**
     * @param {string} event
     * @param {Function} handler
     */
    addEventListener: (event, handler) => listeners.set(event, handler),
    /**
     * @param {string} event
     */
    removeEventListener: (event) => listeners.delete(event)
  };

  /** @type {{ released: boolean, release: () => Promise<void>, addEventListener: (event: string, handler: Function) => void, _simulateSystemRelease: () => void } | null} */
  let currentSentinel = null;
  const createSentinel = () => {
    /** @type {Function | null} */
    let releaseHandler = null;
    const sentinel = {
      released: false,
      release: async () => {
        sentinel.released = true;
        if (releaseHandler) releaseHandler();
      },
      /**
       * @param {string} event
       * @param {Function} handler
       */
      addEventListener: (event, handler) => {
        if (event === 'release') releaseHandler = handler;
      },
      _simulateSystemRelease: () => {
        sentinel.released = true;
        if (releaseHandler) releaseHandler();
      }
    };
    currentSentinel = sentinel;
    return sentinel;
  };

  const manager = createWakeLockManager({
    navigator: {
      wakeLock: {
        request: async () => {
          requestCount++;
          return createSentinel();
        }
      }
    },
    document: mockDocument
  });

  await manager.request();
  assert.strictEqual(requestCount, 1);

  // Tab hidden - system automatically releases wake lock
  mockDocument.visibilityState = 'hidden';
  if (currentSentinel) {
    /** @type {{ _simulateSystemRelease: () => void }} */ (currentSentinel)._simulateSystemRelease();
  }
  const visibilityHandler = listeners.get('visibilitychange');
  assert.ok(visibilityHandler);
  await visibilityHandler();
  assert.strictEqual(requestCount, 1);

  // Tab becomes visible again - manager should re-acquire
  mockDocument.visibilityState = 'visible';
  await visibilityHandler();
  assert.strictEqual(requestCount, 2);

  // After explicit release, visibilitychange should NOT re-acquire
  await manager.release();
  if (currentSentinel) {
    /** @type {{ _simulateSystemRelease: () => void }} */ (currentSentinel)._simulateSystemRelease();
  }
  await visibilityHandler();
  assert.strictEqual(requestCount, 2);
});
