import {
  createBackupPayload,
  isDefaultStoreState,
  parseAndValidateBackup
} from './backup-manager.js';

export const GIST_SYNC_STORAGE_KEY = 'knitq_gist_sync_v1';
export const GIST_BACKUP_FILENAME = 'knitq-backup.json';
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * @typedef {import('./knit-store.js').StoreState} StoreState
 * @typedef {{
 *   getItem(key: string): string | null,
 *   setItem(key: string, value: string): void,
 *   removeItem(key: string): void
 * }} StorageLike
 * @typedef {{
 *   token: string,
 *   gistId: string | null,
 *   lastSyncedAt: string | null,
 *   localUpdatedAt: number | null
 * }} GistSyncStoredState
 * @typedef {{
 *   ok: true,
 *   action: 'created' | 'pulled' | 'pushed' | 'up-to-date',
 *   lastSyncedAt: string
 * } | {
 *   ok: false,
 *   status: 'unconfigured' | 'offline' | 'error',
 *   error?: string
 * }} SyncResult
 * @typedef {{
 *   phase: 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'unconfigured',
 *   lastSyncedAt: string | null,
 *   message: string
 * }} SyncStatusSnapshot
 */

/**
 * @returns {GistSyncStoredState}
 */
function createEmptyConfig() {
  return {
    token: '',
    gistId: null,
    lastSyncedAt: null,
    localUpdatedAt: null
  };
}

/**
 * @param {string} token
 * @param {Record<string, string>} [extra]
 * @returns {Record<string, string>}
 */
function buildHeaders(token, extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra
  };
}

/**
 * @param {Response} response
 * @returns {Promise<string>}
 */
async function readGithubError(response) {
  if (response.status === 401) {
    return 'Неверный или просроченный GitHub Token.';
  }
  if (response.status === 403) {
    return 'Недостаточно прав токена (нужно право gist) или превышен лимит GitHub API.';
  }
  if (response.status === 404) {
    return 'Gist не найден.';
  }
  try {
    const body = /** @type {{ message?: unknown }} */ (await response.json());
    if (typeof body?.message === 'string' && body.message.trim()) {
      return `Ошибка GitHub API (${response.status}): ${body.message}`;
    }
  } catch {
    // Ignore JSON parse error
  }
  return `Ошибка GitHub API (${response.status}).`;
}

/**
 * Creates a manager for syncing KnitQ backups with a private GitHub Gist.
 * @param {{
 *   storage?: StorageLike | null,
 *   fetchImpl?: typeof fetch,
 *   isOnline?: () => boolean,
 *   now?: () => number
 * }} [options]
 */
export function createGistSyncManager(options = {}) {
  const storage =
    options.storage !== undefined
      ? options.storage
      : (typeof localStorage !== 'undefined' ? localStorage : null);
  const fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  const isOnline = options.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const now = options.now ?? (() => Date.now());

  /** @type {GistSyncStoredState} */
  let config = createEmptyConfig();

  if (storage) {
    try {
      const raw = storage.getItem(GIST_SYNC_STORAGE_KEY);
      if (raw) {
        const parsed = /** @type {Partial<GistSyncStoredState>} */ (JSON.parse(raw));
        config = {
          token: typeof parsed.token === 'string' ? parsed.token.trim() : '',
          gistId: typeof parsed.gistId === 'string' && parsed.gistId ? parsed.gistId : null,
          lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
          localUpdatedAt: typeof parsed.localUpdatedAt === 'number' ? parsed.localUpdatedAt : null
        };
      }
    } catch {
      config = createEmptyConfig();
    }
  }

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(GIST_SYNC_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota errors
    }
  };

  /**
   * @returns {SyncResult | null}
   */
  const checkPreconditions = () => {
    if (!config.token) return { ok: false, status: 'unconfigured' };
    if (!isOnline()) return { ok: false, status: 'offline' };
    return null;
  };

  /**
   * @param {string} url
   * @param {RequestInit} init
   * @param {{ allow404?: boolean }} [opts]
   * @returns {Promise<Response | null>}
   */
  const requestGithub = async (url, init, opts = {}) => {
    if (!fetchImpl) throw new Error('Fetch API недоступен.');
    const res = await fetchImpl(url, init);
    if (opts.allow404 && res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const msg = await readGithubError(res);
      const err = new Error(msg);
      /** @type {any} */ (err).status = res.status;
      throw err;
    }
    return res;
  };

  /**
   * @param {string} token
   * @returns {Promise<{ id: string, public?: boolean, updated_at?: string, files?: Record<string, { content?: string, truncated?: boolean, raw_url?: string }> } | null>}
   */
  const findExistingGist = async (token) => {
    const maxPages = 5;
    for (let page = 1; page <= maxPages; page += 1) {
      const res = await requestGithub(`${GITHUB_API_BASE}/gists?per_page=100&page=${page}`, {
        method: 'GET',
        headers: buildHeaders(token)
      });
      const list = /** @type {Array<{ id: string, public?: boolean, updated_at?: string, files?: Record<string, unknown> }>} */ (
        await res?.json()
      );
      if (!Array.isArray(list) || list.length === 0) return null;
      const match = list.find(
        (g) => g && g.public === false && g.files && Object.prototype.hasOwnProperty.call(g.files, GIST_BACKUP_FILENAME)
      );
      if (match) {
        return /** @type {any} */ (match);
      }
      if (list.length < 100) return null;
    }
    return null;
  };

  /**
   * @param {string} token
   * @param {string} gistId
   */
  const fetchGistById = async (token, gistId) => {
    const res = await requestGithub(
      `${GITHUB_API_BASE}/gists/${encodeURIComponent(gistId)}`,
      { method: 'GET', headers: buildHeaders(token) },
      { allow404: true }
    );
    if (!res) return null;
    return /** @type {{ id: string, updated_at?: string, files?: Record<string, { content?: string, truncated?: boolean, raw_url?: string }> }} */ (
      await res.json()
    );
  };

  /**
   * @param {string} token
   * @param {{ content?: string, truncated?: boolean, raw_url?: string }} fileObj
   * @returns {Promise<string>}
   */
  const readGistFileContent = async (token, fileObj) => {
    if (!fileObj.truncated && typeof fileObj.content === 'string') {
      return fileObj.content;
    }
    if (fileObj.raw_url && fetchImpl) {
      const rawRes = await fetchImpl(fileObj.raw_url, {
        method: 'GET',
        headers: buildHeaders(token)
      });
      if (!rawRes.ok) {
        throw new Error(await readGithubError(rawRes));
      }
      return await rawRes.text();
    }
    return typeof fileObj.content === 'string' ? fileObj.content : '';
  };

  /**
   * @param {string} token
   * @param {StoreState} storeState
   * @param {string | null} theme
   */
  const createPrivateGist = async (token, storeState, theme) => {
    if (!fetchImpl) throw new Error('Fetch API недоступен.');
    const ts = now();
    const payload = createBackupPayload(storeState, theme, ts);
    const res = await fetchImpl(`${GITHUB_API_BASE}/gists`, {
      method: 'POST',
      headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        description: 'KnitQ Backup (автосинхронизация)',
        public: false,
        files: {
          [GIST_BACKUP_FILENAME]: {
            content: JSON.stringify(payload, null, 2)
          }
        }
      })
    });
    if (!res.ok) {
      throw new Error(await readGithubError(res));
    }
    const created = /** @type {{ id: string }} */ (await res.json());
    config.gistId = created.id;
    config.lastSyncedAt = new Date(ts).toISOString();
    if (config.localUpdatedAt === null) {
      config.localUpdatedAt = ts;
    }
    persist();
    return config.lastSyncedAt;
  };

  /**
   * @param {string} token
   * @param {string} gistId
   * @param {StoreState} storeState
   * @param {string | null} theme
   * @param {boolean} [keepalive]
   * @returns {Promise<{ ok: boolean, notFound?: boolean, lastSyncedAt?: string }>}
   */
  const patchGist = async (token, gistId, storeState, theme, keepalive = false) => {
    const ts = now();
    const payload = createBackupPayload(storeState, theme, ts);
    const body = JSON.stringify({
      files: {
        [GIST_BACKUP_FILENAME]: {
          content: JSON.stringify(payload, null, 2)
        }
      }
    });
    // Browsers reject keepalive requests whose body exceeds 64 KiB (e.g. projects with photos)
    const safeKeepalive = keepalive && body.length <= 60_000;
    const res = await requestGithub(
      `${GITHUB_API_BASE}/gists/${encodeURIComponent(gistId)}`,
      {
        method: 'PATCH',
        keepalive: safeKeepalive,
        headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
        body
      },
      { allow404: true }
    );
    if (!res) {
      return { ok: false, notFound: true };
    }
    config.lastSyncedAt = new Date(ts).toISOString();
    persist();
    return { ok: true, lastSyncedAt: config.lastSyncedAt };
  };

  return {
    getConfig() {
      return {
        hasToken: Boolean(config.token),
        gistId: config.gistId,
        lastSyncedAt: config.lastSyncedAt,
        localUpdatedAt: config.localUpdatedAt
      };
    },

    getToken() {
      return config.token;
    },

    /**
     * @param {string} rawToken
     */
    setToken(rawToken) {
      const next = typeof rawToken === 'string' ? rawToken.trim() : '';
      if (next !== config.token) {
        config.token = next;
        config.gistId = null;
        config.lastSyncedAt = null;
        persist();
      }
    },

    /**
     * @param {number} [tsMs]
     */
    markLocalUpdated(tsMs = now()) {
      config.localUpdatedAt = tsMs;
      persist();
    },

    /**
     * Pulls remote backup if newer or if local state is untouched default;
     * otherwise pushes local state if newer, or creates a private Gist.
     * @param {{
     *   storeState: StoreState,
     *   theme: string | null,
     *   applyRemote: (remote: { data: StoreState, theme: string | null }) => void
     * }} params
     * @returns {Promise<SyncResult>}
     */
    async syncNow({ storeState, theme, applyRemote }) {
      const blocked = checkPreconditions();
      if (blocked) return blocked;
      const token = config.token;

      try {
        let gist = config.gistId ? await fetchGistById(token, config.gistId) : null;
        if (!gist) {
          config.gistId = null;
          const found = await findExistingGist(token);
          if (found) {
            config.gistId = found.id;
            persist();
            gist = await fetchGistById(token, found.id);
          }
        }

        if (!gist) {
          const lastSyncedAt = await createPrivateGist(token, storeState, theme);
          return { ok: true, action: 'created', lastSyncedAt };
        }

        const fileObj = gist.files?.[GIST_BACKUP_FILENAME];
        if (!fileObj) {
          const patched = await patchGist(token, gist.id, storeState, theme, false);
          if (patched.ok && patched.lastSyncedAt) {
            return { ok: true, action: 'pushed', lastSyncedAt: patched.lastSyncedAt };
          }
          const lastSyncedAt = await createPrivateGist(token, storeState, theme);
          return { ok: true, action: 'created', lastSyncedAt };
        }

        const content = await readGistFileContent(token, fileObj);
        const parsed = parseAndValidateBackup(content);
        if (!parsed.ok) {
          return { ok: false, status: 'error', error: `В Gist повреждён файл бэкапа: ${parsed.error}` };
        }

        const remoteIso = parsed.exportedAt || gist.updated_at || '';
        const remoteMs = remoteIso ? Date.parse(remoteIso) : 0;
        const safeRemoteMs = Number.isFinite(remoteMs) ? remoteMs : 0;
        const localMs = config.localUpdatedAt ?? 0;
        const localIsDefault = isDefaultStoreState(storeState);

        if (localIsDefault || safeRemoteMs > localMs) {
          applyRemote({ data: parsed.data, theme: parsed.theme });
          const syncIso = new Date(now()).toISOString();
          config.localUpdatedAt = safeRemoteMs || now();
          config.lastSyncedAt = syncIso;
          persist();
          return { ok: true, action: 'pulled', lastSyncedAt: syncIso };
        }

        if (localMs > safeRemoteMs) {
          const patched = await patchGist(token, gist.id, storeState, theme, false);
          if (patched.ok && patched.lastSyncedAt) {
            return { ok: true, action: 'pushed', lastSyncedAt: patched.lastSyncedAt };
          }
          const lastSyncedAt = await createPrivateGist(token, storeState, theme);
          return { ok: true, action: 'created', lastSyncedAt };
        }

        const syncIso = new Date(now()).toISOString();
        config.lastSyncedAt = syncIso;
        persist();
        return { ok: true, action: 'up-to-date', lastSyncedAt: syncIso };
      } catch (err) {
        if (!isOnline()) {
          return { ok: false, status: 'offline' };
        }
        const message = err instanceof Error ? err.message : 'Не удалось выполнить синхронизацию.';
        return { ok: false, status: 'error', error: message };
      }
    },

    /**
     * Pushes current local state to Gist (used on hide/pagehide and debounced saves).
     * Never overwrites local state.
     * @param {{
     *   storeState: StoreState,
     *   theme: string | null,
     *   keepalive?: boolean
     * }} params
     * @returns {Promise<SyncResult>}
     */
    async pushBackup({ storeState, theme, keepalive = false }) {
      const blocked = checkPreconditions();
      if (blocked) return blocked;
      const token = config.token;

      try {
        if (!config.gistId) {
          const found = await findExistingGist(token);
          if (found) {
            config.gistId = found.id;
            persist();
          }
        }

        if (!config.gistId) {
          const lastSyncedAt = await createPrivateGist(token, storeState, theme);
          return { ok: true, action: 'created', lastSyncedAt };
        }

        const patched = await patchGist(token, config.gistId, storeState, theme, keepalive);
        if (patched.notFound) {
          config.gistId = null;
          persist();
          const lastSyncedAt = await createPrivateGist(token, storeState, theme);
          return { ok: true, action: 'created', lastSyncedAt };
        }
        return { ok: true, action: 'pushed', lastSyncedAt: patched.lastSyncedAt || new Date(now()).toISOString() };
      } catch (err) {
        if (!isOnline()) {
          return { ok: false, status: 'offline' };
        }
        const message = err instanceof Error ? err.message : 'Ошибка сохранения в Gist.';
        return { ok: false, status: 'error', error: message };
      }
    }
  };
}

/**
 * Coordinates debounced background sync, lifecycle hooks (open/visible/hidden/pagehide),
 * and serialized execution so concurrent sync calls never race.
 * @param {{
 *   manager: ReturnType<typeof createGistSyncManager>,
 *   getState: () => StoreState,
 *   getTheme: () => string | null,
 *   applyRemote: (remote: { data: StoreState, theme: string | null }) => void,
 *   debounceMs?: number,
 *   scheduleTimer?: (fn: () => void, ms: number) => any,
 *   cancelTimer?: (id: any) => void
 * }} options
 */
export function createGistSyncController(options) {
  const {
    manager,
    getState,
    getTheme,
    applyRemote,
    debounceMs = 4000,
    scheduleTimer = (fn, ms) => setTimeout(fn, ms),
    cancelTimer = (id) => clearTimeout(id)
  } = options;

  /** @type {any} */
  let debounceTimerId = null;
  let hasPendingLocalChanges = false;
  let isApplyingRemote = false;
  /** @type {Promise<SyncResult>} */
  let queue = Promise.resolve({ ok: false, status: 'unconfigured' });
  /** @type {Set<(status: SyncStatusSnapshot) => void>} */
  const statusListeners = new Set();

  /** @type {SyncStatusSnapshot} */
  let lastStatus = manager.getConfig().hasToken
    ? {
        phase: manager.getConfig().lastSyncedAt ? 'synced' : 'idle',
        lastSyncedAt: manager.getConfig().lastSyncedAt,
        message: manager.getConfig().lastSyncedAt ? 'Синхронизировано' : 'Токен сохранён'
      }
    : {
        phase: 'unconfigured',
        lastSyncedAt: null,
        message: 'Не настроено'
      };

  /**
   * @param {SyncStatusSnapshot} next
   */
  const emitStatus = (next) => {
    lastStatus = next;
    for (const listener of statusListeners) {
      listener(next);
    }
  };

  /**
   * @param {SyncResult} res
   */
  const statusFromResult = (res) => {
    if (res.ok) {
      emitStatus({
        phase: 'synced',
        lastSyncedAt: res.lastSyncedAt,
        message: 'Синхронизировано'
      });
      return;
    }
    if (res.status === 'offline') {
      emitStatus({
        phase: 'offline',
        lastSyncedAt: manager.getConfig().lastSyncedAt,
        message: 'Офлайн — изменения сохранены локально'
      });
      return;
    }
    if (res.status === 'unconfigured') {
      emitStatus({
        phase: 'unconfigured',
        lastSyncedAt: null,
        message: 'Не настроено'
      });
      return;
    }
    emitStatus({
      phase: 'error',
      lastSyncedAt: manager.getConfig().lastSyncedAt,
      message: res.error || 'Ошибка синхронизации'
    });
  };

  const clearDebounce = () => {
    if (debounceTimerId !== null) {
      cancelTimer(debounceTimerId);
      debounceTimerId = null;
    }
  };

  /**
   * @param {() => Promise<SyncResult>} task
   * @returns {Promise<SyncResult>}
   */
  const enqueue = (task) => {
    const run = queue.then(async () => {
      if (manager.getConfig().hasToken) {
        emitStatus({
          phase: 'syncing',
          lastSyncedAt: manager.getConfig().lastSyncedAt,
          message: 'Синхронизация...'
        });
      }
      const res = await task();
      statusFromResult(res);
      return res;
    });
    queue = run.catch(() => ({ ok: false, status: 'error', error: 'Ошибка синхронизации' }));
    return run;
  };

  const wrappedApplyRemote = (/** @type {{ data: StoreState, theme: string | null }} */ remote) => {
    isApplyingRemote = true;
    try {
      applyRemote(remote);
      hasPendingLocalChanges = false;
    } finally {
      isApplyingRemote = false;
    }
  };

  const runSyncNow = () => {
    clearDebounce();
    return enqueue(async () => {
      const res = await manager.syncNow({
        storeState: getState(),
        theme: getTheme(),
        applyRemote: wrappedApplyRemote
      });
      if (res.ok) {
        hasPendingLocalChanges = false;
      }
      return res;
    });
  };

  const runPush = (keepalive = false) => {
    clearDebounce();
    return enqueue(async () => {
      const res = await manager.pushBackup({
        storeState: getState(),
        theme: getTheme(),
        keepalive
      });
      if (res.ok) {
        hasPendingLocalChanges = false;
      }
      return res;
    });
  };

  /**
   * @param {() => Promise<SyncResult>} fn
   * @returns {Promise<SyncResult>}
   */
  const runIfConfigured = (fn) => {
    if (!manager.getConfig().hasToken) {
      return Promise.resolve(/** @type {SyncResult} */ ({ ok: false, status: 'unconfigured' }));
    }
    return fn();
  };

  return {
    getStatus() {
      return lastStatus;
    },

    /**
     * @param {(status: SyncStatusSnapshot) => void} listener
     */
    onStatusChange(listener) {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },

    handleStoreChange() {
      if (isApplyingRemote) return;
      manager.markLocalUpdated();
      hasPendingLocalChanges = true;
      if (!manager.getConfig().hasToken) return;
      clearDebounce();
      debounceTimerId = scheduleTimer(() => {
        debounceTimerId = null;
        void runPush(false);
      }, debounceMs);
    },

    handleAppOpen() {
      return runIfConfigured(runSyncNow);
    },

    handleAppVisible() {
      return runIfConfigured(runSyncNow);
    },

    handleAppHidden() {
      return runIfConfigured(() => {
        if (!hasPendingLocalChanges && debounceTimerId === null) {
          return Promise.resolve(/** @type {SyncResult} */ ({
            ok: true,
            action: 'up-to-date',
            lastSyncedAt: manager.getConfig().lastSyncedAt || ''
          }));
        }
        return runPush(true);
      });
    },

    handleOnline() {
      return runIfConfigured(runSyncNow);
    },

    handleOffline() {
      if (!manager.getConfig().hasToken) return;
      emitStatus({
        phase: 'offline',
        lastSyncedAt: manager.getConfig().lastSyncedAt,
        message: 'Офлайн — изменения сохранены локально'
      });
    },

    syncNow: runSyncNow,

    /**
     * @param {string} token
     */
    setTokenAndSync(token) {
      manager.setToken(token);
      if (!manager.getConfig().hasToken) {
        clearDebounce();
        hasPendingLocalChanges = false;
        emitStatus({
          phase: 'unconfigured',
          lastSyncedAt: null,
          message: 'Не настроено'
        });
        return Promise.resolve(/** @type {SyncResult} */ ({ ok: false, status: 'unconfigured' }));
      }
      return runSyncNow();
    }
  };
}
