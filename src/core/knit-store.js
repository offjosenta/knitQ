export const KNIT_STORAGE_KEY = 'knitq_store_v1';

/**
 * @typedef {{ rowNumber: number, timestamp: string }} RowLogEntry
 * @typedef {{ elapsedMs: number, runningSince: number | null }} PartTimerState
 * @typedef {{
 *   id: string,
 *   name: string,
 *   currentRow: number,
 *   rowLog: RowLogEntry[],
 *   timer: PartTimerState
 * }} Part
 * @typedef {{
 *   id: string,
 *   name: string,
 *   parts: Part[],
 *   activePartId: string
 * }} Project
 * @typedef {{
 *   projects: Project[],
 *   activeProjectId: string
 * }} StoreState
 */

/**
 * @returns {StoreState}
 */
function createDefaultState() {
  const partId = 'part-1';
  const projectId = 'project-1';

  return {
    activeProjectId: projectId,
    projects: [
      {
        id: projectId,
        name: 'Шарф «Лицевая гладь»',
        activePartId: partId,
        parts: [
          {
            id: partId,
            name: 'Основное полотно',
            currentRow: 0,
            rowLog: [],
            timer: {
              elapsedMs: 0,
              runningSince: null
            }
          }
        ]
      }
    ]
  };
}

/**
 * @param {unknown} candidate
 * @returns {candidate is StoreState}
 */
function isValidStoreState(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = /** @type {{ projects?: unknown }} */ (candidate);
  if (!Array.isArray(obj.projects) || obj.projects.length === 0) return false;

  return obj.projects.every((project) => {
    if (!project || typeof project !== 'object') return false;
    if (!Array.isArray(project.parts) || project.parts.length === 0) return false;
    return project.parts.every((/** @type {any} */ part) => {
      return Boolean(
        part
        && typeof part === 'object'
        && typeof part.currentRow === 'number'
        && Array.isArray(part.rowLog)
        && part.timer
        && typeof part.timer.elapsedMs === 'number'
        && (part.timer.runningSince === null || typeof part.timer.runningSince === 'number')
      );
    });
  });
}

/**
 * @param {object} [options]
 * @param {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void } | null} [options.storage]
 * @param {() => number} [options.now]
 */
export function createKnitStore(options = {}) {
  const storage = options.storage !== undefined
    ? options.storage
    : (typeof localStorage !== 'undefined' ? localStorage : null);
  const now = options.now || (() => Date.now());

  /** @type {StoreState} */
  let state = createDefaultState();

  if (storage) {
    try {
      const raw = storage.getItem(KNIT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidStoreState(parsed)) {
          state = parsed;
        }
      }
    } catch {
      // Fallback to default state on corrupted storage
    }
  }

  /** @type {Set<() => void>} */
  const listeners = new Set();

  const persist = () => {
    if (storage) {
      try {
        storage.setItem(KNIT_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage quota errors
      }
    }
  };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  /**
   * @returns {Project}
   */
  const getActiveProject = () => {
    return state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0];
  };

  /**
   * @returns {Part}
   */
  const getActivePart = () => {
    const project = getActiveProject();
    return project.parts.find((part) => part.id === project.activePartId) || project.parts[0];
  };

  const commit = () => {
    persist();
    notify();
  };

  /**
   * @param {Part} part
   * @returns {number}
   */
  const getPartElapsedMs = (part) => {
    const { elapsedMs, runningSince } = part.timer;
    if (runningSince === null) {
      return elapsedMs;
    }
    return elapsedMs + Math.max(0, now() - runningSince);
  };

  return {
    getState() {
      return state;
    },

    getActiveProject,
    getActivePart,

    incrementRow() {
      const part = getActivePart();
      const timestampMs = now();
      part.currentRow += 1;
      part.rowLog.push({
        rowNumber: part.currentRow,
        timestamp: new Date(timestampMs).toISOString()
      });
      if (part.timer.runningSince === null) {
        part.timer.runningSince = timestampMs;
      }
      commit();
    },

    decrementRow() {
      const part = getActivePart();
      if (part.currentRow <= 0) {
        return;
      }
      part.currentRow -= 1;
      if (part.rowLog.length > 0) {
        part.rowLog.pop();
      }
      commit();
    },

    resetPart() {
      const part = getActivePart();
      part.currentRow = 0;
      part.rowLog = [];
      part.timer = {
        elapsedMs: 0,
        runningSince: null
      };
      commit();
    },

    isTimerRunning() {
      return getActivePart().timer.runningSince !== null;
    },

    startTimer() {
      const part = getActivePart();
      if (part.timer.runningSince !== null) {
        return;
      }
      part.timer.runningSince = now();
      commit();
    },

    pauseTimer() {
      const part = getActivePart();
      if (part.timer.runningSince === null) {
        return;
      }
      part.timer.elapsedMs = getPartElapsedMs(part);
      part.timer.runningSince = null;
      commit();
    },

    toggleTimer() {
      if (getActivePart().timer.runningSince !== null) {
        this.pauseTimer();
      } else {
        this.startTimer();
      }
    },

    getElapsedMs() {
      return getPartElapsedMs(getActivePart());
    },

    /**
     * @param {() => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
