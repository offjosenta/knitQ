import test from 'node:test';
import assert from 'node:assert/strict';
import { createKnitStore } from '../src/core/knit-store.js';
import { createBackupPayload, isDefaultStoreState, parseAndValidateBackup } from '../src/core/backup-manager.js';

test('createBackupPayload packages store state and theme into a versioned JSON envelope', () => {
  const store = createKnitStore({ storage: null, now: () => 1_700_000_000_000 });
  store.createProject({ name: 'Шарф для теста', folder: 'Шарфы', tags: ['шерсть'] });

  const payload = createBackupPayload(store.getState(), 'light-minimal', 1_700_000_000_000);
  assert.equal(payload.app, 'KnitQ');
  assert.equal(payload.version, 1);
  assert.equal(payload.theme, 'light-minimal');
  assert.equal(payload.exportedAt, new Date(1_700_000_000_000).toISOString());
  assert.equal(payload.data.projects[0].name, 'Шарф для теста');

  const parsed = parseAndValidateBackup(JSON.stringify(payload));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.theme, 'light-minimal');
    assert.equal(parsed.data.projects[0].name, 'Шарф для теста');
    assert.deepEqual(parsed.data.projects[0].tags, ['шерсть']);
  }
});

test('parseAndValidateBackup rejects corrupted JSON and invalid schemas safely', () => {
  const badJson = parseAndValidateBackup('{not valid json');
  assert.equal(badJson.ok, false);

  const emptyObj = parseAndValidateBackup('{}');
  assert.equal(emptyObj.ok, false);

  const emptyProjects = parseAndValidateBackup(JSON.stringify({ app: 'KnitQ', data: { projects: [] } }));
  assert.equal(emptyProjects.ok, false);

  const brokenPart = parseAndValidateBackup(
    JSON.stringify({
      app: 'KnitQ',
      data: {
        activeProjectId: 'p1',
        projects: [{ id: 'p1', parts: [{ currentRow: 'NaN' }] }]
      }
    })
  );
  assert.equal(brokenPart.ok, false);
});

test('backup round-trip preserves fixTimer and fixSessions separately from main timer', () => {
  let currentTime = 1_700_000_000_000;
  const store = createKnitStore({ storage: null, now: () => currentTime });
  store.startTimer();
  currentTime += 12_000;
  store.startFixTimer();
  currentTime += 8_000;
  store.pauseFixTimer();

  const payload = createBackupPayload(store.getState(), null, currentTime);
  const parsed = parseAndValidateBackup(JSON.stringify(payload));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    const restored = createKnitStore({ storage: null, now: () => currentTime });
    restored.replaceState(parsed.data);
    assert.equal(restored.getElapsedMs(), 12_000);
    assert.equal(restored.getFixElapsedMs(), 8_000);
    assert.equal(restored.getActivePart().fixSessions.length, 1);
  }
});

test('isDefaultStoreState returns true only for untouched starter state', () => {
  const fresh = createKnitStore({ storage: null, now: () => 1_700_000_000_000 });
  assert.equal(isDefaultStoreState(fresh.getState()), true);

  const withRow = createKnitStore({ storage: null, now: () => 1_700_000_000_000 });
  withRow.incrementRow();
  assert.equal(isDefaultStoreState(withRow.getState()), false);

  const withFolder = createKnitStore({ storage: null, now: () => 1_700_000_000_000 });
  withFolder.addFolder('Носки');
  assert.equal(isDefaultStoreState(withFolder.getState()), false);

  const withProject = createKnitStore({ storage: null, now: () => 1_700_000_000_000 });
  withProject.createProject({ name: 'Свитер' });
  assert.equal(isDefaultStoreState(withProject.getState()), false);
});
