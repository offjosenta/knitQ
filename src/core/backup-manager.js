import { isValidStoreState, normalizeStoreState } from './knit-store.js';

/**
 * @typedef {import('./knit-store.js').StoreState} StoreState
 * @typedef {{
 *   app: 'KnitQ',
 *   version: number,
 *   exportedAt: string,
 *   theme: string | null,
 *   data: StoreState
 * }} BackupPayload
 */

/**
 * Packages the current store state and theme into a versioned JSON backup envelope.
 * @param {StoreState} storeState
 * @param {string | null} [theme]
 * @param {number} [timestampMs]
 * @returns {BackupPayload}
 */
export function createBackupPayload(storeState, theme = null, timestampMs = Date.now()) {
  return {
    app: 'KnitQ',
    version: 1,
    exportedAt: new Date(timestampMs).toISOString(),
    theme,
    data: structuredClone(storeState)
  };
}

/**
 * Parses and validates a KnitQ JSON backup string without mutating existing state.
 * @param {string} jsonText
 * @returns {{ ok: true, data: StoreState, theme: string | null, exportedAt: string | null } | { ok: false, error: string }}
 */
export function parseAndValidateBackup(jsonText) {
  if (typeof jsonText !== 'string' || !jsonText.trim()) {
    return { ok: false, error: 'Файл резервной копии пуст.' };
  }

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'Не удалось прочитать JSON-файл.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Неверный формат резервной копии.' };
  }

  const envelope = /** @type {{ app?: unknown, theme?: unknown, exportedAt?: unknown, data?: unknown }} */ (parsed);
  const candidateData = envelope.app === 'KnitQ' && envelope.data !== undefined ? envelope.data : parsed;
  const theme = typeof envelope.theme === 'string' ? envelope.theme : null;
  const exportedAt = typeof envelope.exportedAt === 'string' ? envelope.exportedAt : null;

  if (!isValidStoreState(candidateData)) {
    return { ok: false, error: 'Структура проектов в файле повреждена или неполная.' };
  }

  const normalized = normalizeStoreState(structuredClone(candidateData));
  return {
    ok: true,
    data: normalized,
    theme,
    exportedAt
  };
}

/**
 * Checks whether the store state is still the untouched initial starter project.
 * @param {StoreState} state
 * @returns {boolean}
 */
export function isDefaultStoreState(state) {
  if (!state || state.projects.length !== 1) return false;
  if (state.folders.length > 0) return false;
  if (state.trash.projects.length > 0 || state.trash.folders.length > 0) return false;

  const project = state.projects[0];
  if (
    project.id !== 'project-1' ||
    project.name !== 'Шарф «Лицевая гладь»' ||
    project.status !== 'active' ||
    project.folder !== '' ||
    project.notes !== '' ||
    project.yarns.length > 0 ||
    project.tags.length > 0 ||
    project.photoDataUrl !== null ||
    project.parts.length !== 1
  ) {
    return false;
  }

  const part = project.parts[0];
  return (
    part.id === 'part-1' &&
    part.name === 'Основное полотно' &&
    part.currentRow === 0 &&
    part.targetRows === null &&
    part.rowLog.length === 0 &&
    part.timer.elapsedMs === 0 &&
    part.timer.runningSince === null &&
    part.sessions.length === 0 &&
    part.fixTimer.elapsedMs === 0 &&
    part.fixTimer.runningSince === null &&
    part.fixSessions.length === 0 &&
    part.rowRules.length === 0 &&
    part.rowMarkers.length === 0
  );
}
