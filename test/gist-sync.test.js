import test from 'node:test';
import assert from 'node:assert/strict';
import { createKnitStore } from '../src/core/knit-store.js';
import { createBackupPayload } from '../src/core/backup-manager.js';
import { createGistSyncManager, createGistSyncController, GIST_BACKUP_FILENAME } from '../src/core/gist-sync.js';

function createMemoryStorage() {
  /** @type {Map<string, string>} */
  const map = new Map();
  return {
    /** @param {string} k */
    getItem: (k) => (map.has(k) ? map.get(k) ?? null : null),
    /**
     * @param {string} k
     * @param {string} v
     */
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    /** @param {string} k */
    removeItem: (k) => {
      map.delete(k);
    }
  };
}

test('createGistSyncManager creates a new private Gist when none exists with knitq-backup.json', async () => {
  const storage = createMemoryStorage();
  /** @type {Array<{ url: string, init: RequestInit }>} */
  const requests = [];
  let currentTime = 1_700_000_000_000;

  /**
   * @param {RequestInfo | URL} url
   * @param {RequestInit} [init]
   */
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).includes('/gists?') && init.method === 'GET') {
      return new Response(JSON.stringify([{ id: 'other-gist', files: { 'notes.txt': {} } }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (String(url).endsWith('/gists') && init.method === 'POST') {
      return new Response(JSON.stringify({ id: 'new-gist-123', updated_at: new Date(currentTime).toISOString() }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw new Error(`Unexpected request: ${init.method} ${url}`);
  };

  const store = createKnitStore({ storage: null, now: () => currentTime });
  store.createProject({ name: 'Свитер «Облако»' });

  const manager = createGistSyncManager({
    storage,
    fetchImpl,
    isOnline: () => true,
    now: () => currentTime
  });
  manager.setToken('ghp_test_token_123');

  let applied = false;
  const result = await manager.syncNow({
    storeState: store.getState(),
    theme: 'liquid-silver',
    applyRemote: () => {
      applied = true;
    }
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.action, 'created');
  }
  assert.equal(applied, false);
  assert.equal(manager.getConfig().gistId, 'new-gist-123');

  const postReq = requests.find((r) => r.init.method === 'POST');
  assert.ok(postReq, 'expected POST /gists request');
  const postBody = JSON.parse(String(postReq.init.body));
  assert.equal(postBody.public, false);
  assert.ok(postBody.files[GIST_BACKUP_FILENAME], 'expected knitq-backup.json in gist files');
  const headers = /** @type {Record<string, string>} */ (postReq.init.headers);
  assert.equal(headers.Authorization, 'Bearer ghp_test_token_123');
});

test('first token connect finds existing Gist (even truncated) and restores data onto fresh default store', async () => {
  const storage = createMemoryStorage();
  const remoteTime = 1_700_000_500_000;
  const remoteStore = createKnitStore({ storage: null, now: () => remoteTime });
  remoteStore.createProject({ name: 'Шапка с косами' });
  remoteStore.incrementRow();
  remoteStore.incrementRow();
  const remotePayload = createBackupPayload(remoteStore.getState(), 'light-minimal', remoteTime);

  /**
   * @param {RequestInfo | URL} url
   * @param {RequestInit} [init]
   */
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/gists?') && init.method === 'GET') {
      return new Response(
        JSON.stringify([
          { id: 'public-gist-ignore', public: true, files: { [GIST_BACKUP_FILENAME]: {} } },
          { id: 'existing-gist-99', public: false, files: { [GIST_BACKUP_FILENAME]: {} } }
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (u.endsWith('/gists/existing-gist-99') && init.method === 'GET') {
      return new Response(
        JSON.stringify({
          id: 'existing-gist-99',
          updated_at: new Date(remoteTime).toISOString(),
          files: {
            [GIST_BACKUP_FILENAME]: {
              truncated: true,
              raw_url: 'https://gist.githubusercontent.com/raw/knitq-backup.json'
            }
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (u === 'https://gist.githubusercontent.com/raw/knitq-backup.json' && init.method === 'GET') {
      return new Response(JSON.stringify(remotePayload), { status: 200 });
    }
    throw new Error(`Unexpected request: ${init.method} ${u}`);
  };

  // Fresh install on new iPhone (localUpdatedAt is null, store is default starter scarf)
  const localStore = createKnitStore({ storage: null, now: () => remoteTime + 10_000 });
  let restoredTheme = null;

  const manager = createGistSyncManager({
    storage,
    fetchImpl,
    isOnline: () => true,
    now: () => remoteTime + 10_000
  });
  manager.setToken('ghp_reinstalled_token');

  const result = await manager.syncNow({
    storeState: localStore.getState(),
    theme: 'liquid-silver',
    applyRemote: (remote) => {
      localStore.replaceState(remote.data);
      restoredTheme = remote.theme;
    }
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.action, 'pulled');
  }
  assert.equal(manager.getConfig().gistId, 'existing-gist-99');
  assert.equal(restoredTheme, 'light-minimal');
  assert.equal(localStore.getState().projects.some((p) => p.name === 'Шапка с косами'), true);
  assert.equal(localStore.getActivePart().currentRow, 2);
});

test('syncNow preserves newer offline local work and pushes it to Gist instead of overwriting', async () => {
  const storage = createMemoryStorage();
  const remoteTime = 1_700_000_000_000;
  const localTime = 1_700_000_900_000;

  const remoteStore = createKnitStore({ storage: null, now: () => remoteTime });
  remoteStore.incrementRow(); // 1 row in cloud
  const remotePayload = createBackupPayload(remoteStore.getState(), 'liquid-silver', remoteTime);

  const localStore = createKnitStore({ storage: null, now: () => localTime });
  localStore.incrementRow();
  localStore.incrementRow();
  localStore.incrementRow(); // 3 rows locally offline

  /** @type {string | null} */
  let patchedContent = null;
  /**
   * @param {RequestInfo | URL} url
   * @param {RequestInit} [init]
   */
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith('/gists/gist-1') && init.method === 'GET') {
      return new Response(
        JSON.stringify({
          id: 'gist-1',
          updated_at: new Date(remoteTime).toISOString(),
          files: {
            [GIST_BACKUP_FILENAME]: {
              truncated: false,
              content: JSON.stringify(remotePayload)
            }
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (u.endsWith('/gists/gist-1') && init.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      patchedContent = body.files[GIST_BACKUP_FILENAME].content;
      return new Response(JSON.stringify({ id: 'gist-1' }), { status: 200 });
    }
    throw new Error(`Unexpected request: ${init.method} ${u}`);
  };

  storage.setItem(
    'knitq_gist_sync_v1',
    JSON.stringify({
      token: 'ghp_token',
      gistId: 'gist-1',
      lastSyncedAt: new Date(remoteTime).toISOString(),
      localUpdatedAt: localTime
    })
  );

  const manager = createGistSyncManager({
    storage,
    fetchImpl,
    isOnline: () => true,
    now: () => localTime + 5_000
  });

  let appliedRemote = false;
  const result = await manager.syncNow({
    storeState: localStore.getState(),
    theme: 'liquid-silver',
    applyRemote: () => {
      appliedRemote = true;
    }
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.action, 'pushed');
  }
  assert.equal(appliedRemote, false);
  assert.equal(localStore.getActivePart().currentRow, 3);
  assert.ok(patchedContent, 'expected PATCH with local state');
  const uploaded = JSON.parse(patchedContent);
  assert.equal(uploaded.data.projects[0].parts[0].currentRow, 3);
});

test('offline mode, HTTP errors, and corrupted remote JSON never overwrite local data', async () => {
  const storage = createMemoryStorage();
  const localStore = createKnitStore({ storage: null, now: () => 1_700_000_000_000 });
  localStore.incrementRow();
  localStore.incrementRow();

  let online = false;
  let fetchCalled = false;
  const manager = createGistSyncManager({
    storage,
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 });
    },
    isOnline: () => online,
    now: () => 1_700_000_000_000
  });
  manager.setToken('ghp_bad');
  manager.markLocalUpdated(1_700_000_000_000);

  let applied = false;
  const offlineRes = await manager.syncNow({
    storeState: localStore.getState(),
    theme: 'liquid-silver',
    applyRemote: () => {
      applied = true;
    }
  });
  assert.equal(offlineRes.ok, false);
  if (!offlineRes.ok) {
    assert.equal(offlineRes.status, 'offline');
  }
  assert.equal(fetchCalled, false);
  assert.equal(applied, false);
  assert.equal(localStore.getActivePart().currentRow, 2);

  online = true;
  const authErrRes = await manager.syncNow({
    storeState: localStore.getState(),
    theme: 'liquid-silver',
    applyRemote: () => {
      applied = true;
    }
  });
  assert.equal(authErrRes.ok, false);
  if (!authErrRes.ok) {
    assert.equal(authErrRes.status, 'error');
    assert.match(authErrRes.error || '', /Неверный или просроченный/);
  }
  assert.equal(applied, false);
  assert.equal(localStore.getActivePart().currentRow, 2);

  // Corrupted JSON in remote Gist must also fail safely without overwriting local data
  const corruptManager = createGistSyncManager({
    storage: createMemoryStorage(),
    fetchImpl: async (url) => {
      const u = String(url);
      if (u.includes('/gists?')) {
        return new Response(
          JSON.stringify([{ id: 'corrupt-gist', public: false, files: { [GIST_BACKUP_FILENAME]: {} } }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          id: 'corrupt-gist',
          files: { [GIST_BACKUP_FILENAME]: { truncated: false, content: '{broken json' } }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
    isOnline: () => true,
    now: () => 1_700_000_000_000
  });
  corruptManager.setToken('ghp_ok');
  const corruptRes = await corruptManager.syncNow({
    storeState: localStore.getState(),
    theme: 'liquid-silver',
    applyRemote: () => {
      applied = true;
    }
  });
  assert.equal(corruptRes.ok, false);
  if (!corruptRes.ok) {
    assert.equal(corruptRes.status, 'error');
    assert.match(corruptRes.error || '', /повреждён/);
  }
  assert.equal(applied, false);
  assert.equal(localStore.getActivePart().currentRow, 2);
});

test('pushBackup recreates private Gist if cached gistId returns 404', async () => {
  const storage = createMemoryStorage();
  storage.setItem(
    'knitq_gist_sync_v1',
    JSON.stringify({
      token: 'ghp_token',
      gistId: 'deleted-gist',
      lastSyncedAt: null,
      localUpdatedAt: 1_700_000_000_000
    })
  );

  const localStore = createKnitStore({ storage: null, now: () => 1_700_000_000_000 });
  localStore.incrementRow();

  /**
   * @param {RequestInfo | URL} url
   * @param {RequestInit} [init]
   */
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith('/gists/deleted-gist') && init.method === 'PATCH') {
      return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
    }
    if (u.endsWith('/gists') && init.method === 'POST') {
      return new Response(JSON.stringify({ id: 'recreated-gist-42' }), { status: 201 });
    }
    throw new Error(`Unexpected request: ${init.method} ${u}`);
  };

  const manager = createGistSyncManager({
    storage,
    fetchImpl,
    isOnline: () => true,
    now: () => 1_700_000_010_000
  });

  const res = await manager.pushBackup({
    storeState: localStore.getState(),
    theme: 'liquid-silver',
    keepalive: true
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.action, 'created');
  }
  assert.equal(manager.getConfig().gistId, 'recreated-gist-42');
});

test('GistSyncController debounces changes, flushes with keepalive on hide, and skips redundant push on remote apply', async () => {
  const storage = createMemoryStorage();
  let currentTime = 1_700_000_000_000;
  const store = createKnitStore({ storage: null, now: () => currentTime });

  /** @type {Array<{ method: string, keepalive: boolean | undefined }>} */
  const calls = [];
  const remoteTime = currentTime + 50_000;
  const remoteStore = createKnitStore({ storage: null, now: () => remoteTime });
  remoteStore.incrementRow();
  remoteStore.incrementRow();
  remoteStore.incrementRow();
  remoteStore.incrementRow();
  const remotePayload = createBackupPayload(remoteStore.getState(), 'liquid-silver', remoteTime);

  /**
   * @param {RequestInfo | URL} url
   * @param {RequestInit} [init]
   */
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    calls.push({ method: String(init.method), keepalive: init.keepalive });
    if (u.endsWith('/gists/gist-ctrl') && init.method === 'GET') {
      return new Response(
        JSON.stringify({
          id: 'gist-ctrl',
          updated_at: new Date(remoteTime).toISOString(),
          files: {
            [GIST_BACKUP_FILENAME]: {
              truncated: false,
              content: JSON.stringify(remotePayload)
            }
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (u.endsWith('/gists/gist-ctrl') && init.method === 'PATCH') {
      return new Response(JSON.stringify({ id: 'gist-ctrl' }), { status: 200 });
    }
    throw new Error(`Unexpected request: ${init.method} ${u}`);
  };

  storage.setItem(
    'knitq_gist_sync_v1',
    JSON.stringify({
      token: 'ghp_ctrl',
      gistId: 'gist-ctrl',
      lastSyncedAt: new Date(currentTime).toISOString(),
      localUpdatedAt: currentTime
    })
  );

  const manager = createGistSyncManager({
    storage,
    fetchImpl,
    isOnline: () => true,
    now: () => currentTime
  });

  /** @type {Array<{ fn: () => void, ms: number }>} */
  const scheduled = [];
  let cancelledCount = 0;

  const controller = createGistSyncController({
    manager,
    getState: () => store.getState(),
    getTheme: () => 'liquid-silver',
    applyRemote: (remote) => {
      store.replaceState(remote.data);
    },
    debounceMs: 4000,
    scheduleTimer: (fn, ms) => {
      scheduled.push({ fn, ms });
      return scheduled.length;
    },
    cancelTimer: () => {
      cancelledCount += 1;
    }
  });

  store.subscribe(() => {
    controller.handleStoreChange();
  });

  // 1. Local edit schedules debounced push
  currentTime += 1000;
  store.incrementRow();
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].ms, 4000);

  // 2. App hidden before debounce fires: cancels timer and pushes immediately with keepalive=true
  const hideRes = await controller.handleAppHidden();
  assert.equal(cancelledCount, 1);
  assert.equal(hideRes.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].keepalive, true);

  // 3. Second hide with no pending changes does NOT make an extra network call
  const secondHideRes = await controller.handleAppHidden();
  assert.equal(secondHideRes.ok, true);
  assert.equal(calls.length, 1);

  // 4. Firing debounce callback pushes with keepalive=false
  currentTime += 1000;
  store.incrementRow();
  assert.equal(scheduled.length, 2);
  scheduled[1].fn();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'PATCH');
  assert.equal(calls[1].keepalive, false);

  // 5. Pulling remote state via syncNow applies it to store WITHOUT scheduling a redundant push
  const syncRes = await controller.syncNow();
  assert.equal(syncRes.ok, true);
  assert.equal(store.getActivePart().currentRow, 4);
  assert.equal(scheduled.length, 2);
});
