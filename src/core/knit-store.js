export const KNIT_STORAGE_KEY = 'knitq_store_v1';

/**
 * @typedef {{ rowNumber: number, timestamp: string }} RowLogEntry
 * @typedef {{ elapsedMs: number, runningSince: number | null }} PartTimerState
 * @typedef {import('./checkpoint-engine.js').RowRule} RowRule
 * @typedef {import('./checkpoint-engine.js').RowMarker} RowMarker
 * @typedef {{
 *   id: string,
 *   name: string,
 *   currentRow: number,
 *   rowLog: RowLogEntry[],
 *   timer: PartTimerState,
 *   stitchCheckInterval: number | null,
 *   targetStitchCount: number | null,
 *   actualStitchCount: number | null,
 *   rowRules: RowRule[],
 *   rowMarkers: RowMarker[]
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
            },
            stitchCheckInterval: 10,
            targetStitchCount: null,
            actualStitchCount: null,
            rowRules: [],
            rowMarkers: []
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
 * Normalizes loaded state so legacy parts receive default check/rule/marker fields.
 * @param {StoreState} loaded
 * @returns {StoreState}
 */
function normalizeStoreState(loaded) {
  for (const project of loaded.projects) {
    for (const part of project.parts) {
      if (part.stitchCheckInterval === undefined) {
        part.stitchCheckInterval = 10;
      }
      if (part.targetStitchCount === undefined) {
        part.targetStitchCount = null;
      }
      if (part.actualStitchCount === undefined) {
        part.actualStitchCount = null;
      }
      if (!Array.isArray(part.rowRules)) {
        part.rowRules = [];
      }
      if (!Array.isArray(part.rowMarkers)) {
        part.rowMarkers = [];
      }
    }
  }
  return loaded;
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
          state = normalizeStoreState(parsed);
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
     * Updates stitch check interval and/or target stitch count for the active part.
     * @param {{ stitchCheckInterval?: number | null, targetStitchCount?: number | null }} settings
     */
    updatePartCheckSettings(settings) {
      const part = getActivePart();
      if (settings.stitchCheckInterval !== undefined) {
        part.stitchCheckInterval =
          typeof settings.stitchCheckInterval === 'number' && settings.stitchCheckInterval > 0
            ? Math.floor(settings.stitchCheckInterval)
            : null;
      }
      if (settings.targetStitchCount !== undefined) {
        part.targetStitchCount =
          typeof settings.targetStitchCount === 'number' && settings.targetStitchCount >= 0
            ? Math.floor(settings.targetStitchCount)
            : null;
      }
      commit();
    },

    /**
     * Records the actual stitch count on the needles after a stitch check.
     * @param {number | null} count
     */
    setActualStitchCount(count) {
      const part = getActivePart();
      part.actualStitchCount =
        typeof count === 'number' && count >= 0
          ? Math.floor(count)
          : null;
      commit();
    },

    /**
     * Adds a rhythmic row rule to the active part.
     * @param {{ label: string, everyNRows: number, startRow?: number, repeatCount?: number | null }} input
     * @returns {RowRule}
     */
    addRowRule(input) {
      const part = getActivePart();
      /** @type {RowRule} */
      const rule = {
        id: `rule-${now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: String(input.label || '').trim() || 'Действие по правилу',
        everyNRows: Math.max(1, Math.floor(Number(input.everyNRows) || 1)),
        startRow: Math.max(1, Math.floor(Number(input.startRow) || 1)),
        repeatCount:
          typeof input.repeatCount === 'number' && input.repeatCount > 0
            ? Math.floor(input.repeatCount)
            : null
      };
      part.rowRules.push(rule);
      commit();
      return rule;
    },

    /**
     * Removes a rhythmic row rule by id from the active part.
     * @param {string} ruleId
     */
    removeRowRule(ruleId) {
      const part = getActivePart();
      const next = part.rowRules.filter((r) => r.id !== ruleId);
      if (next.length !== part.rowRules.length) {
        part.rowRules = next;
        commit();
      }
    },

    /**
     * Attaches a text marker to a specific row number on the active part.
     * @param {number} rowNumber
     * @param {string} text
     * @returns {RowMarker}
     */
    addRowMarker(rowNumber, text) {
      const part = getActivePart();
      /** @type {RowMarker} */
      const marker = {
        id: `marker-${now()}-${Math.random().toString(36).slice(2, 7)}`,
        rowNumber: Math.max(1, Math.floor(Number(rowNumber) || 1)),
        text: String(text || '').trim() || 'Важный ряд'
      };
      part.rowMarkers.push(marker);
      part.rowMarkers.sort((a, b) => a.rowNumber - b.rowNumber);
      commit();
      return marker;
    },

    /**
     * Removes a row marker by id from the active part.
     * @param {string} markerId
     */
    removeRowMarker(markerId) {
      const part = getActivePart();
      const next = part.rowMarkers.filter((m) => m.id !== markerId);
      if (next.length !== part.rowMarkers.length) {
        part.rowMarkers = next;
        commit();
      }
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
