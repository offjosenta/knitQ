export const KNIT_STORAGE_KEY = 'knitq_store_v1';

/**
 * @typedef {{ rowNumber: number, timestamp: string }} RowLogEntry
 * @typedef {{ startMs: number, endMs: number }} TimeSession
 * @typedef {{ elapsedMs: number, runningSince: number | null }} PartTimerState
 * @typedef {import('./checkpoint-engine.js').RowRule} RowRule
 * @typedef {import('./checkpoint-engine.js').RowMarker} RowMarker
 * @typedef {{ name: string, color: string }} FolderItem
 * @typedef {{
 *   id: string,
 *   name: string,
 *   composition: string,
 *   strands: number,
 *   skeinsUsed: number,
 *   skeinsTotal: number
 * }} YarnEntry
 * @typedef {{
 *   stitchesCount: number | null,
 *   rowsCount: number | null,
 *   widthPreWashCm: number | null,
 *   heightPreWashCm: number | null,
 *   widthPostWashCm: number | null,
 *   heightPostWashCm: number | null,
 *   targetWidthCm: number | null,
 *   targetHeightCm: number | null
 * }} ProjectGauge
 * @typedef {{
 *   id: string,
 *   name: string,
 *   currentRow: number,
 *   targetRows: number | null,
 *   rowLog: RowLogEntry[],
 *   timer: PartTimerState,
 *   sessions: TimeSession[],
 *   stitchCheckInterval: number | null,
 *   targetStitchCount: number | null,
 *   actualStitchCount: number | null,
 *   rowRules: RowRule[],
 *   rowMarkers: RowMarker[]
 * }} Part
 * @typedef {{
 *   id: string,
 *   name: string,
 *   status: 'active' | 'completed',
 *   folder: string,
 *   icon: string,
 *   color: string,
 *   tags: string[],
 *   createdAt: string,
 *   completedAt: string | null,
 *   deletedAt?: string,
 *   toolType: 'needles' | 'hook',
 *   needleSize: string,
 *   knittingMethod: string,
 *   stitchPattern: string,
 *   yarns: YarnEntry[],
 *   notes: string,
 *   photoDataUrl: string | null,
 *   gauge: ProjectGauge,
 *   parts: Part[],
 *   activePartId: string
 * }} Project
 * @typedef {{
 *   name: string,
 *   color: string,
 *   projects: Project[],
 *   deletedAt: string
 * }} TrashedFolder
 * @typedef {{
 *   projects: Project[],
 *   activeProjectId: string,
 *   lastTimedProjectId: string | null,
 *   folders: FolderItem[],
 *   trash: {
 *     projects: Project[],
 *     folders: TrashedFolder[]
 *   }
 * }} StoreState
 */

/**
 * @returns {ProjectGauge}
 */
function createDefaultGauge() {
  return {
    stitchesCount: null,
    rowsCount: null,
    widthPreWashCm: null,
    heightPreWashCm: null,
    widthPostWashCm: null,
    heightPostWashCm: null,
    targetWidthCm: null,
    targetHeightCm: null
  };
}

/**
 * @returns {StoreState}
 */
function createDefaultState() {
  const partId = 'part-1';
  const projectId = 'project-1';

  return {
    activeProjectId: projectId,
    lastTimedProjectId: null,
    folders: [],
    trash: {
      projects: [],
      folders: []
    },
    projects: [
      {
        id: projectId,
        name: 'Шарф «Лицевая гладь»',
        status: 'active',
        folder: '',
        icon: 'scarf',
        color: '#8e8e93',
        tags: [],
        createdAt: '2026-01-10T10:00:00.000Z',
        completedAt: null,
        toolType: 'needles',
        needleSize: '4.5 мм',
        knittingMethod: 'flat',
        stitchPattern: 'Лицевая гладь',
        yarns: [],
        notes: '',
        photoDataUrl: null,
        gauge: createDefaultGauge(),
        activePartId: partId,
        parts: [createBlankPart(partId, 'Основное полотно')]
      }
    ]
  };
}

/**
 * @param {unknown} candidate
 * @returns {candidate is StoreState}
 */
export function isValidStoreState(candidate) {
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
        && Number.isFinite(part.currentRow)
        && Array.isArray(part.rowLog)
        && part.timer
        && typeof part.timer.elapsedMs === 'number'
        && Number.isFinite(part.timer.elapsedMs)
        && (part.timer.runningSince === null || (typeof part.timer.runningSince === 'number' && Number.isFinite(part.timer.runningSince)))
      );
    });
  });
}

/**
 * @param {string} id
 * @param {string} name
 * @param {number | null} [targetRows]
 * @returns {Part}
 */
function createBlankPart(id, name, targetRows = null) {
  return {
    id,
    name,
    currentRow: 0,
    targetRows,
    rowLog: [],
    timer: {
      elapsedMs: 0,
      runningSince: null
    },
    sessions: [],
    stitchCheckInterval: 10,
    targetStitchCount: null,
    actualStitchCount: null,
    rowRules: [],
    rowMarkers: []
  };
}

/**
 * Normalizes loaded state so legacy parts receive default check/rule/marker fields.
 * @param {StoreState} loaded
 * @returns {StoreState}
 */
export function normalizeStoreState(loaded) {
  if (typeof loaded.activeProjectId !== 'string' || !loaded.projects.some((p) => p.id === loaded.activeProjectId)) {
    loaded.activeProjectId = loaded.projects[0].id;
  }
  if (typeof loaded.lastTimedProjectId !== 'string' || !loaded.projects.some((p) => p.id === loaded.lastTimedProjectId)) {
    loaded.lastTimedProjectId = null;
  }
  if (!loaded.trash || typeof loaded.trash !== 'object') {
    loaded.trash = { projects: [], folders: [] };
  } else {
    if (!Array.isArray(loaded.trash.projects)) loaded.trash.projects = [];
    if (!Array.isArray(loaded.trash.folders)) loaded.trash.folders = [];
  }

  /** @type {Map<string, FolderItem>} */
  const folderMap = new Map();
  if (Array.isArray(loaded.folders)) {
    for (const item of /** @type {unknown[]} */ (loaded.folders)) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed && !folderMap.has(trimmed)) {
          folderMap.set(trimmed, { name: trimmed, color: '#8e8e93' });
        }
      } else if (item && typeof item === 'object' && typeof (/** @type {any} */ (item)).name === 'string') {
        const obj = /** @type {{ name: string, color?: unknown }} */ (item);
        const trimmed = obj.name.trim();
        if (trimmed && !folderMap.has(trimmed)) {
          folderMap.set(trimmed, {
            name: trimmed,
            color: typeof obj.color === 'string' && obj.color ? obj.color : '#8e8e93'
          });
        }
      }
    }
  }

  for (const project of loaded.projects) {
    if (project.status !== 'active' && project.status !== 'completed') {
      project.status = 'active';
    }
    if (typeof project.folder !== 'string') {
      project.folder = '';
    } else if (project.folder.trim() && !folderMap.has(project.folder.trim())) {
      folderMap.set(project.folder.trim(), { name: project.folder.trim(), color: '#8e8e93' });
    }
    if (typeof project.icon !== 'string' || !project.icon) {
      project.icon = 'yarn';
    }
    if (typeof project.color !== 'string' || !project.color) {
      project.color = '#8e8e93';
    }
    if (!Array.isArray(project.tags)) {
      project.tags = [];
    } else {
      project.tags = project.tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (typeof project.createdAt !== 'string') {
      project.createdAt = new Date().toISOString();
    }
    if (project.completedAt === undefined) {
      project.completedAt = null;
    }
    if (project.toolType !== 'needles' && project.toolType !== 'hook') {
      project.toolType = 'needles';
    }
    if (typeof project.needleSize !== 'string') {
      project.needleSize = '';
    }
    if (typeof project.knittingMethod !== 'string') {
      project.knittingMethod = 'flat';
    }
    if (typeof project.stitchPattern !== 'string') {
      project.stitchPattern = '';
    }
    if (!Array.isArray(project.yarns)) {
      project.yarns = [];
    }
    if (typeof project.notes !== 'string') {
      project.notes = '';
    }
    if (project.photoDataUrl === undefined) {
      project.photoDataUrl = null;
    }
    if (!project.gauge || typeof project.gauge !== 'object') {
      project.gauge = createDefaultGauge();
    } else {
      project.gauge = { ...createDefaultGauge(), ...project.gauge };
    }

    for (const part of project.parts) {
      if (part.targetRows === undefined) {
        part.targetRows = null;
      }
      if (!Array.isArray(part.sessions)) {
        part.sessions = [];
      }
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
  loaded.folders = Array.from(folderMap.values());
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
   * Generates a unique entity ID with the given prefix.
   * @param {string} prefix
   * @param {number} [timestampMs]
   * @returns {string}
   */
  const createId = (prefix, timestampMs = now()) =>
    `${prefix}-${timestampMs}-${Math.random().toString(36).slice(2, 7)}`;

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
      const project = getActiveProject();
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
      state.lastTimedProjectId = project.id;
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
      part.sessions = [];
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
      const project = getActiveProject();
      const part = getActivePart();
      if (part.timer.runningSince !== null) {
        return;
      }
      part.timer.runningSince = now();
      state.lastTimedProjectId = project.id;
      commit();
    },

    pauseTimer() {
      const project = getActiveProject();
      const part = getActivePart();
      if (part.timer.runningSince === null) {
        return;
      }
      const currentNow = now();
      if (currentNow > part.timer.runningSince) {
        part.sessions.push({
          startMs: part.timer.runningSince,
          endMs: currentNow
        });
      }
      part.timer.elapsedMs = getPartElapsedMs(part);
      part.timer.runningSince = null;
      state.lastTimedProjectId = project.id;
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
        id: createId('rule'),
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
        id: createId('marker'),
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
     * Updates project passport fields (name, folder, tags, status, toolType, needleSize, knittingMethod, stitchPattern, notes, photoDataUrl, gauge).
     * @param {{
     *   name?: string,
     *   folder?: string,
     *   tags?: string[],
     *   status?: 'active' | 'completed',
     *   toolType?: 'needles' | 'hook',
     *   needleSize?: string,
     *   knittingMethod?: string,
     *   stitchPattern?: string,
     *   notes?: string,
     *   photoDataUrl?: string | null,
     *   gauge?: Partial<ProjectGauge>
     * }} updates
     */
    updateProjectPassport(updates) {
      const project = getActiveProject();
      if (typeof updates.name === 'string') {
        const trimmed = updates.name.trim();
        if (trimmed) {
          project.name = trimmed;
        }
      }
      if (typeof updates.folder === 'string') {
        project.folder = updates.folder.trim();
      }
      if (Array.isArray(updates.tags)) {
        project.tags = updates.tags.map((t) => String(t).trim()).filter(Boolean);
      }
      if (updates.status === 'active' || updates.status === 'completed') {
        project.status = updates.status;
        project.completedAt = updates.status === 'completed' ? new Date(now()).toISOString() : null;
      }
      if (updates.toolType === 'needles' || updates.toolType === 'hook') {
        project.toolType = updates.toolType;
      }
      if (typeof updates.needleSize === 'string') {
        project.needleSize = updates.needleSize.trim();
      }
      if (typeof updates.knittingMethod === 'string') {
        project.knittingMethod = updates.knittingMethod;
      }
      if (typeof updates.stitchPattern === 'string') {
        project.stitchPattern = updates.stitchPattern.trim();
      }
      if (typeof updates.notes === 'string') {
        project.notes = updates.notes;
      }
      if (updates.photoDataUrl !== undefined) {
        project.photoDataUrl = updates.photoDataUrl;
      }
      if (updates.gauge && typeof updates.gauge === 'object') {
        project.gauge = { ...project.gauge, ...updates.gauge };
      }
      commit();
    },

    /**
     * Updates the target row count for the active part.
     * @param {number | null} targetRows
     */
    updatePartTargetRows(targetRows) {
      const part = getActivePart();
      part.targetRows =
        typeof targetRows === 'number' && Number.isFinite(targetRows) && targetRows > 0
          ? Math.floor(targetRows)
          : null;
      commit();
    },

    /**
     * Adds a yarn entry to the active project.
     * @param {{
     *   name: string,
     *   composition?: string,
     *   strands?: number,
     *   skeinsUsed?: number,
     *   skeinsTotal?: number
     * }} input
     * @returns {YarnEntry}
     */
    addYarnEntry(input) {
      const project = getActiveProject();
      const skeinsTotal = Math.max(0, Number(input.skeinsTotal) || 0);
      const rawUsed = Math.max(0, Number(input.skeinsUsed) || 0);
      /** @type {YarnEntry} */
      const entry = {
        id: createId('yarn'),
        name: String(input.name || '').trim() || 'Пряжа',
        composition: String(input.composition || '').trim(),
        strands: Math.max(1, Math.floor(Number(input.strands) || 1)),
        skeinsUsed: skeinsTotal > 0 ? Math.min(skeinsTotal, rawUsed) : rawUsed,
        skeinsTotal
      };
      project.yarns.push(entry);
      commit();
      return entry;
    },

    /**
     * Updates an existing yarn entry by id on the active project.
     * @param {string} yarnId
     * @param {Partial<Omit<YarnEntry, 'id'>>} updates
     */
    updateYarnEntry(yarnId, updates) {
      const project = getActiveProject();
      const yarn = project.yarns.find((y) => y.id === yarnId);
      if (!yarn) return;
      if (typeof updates.name === 'string') {
        const trimmed = updates.name.trim();
        if (trimmed) yarn.name = trimmed;
      }
      if (typeof updates.composition === 'string') {
        yarn.composition = updates.composition.trim();
      }
      if (typeof updates.strands === 'number' && Number.isFinite(updates.strands)) {
        yarn.strands = Math.max(1, Math.floor(updates.strands));
      }
      if (typeof updates.skeinsTotal === 'number' && Number.isFinite(updates.skeinsTotal)) {
        yarn.skeinsTotal = Math.max(0, updates.skeinsTotal);
      }
      if (typeof updates.skeinsUsed === 'number' && Number.isFinite(updates.skeinsUsed)) {
        const clamped = Math.max(0, updates.skeinsUsed);
        yarn.skeinsUsed = yarn.skeinsTotal > 0 ? Math.min(yarn.skeinsTotal, clamped) : clamped;
      }
      commit();
    },

    /**
     * Removes a yarn entry by id from the active project.
     * @param {string} yarnId
     */
    removeYarnEntry(yarnId) {
      const project = getActiveProject();
      const next = project.yarns.filter((y) => y.id !== yarnId);
      if (next.length !== project.yarns.length) {
        project.yarns = next;
        commit();
      }
    },

    /**
     * Clones a part into a symmetric paired part (e.g., second sleeve or sock),
     * preserving targets, stitch checks, row rules, and markers while resetting progress.
     * @param {string} [sourcePartId]
     * @returns {Part}
     */
    clonePairedPart(sourcePartId) {
      const project = getActiveProject();
      const source =
        (sourcePartId ? project.parts.find((p) => p.id === sourcePartId) : null)
        || getActivePart();

      const suffixMatch = source.name.match(/^(.*\s+)(\d+)$/);
      const pairedMatch = source.name.match(/^(.*)\s+\(парная(?:\s+(\d+))?\)$/);
      let pairedName;
      if (suffixMatch) {
        pairedName = `${suffixMatch[1]}${Number(suffixMatch[2]) + 1}`;
      } else if (pairedMatch) {
        const nextNum = pairedMatch[2] ? Number(pairedMatch[2]) + 1 : 2;
        pairedName = `${pairedMatch[1]} (парная ${nextNum})`;
      } else {
        pairedName = `${source.name} (парная)`;
      }

      const timestamp = now();
      /** @type {Part} */
      const cloned = {
        id: createId('part', timestamp),
        name: pairedName,
        currentRow: 0,
        targetRows: source.targetRows,
        rowLog: [],
        timer: {
          elapsedMs: 0,
          runningSince: null
        },
        sessions: [],
        stitchCheckInterval: source.stitchCheckInterval,
        targetStitchCount: source.targetStitchCount,
        actualStitchCount: null,
        rowRules: source.rowRules.map((rule) => ({
          ...rule,
          id: createId('rule', timestamp)
        })),
        rowMarkers: source.rowMarkers.map((marker) => ({
          ...marker,
          id: createId('marker', timestamp)
        }))
      };

      project.parts.push(cloned);
      project.activePartId = cloned.id;
      commit();
      return cloned;
    },

    /**
     * Switches the active part within the active project.
     * @param {string} partId
     */
    setActivePart(partId) {
      const project = getActiveProject();
      const target = project.parts.find((p) => p.id === partId);
      if (target && project.activePartId !== target.id) {
        project.activePartId = target.id;
        commit();
      }
    },

    /**
     * Adds a new blank part (e.g. Отворот, Основание, Макушка) to the active project and activates it.
     * @param {string} name
     * @returns {Part}
     */
    addPart(name) {
      const project = getActiveProject();
      const timestamp = now();
      /** @type {Part} */
      const newPart = {
        id: createId('part', timestamp),
        name: String(name || '').trim() || `Деталь ${project.parts.length + 1}`,
        currentRow: 0,
        targetRows: null,
        rowLog: [],
        timer: {
          elapsedMs: 0,
          runningSince: null
        },
        sessions: [],
        stitchCheckInterval: 10,
        targetStitchCount: null,
        actualStitchCount: null,
        rowRules: [],
        rowMarkers: []
      };
      project.parts.push(newPart);
      project.activePartId = newPart.id;
      commit();
      return newPart;
    },

    /**
     * Renames a part in the active project.
     * @param {string} partId
     * @param {string} name
     */
    renamePart(partId, name) {
      const project = getActiveProject();
      const target = project.parts.find((p) => p.id === partId);
      const trimmed = String(name || '').trim();
      if (target && trimmed) {
        target.name = trimmed;
        commit();
      }
    },

    /**
     * Removes a part from the active project if at least one part remains.
     * @param {string} partId
     */
    removePart(partId) {
      const project = getActiveProject();
      if (project.parts.length <= 1) return;
      const next = project.parts.filter((p) => p.id !== partId);
      if (next.length !== project.parts.length) {
        project.parts = next;
        if (project.activePartId === partId) {
          project.activePartId = next[0].id;
        }
        commit();
      }
    },

    /**
     * Checks whether a project name is already used (case-insensitive).
     * @param {string} name
     * @param {string} [excludeProjectId]
     * @returns {boolean}
     */
    isProjectNameTaken(name, excludeProjectId) {
      const normalized = String(name || '').trim().toLocaleLowerCase('ru');
      if (!normalized) return false;
      return state.projects.some(
        (p) => p.id !== excludeProjectId && p.name.trim().toLocaleLowerCase('ru') === normalized
      );
    },

    /**
     * Returns the pinned project (the one where the timer last ran, or active fallback).
     * @returns {Project}
     */
    getPinnedProject() {
      if (state.lastTimedProjectId) {
        const timed = state.projects.find((p) => p.id === state.lastTimedProjectId);
        if (timed) return timed;
      }
      const withTime = state.projects.find((p) =>
        p.parts.some((pt) => pt.timer.elapsedMs > 0 || pt.timer.runningSince !== null)
      );
      return withTime || getActiveProject();
    },

    /**
     * Adds a user-created folder with a color if non-empty and not already present.
     * @param {string} name
     * @param {string} [color]
     * @returns {FolderItem | null}
     */
    addFolder(name, color = '#8e8e93') {
      const trimmed = String(name || '').trim();
      if (!trimmed) return null;
      const existing = state.folders.find(
        (f) => f.name.toLocaleLowerCase('ru') === trimmed.toLocaleLowerCase('ru')
      );
      if (existing) return existing;
      const folder = { name: trimmed, color: color || '#8e8e93' };
      state.folders.push(folder);
      commit();
      return folder;
    },

    /**
     * Updates an existing folder's name and/or color and migrates project references.
     * @param {string} currentName
     * @param {{ name?: string, color?: string }} updates
     * @returns {{ ok: boolean, error?: string }}
     */
    updateFolder(currentName, updates) {
      const folder = state.folders.find((f) => f.name === currentName);
      if (!folder) return { ok: false, error: 'Папка не найдена.' };

      if (typeof updates.name === 'string') {
        const nextName = updates.name.trim();
        if (!nextName) return { ok: false, error: 'Введите название папки.' };
        const duplicate = state.folders.some(
          (f) => f !== folder && f.name.toLocaleLowerCase('ru') === nextName.toLocaleLowerCase('ru')
        );
        if (duplicate) return { ok: false, error: 'Папка с таким названием уже существует.' };
        if (nextName !== currentName) {
          for (const p of state.projects) {
            if (p.folder === currentName) {
              p.folder = nextName;
            }
          }
          folder.name = nextName;
        }
      }
      if (typeof updates.color === 'string' && updates.color) {
        folder.color = updates.color;
      }
      commit();
      return { ok: true };
    },

    /**
     * Deletes a folder. Empty folders are removed permanently; non-empty folders can either
     * move their projects to the root ('move-to-root') or move folder + projects to trash ('trash').
     * @param {string} folderName
     * @param {'trash' | 'move-to-root'} [mode]
     * @returns {{ ok: boolean, error?: string }}
     */
    deleteFolder(folderName, mode = 'move-to-root') {
      const idx = state.folders.findIndex((f) => f.name === folderName);
      if (idx === -1) return { ok: false, error: 'Папка не найдена.' };
      const folderObj = state.folders[idx];
      const insideProjects = state.projects.filter((p) => p.folder === folderName);

      if (insideProjects.length === 0) {
        state.folders.splice(idx, 1);
        commit();
        return { ok: true };
      }

      if (mode === 'move-to-root') {
        for (const p of insideProjects) {
          p.folder = '';
        }
        state.folders.splice(idx, 1);
        commit();
        return { ok: true };
      }

      // mode === 'trash'
      if (insideProjects.length >= state.projects.length) {
        return { ok: false, error: 'Нельзя удалить папку со всеми проектами — должен остаться хотя бы один проект.' };
      }

      const deletedAt = new Date(now()).toISOString();
      const trashedProjects = insideProjects.map((p) => ({ ...p, deletedAt }));
      state.trash.folders.unshift({
        name: folderObj.name,
        color: folderObj.color,
        projects: trashedProjects,
        deletedAt
      });
      const deletedIds = new Set(insideProjects.map((p) => p.id));
      state.projects = state.projects.filter((p) => !deletedIds.has(p.id));
      state.folders.splice(idx, 1);
      if (!state.projects.some((p) => p.id === state.activeProjectId)) {
        state.activeProjectId = state.projects[0].id;
      }
      if (state.lastTimedProjectId && deletedIds.has(state.lastTimedProjectId)) {
        state.lastTimedProjectId = null;
      }
      commit();
      return { ok: true };
    },

    /**
     * Creates a new project and activates it (enforces unique project names).
     * @param {{
     *   name: string,
     *   folder?: string,
     *   icon?: string,
     *   color?: string,
     *   tags?: string[],
     *   toolType?: 'needles' | 'hook',
     *   needleSize?: string
     * }} input
     * @returns {Project}
     */
    createProject(input) {
      const timestamp = now();
      const projectId = createId('project', timestamp);
      const folder = String(input.folder || '').trim();
      if (folder && !state.folders.some((f) => f.name === folder)) {
        state.folders.push({ name: folder, color: '#8e8e93' });
      }

      const parts = [createBlankPart(createId('part-1', timestamp), 'Основное полотно')];

      /** @type {Project} */
      const project = {
        id: projectId,
        name: String(input.name || '').trim() || 'Новый проект',
        status: 'active',
        folder,
        icon: String(input.icon || 'yarn'),
        color: String(input.color || '#8e8e93'),
        tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).trim()).filter(Boolean) : [],
        createdAt: new Date(timestamp).toISOString(),
        completedAt: null,
        toolType: input.toolType === 'hook' ? 'hook' : 'needles',
        needleSize: String(input.needleSize || '').trim(),
        knittingMethod: 'flat',
        stitchPattern: '',
        yarns: [],
        notes: '',
        photoDataUrl: null,
        gauge: createDefaultGauge(),
        activePartId: parts[0].id,
        parts
      };

      state.projects.unshift(project);
      state.activeProjectId = project.id;
      commit();
      return project;
    },

    /**
     * Updates a project's name, color, or icon by id (enforces unique name).
     * @param {string} projectId
     * @param {{ name?: string, color?: string, icon?: string }} updates
     * @returns {{ ok: boolean, error?: string }}
     */
    updateProjectMeta(projectId, updates) {
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return { ok: false, error: 'Проект не найден.' };

      if (typeof updates.name === 'string') {
        const trimmed = updates.name.trim();
        if (!trimmed) return { ok: false, error: 'Введите название проекта.' };
        const duplicate = state.projects.some(
          (p) => p.id !== projectId && p.name.trim().toLocaleLowerCase('ru') === trimmed.toLocaleLowerCase('ru')
        );
        if (duplicate) return { ok: false, error: 'Проект с таким названием уже существует.' };
        project.name = trimmed;
      }
      if (typeof updates.color === 'string' && updates.color) {
        project.color = updates.color;
      }
      if (typeof updates.icon === 'string' && updates.icon) {
        project.icon = updates.icon;
      }
      commit();
      return { ok: true };
    },

    /**
     * Moves a project to the trash (requires at least one remaining project).
     * @param {string} projectId
     * @returns {{ ok: boolean, error?: string }}
     */
    deleteProject(projectId) {
      if (state.projects.length <= 1) {
        return { ok: false, error: 'Должен остаться хотя бы один проект.' };
      }
      const idx = state.projects.findIndex((p) => p.id === projectId);
      if (idx === -1) return { ok: false, error: 'Проект не найден.' };
      const [removed] = state.projects.splice(idx, 1);
      removed.deletedAt = new Date(now()).toISOString();
      state.trash.projects.unshift(removed);
      if (state.activeProjectId === projectId) {
        state.activeProjectId = state.projects[0].id;
      }
      if (state.lastTimedProjectId === projectId) {
        state.lastTimedProjectId = null;
      }
      commit();
      return { ok: true };
    },

    /**
     * Restores a trashed project back to the main list.
     * @param {string} projectId
     */
    restoreTrashedProject(projectId) {
      const idx = state.trash.projects.findIndex((p) => p.id === projectId);
      if (idx === -1) return;
      const [proj] = state.trash.projects.splice(idx, 1);
      delete proj.deletedAt;
      if (proj.folder && !state.folders.some((f) => f.name === proj.folder)) {
        proj.folder = '';
      }
      state.projects.unshift(proj);
      commit();
    },

    /**
     * Restores a trashed folder and all its projects.
     * @param {number} index
     */
    restoreTrashedFolder(index) {
      const folderEntry = state.trash.folders[index];
      if (!folderEntry) return;
      state.trash.folders.splice(index, 1);
      if (!state.folders.some((f) => f.name === folderEntry.name)) {
        state.folders.push({ name: folderEntry.name, color: folderEntry.color });
      }
      for (const proj of folderEntry.projects) {
        delete proj.deletedAt;
        proj.folder = folderEntry.name;
        state.projects.unshift(proj);
      }
      commit();
    },

    /**
     * Permanently clears all items in the trash.
     */
    emptyTrash() {
      state.trash.projects = [];
      state.trash.folders = [];
      commit();
    },

    /**
     * Switches the active project by id.
     * @param {string} projectId
     */
    setActiveProject(projectId) {
      const target = state.projects.find((p) => p.id === projectId);
      if (target && state.activeProjectId !== target.id) {
        state.activeProjectId = target.id;
        commit();
      }
    },

    /**
     * Updates a project's status ('active' | 'completed') by id.
     * @param {string} projectId
     * @param {'active' | 'completed'} status
     */
    setProjectStatus(projectId, status) {
      const target = state.projects.find((p) => p.id === projectId);
      if (!target || (status !== 'active' && status !== 'completed')) return;
      target.status = status;
      target.completedAt = status === 'completed' ? new Date(now()).toISOString() : null;
      if (status === 'completed' && state.activeProjectId === projectId) {
        const nextActive = state.projects.find((p) => p.status === 'active');
        if (nextActive) {
          state.activeProjectId = nextActive.id;
        }
      }
      commit();
    },

    /**
     * Returns total elapsed milliseconds across all parts of a project.
     * @param {string} [projectId]
     * @returns {number}
     */
    getProjectTotalElapsedMs(projectId) {
      const project = projectId
        ? state.projects.find((p) => p.id === projectId)
        : getActiveProject();
      if (!project) return 0;
      return project.parts.reduce((sum, part) => sum + getPartElapsedMs(part), 0);
    },

    /**
     * Aggregates daily rows/time, monthly time, and all-time totals across all projects.
     * @param {number} [referenceMs]
     * @returns {{
     *   todayRows: number,
     *   todayTimeMs: number,
     *   monthTimeMs: number,
     *   totalTimeMs: number,
     *   completedProjectsCount: number
     * }}
     */
    getActivityStats(referenceMs = now()) {
      const refDate = new Date(referenceMs);
      const todayStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
      const todayEnd = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1).getTime();
      const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1).getTime();
      const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1).getTime();

      const overlapMs = (/** @type {number} */ start, /** @type {number} */ end, /** @type {number} */ winStart, /** @type {number} */ winEnd) =>
        Math.max(0, Math.min(end, winEnd) - Math.max(start, winStart));

      let todayRows = 0;
      let todayTimeMs = 0;
      let monthTimeMs = 0;
      let totalTimeMs = 0;
      let completedProjectsCount = 0;

      for (const project of state.projects) {
        if (project.status === 'completed') {
          completedProjectsCount += 1;
        }
        for (const part of project.parts) {
          totalTimeMs += getPartElapsedMs(part);

          for (const entry of part.rowLog) {
            const ts = Date.parse(entry.timestamp);
            if (!Number.isNaN(ts) && ts >= todayStart && ts < todayEnd) {
              todayRows += 1;
            }
          }

          for (const session of part.sessions) {
            todayTimeMs += overlapMs(session.startMs, session.endMs, todayStart, todayEnd);
            monthTimeMs += overlapMs(session.startMs, session.endMs, monthStart, monthEnd);
          }

          if (part.timer.runningSince !== null) {
            todayTimeMs += overlapMs(part.timer.runningSince, referenceMs, todayStart, todayEnd);
            monthTimeMs += overlapMs(part.timer.runningSince, referenceMs, monthStart, monthEnd);
          }
        }
      }

      return {
        todayRows,
        todayTimeMs,
        monthTimeMs,
        totalTimeMs,
        completedProjectsCount
      };
    },

    /**
     * Replaces and normalizes the entire store state (used for backup restore).
     * @param {unknown} candidate
     * @returns {boolean}
     */
    replaceState(candidate) {
      if (!isValidStoreState(candidate)) return false;
      state = normalizeStoreState(structuredClone(candidate));
      commit();
      return true;
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
