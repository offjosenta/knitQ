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
 * @returns {{ ok: true, data: StoreState, theme: string | null } | { ok: false, error: string }}
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

  const envelope = /** @type {{ app?: unknown, theme?: unknown, data?: unknown }} */ (parsed);
  const candidateData = envelope.app === 'KnitQ' && envelope.data !== undefined ? envelope.data : parsed;
  const theme = typeof envelope.theme === 'string' ? envelope.theme : null;

  if (!isValidStoreState(candidateData)) {
    return { ok: false, error: 'Структура проектов в файле повреждена или неполная.' };
  }

  const normalized = normalizeStoreState(structuredClone(candidateData));
  return {
    ok: true,
    data: normalized,
    theme
  };
}
