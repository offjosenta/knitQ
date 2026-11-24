import test from 'node:test';
import assert from 'node:assert/strict';
import { createKnitStore } from '../src/core/knit-store.js';
import { createBackupPayload, parseAndValidateBackup } from '../src/core/backup-manager.js';

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
