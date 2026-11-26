export const TIMER_GUARD_STORAGE_KEY = 'knitq_timer_guard_v1';
export const AWAY_PROMPT_THRESHOLD_MS = 5 * 60_000;
export const IDLE_AUTO_PAUSE_THRESHOLD_MS = 60 * 60_000;

/**
 * @typedef {{
 *   leftAtMs: number | null,
 *   lastRowActivityMs: number | null
 * }} TimerGuardState
 */

/**
 * Creates a persistent timer guard that tracks background departure and +1 row inactivity.
 * @param {object} [options]
 * @param {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void } | null} [options.storage]
 */
export function createTimerGuard(options = {}) {
  const storage = options.storage !== undefined
    ? options.storage
    : (typeof localStorage !== 'undefined' ? localStorage : null);

  /** @type {TimerGuardState} */
  let state = {
    leftAtMs: null,
    lastRowActivityMs: null
  };

  if (storage) {
    try {
      const raw = storage.getItem(TIMER_GUARD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.leftAtMs === 'number' && Number.isFinite(parsed.leftAtMs)) {
            state.leftAtMs = parsed.leftAtMs;
          }
          if (typeof parsed.lastRowActivityMs === 'number' && Number.isFinite(parsed.lastRowActivityMs)) {
            state.lastRowActivityMs = parsed.lastRowActivityMs;
          }
        }
      }
    } catch {
      // Ignore corrupted guard storage
    }
  }

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(TIMER_GUARD_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  };

  return {
    /**
     * Records when the user leaves/hides the app while a timer is running.
     * @param {number} nowMs
     * @param {boolean} isAnyTimerRunning
     */
    markLeft(nowMs, isAnyTimerRunning) {
      if (!isAnyTimerRunning) {
        if (state.leftAtMs !== null) {
          state.leftAtMs = null;
          persist();
        }
        return;
      }
      if (state.leftAtMs === null) {
        state.leftAtMs = nowMs;
        persist();
      }
    },

    /**
     * Evaluates whether the away duration warrants a keep/trim prompt on return.
     * @param {number} nowMs
     * @param {boolean} isAnyTimerRunning
     * @returns {{ shouldPrompt: boolean, leftAtMs: number | null, awayMs: number }}
     */
    evaluateReturn(nowMs, isAnyTimerRunning) {
      const leftAtMs = state.leftAtMs;
      if (state.leftAtMs !== null) {
        state.leftAtMs = null;
        persist();
      }

      if (!isAnyTimerRunning || leftAtMs === null) {
        return { shouldPrompt: false, leftAtMs: null, awayMs: 0 };
      }

      const awayMs = Math.max(0, nowMs - leftAtMs);
      return {
        shouldPrompt: awayMs >= AWAY_PROMPT_THRESHOLD_MS,
        leftAtMs,
        awayMs
      };
    },

    /**
     * Records a +1 row tap or timer start baseline.
     * @param {number} nowMs
     */
    recordRowActivity(nowMs) {
      state.lastRowActivityMs = nowMs;
      persist();
    },

    /**
     * Ensures lastRowActivityMs is initialized when the main timer starts and cleared when stopped.
     * @param {number} nowMs
     * @param {boolean} isMainTimerRunning
     */
    ensureActivityBaseline(nowMs, isMainTimerRunning) {
      if (isMainTimerRunning) {
        if (state.lastRowActivityMs === null) {
          state.lastRowActivityMs = nowMs;
          persist();
        }
      } else if (state.lastRowActivityMs !== null) {
        state.lastRowActivityMs = null;
        persist();
      }
    },

    /**
     * Checks whether the main timer has been running for 60+ minutes without +1 row taps.
     * @param {number} nowMs
     * @param {boolean} isMainTimerRunning
     * @returns {{ shouldAutoPause: boolean, idleSinceMs: number | null, idleMs: number }}
     */
    evaluateIdle(nowMs, isMainTimerRunning) {
      if (!isMainTimerRunning || state.lastRowActivityMs === null) {
        return { shouldAutoPause: false, idleSinceMs: null, idleMs: 0 };
      }
      const idleMs = Math.max(0, nowMs - state.lastRowActivityMs);
      return {
        shouldAutoPause: idleMs >= IDLE_AUTO_PAUSE_THRESHOLD_MS,
        idleSinceMs: state.lastRowActivityMs,
        idleMs
      };
    }
  };
}
