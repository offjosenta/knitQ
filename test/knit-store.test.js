import test from 'node:test';
import assert from 'node:assert/strict';
import { createKnitStore } from '../src/core/knit-store.js';

/**
 * @param {Record<string, string>} [initial]
 */
function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    /** @param {string} key */
    getItem(key) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    /**
     * @param {string} key
     * @param {string} value
     */
    setItem(key, value) {
      store.set(key, String(value));
    }
  };
}

test('KnitStore initializes with an active part at row 0, empty row log, and paused timer', () => {
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => 1_000_000 });

  const part = store.getActivePart();
  assert.equal(part.currentRow, 0);
  assert.deepEqual(part.rowLog, []);
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 0);
});

test('incrementRow increases row count, logs timestamp, auto-starts paused timer, and persists', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.incrementRow();
  let part = store.getActivePart();
  assert.equal(part.currentRow, 1);
  assert.equal(store.isTimerRunning(), true);
  assert.deepEqual(part.rowLog, [
    { rowNumber: 1, timestamp: new Date(1_700_000_000_000).toISOString() }
  ]);

  // Advance 5 seconds and increment again: timer stays running, elapsed grows
  currentTime += 5000;
  store.incrementRow();
  part = store.getActivePart();
  assert.equal(part.currentRow, 2);
  assert.equal(store.getElapsedMs(), 5000);
  assert.equal(part.rowLog.length, 2);
  assert.equal(part.rowLog[1].rowNumber, 2);

  // Restoring from storage preserves row count, log, and running timer
  const restored = createKnitStore({ storage, now: () => currentTime + 3000 });
  assert.equal(restored.getActivePart().currentRow, 2);
  assert.equal(restored.getActivePart().rowLog.length, 2);
  assert.equal(restored.isTimerRunning(), true);
  assert.equal(restored.getElapsedMs(), 8000);
});

test('decrementRow decreases row count without going below 0 and removes last log entry', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.decrementRow();
  assert.equal(store.getActivePart().currentRow, 0);

  store.incrementRow();
  currentTime += 1000;
  store.incrementRow();
  assert.equal(store.getActivePart().currentRow, 2);
  assert.equal(store.getActivePart().rowLog.length, 2);

  store.decrementRow();
  assert.equal(store.getActivePart().currentRow, 1);
  assert.equal(store.getActivePart().rowLog.length, 1);
  assert.equal(store.getActivePart().rowLog[0].rowNumber, 1);

  const restored = createKnitStore({ storage, now: () => currentTime });
  assert.equal(restored.getActivePart().currentRow, 1);
  assert.equal(restored.getActivePart().rowLog.length, 1);
});

test('resetPart resets row count, clears row log, and resets paused timer', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.incrementRow();
  currentTime += 10_000;
  store.resetPart();

  assert.equal(store.getActivePart().currentRow, 0);
  assert.deepEqual(store.getActivePart().rowLog, []);
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 0);

  const restored = createKnitStore({ storage, now: () => currentTime + 5000 });
  assert.equal(restored.getActivePart().currentRow, 0);
  assert.deepEqual(restored.getActivePart().rowLog, []);
  assert.equal(restored.isTimerRunning(), false);
  assert.equal(restored.getElapsedMs(), 0);
});

test('timer supports manual start/pause/toggle and auto-resumes on incrementRow', () => {
  let currentTime = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage, now: () => currentTime });

  store.startTimer();
  assert.equal(store.isTimerRunning(), true);

  currentTime += 4000;
  store.pauseTimer();
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 4000);

  // Time passes while paused — elapsed does not grow
  currentTime += 10_000;
  assert.equal(store.getElapsedMs(), 4000);

  // Incrementing row auto-resumes the paused timer
  store.incrementRow();
  assert.equal(store.isTimerRunning(), true);
  currentTime += 2500;
  assert.equal(store.getElapsedMs(), 6500);

  // toggleTimer pauses then resumes
  store.toggleTimer();
  assert.equal(store.isTimerRunning(), false);
  assert.equal(store.getElapsedMs(), 6500);

  store.toggleTimer();
  assert.equal(store.isTimerRunning(), true);
});

test('KnitStore manages stitch check settings, actual stitch count, and migrates legacy stored parts', () => {
  const legacyState = {
    activeProjectId: 'p1',
    projects: [
      {
        id: 'p1',
        name: 'Старый проект',
        activePartId: 'part-old',
        parts: [
          {
            id: 'part-old',
            name: 'Резинка',
            currentRow: 5,
            rowLog: [],
            timer: { elapsedMs: 0, runningSince: null }
          }
        ]
      }
    ]
  };
  const storage = createMemoryStorage({
    knitq_store_v1: JSON.stringify(legacyState)
  });
  const store = createKnitStore({ storage });

  // Defaults for migrated part
  let part = store.getActivePart();
  assert.equal(part.stitchCheckInterval, 10);
  assert.equal(part.targetStitchCount, null);
  assert.equal(part.actualStitchCount, null);
  assert.deepEqual(part.rowRules, []);
  assert.deepEqual(part.rowMarkers, []);

  // Update check settings
  store.updatePartCheckSettings({ stitchCheckInterval: 15, targetStitchCount: 84 });
  part = store.getActivePart();
  assert.equal(part.stitchCheckInterval, 15);
  assert.equal(part.targetStitchCount, 84);

  // Set actual stitch count (e.g. user corrected count in check modal)
  store.setActualStitchCount(82);
  assert.equal(store.getActivePart().actualStitchCount, 82);

  // Persists across reload
  const restored = createKnitStore({ storage });
  assert.equal(restored.getActivePart().stitchCheckInterval, 15);
  assert.equal(restored.getActivePart().targetStitchCount, 84);
  assert.equal(restored.getActivePart().actualStitchCount, 82);
});

test('KnitStore adds and removes row rules on active part and persists them', () => {
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage });

  const rule = store.addRowRule({
    label: 'Сделайте прибавки реглана',
    everyNRows: 2,
    startRow: 1,
    repeatCount: 16
  });

  assert.ok(rule.id);
  assert.equal(store.getActivePart().rowRules.length, 1);
  assert.equal(store.getActivePart().rowRules[0].label, 'Сделайте прибавки реглана');
  assert.equal(store.getActivePart().rowRules[0].everyNRows, 2);
  assert.equal(store.getActivePart().rowRules[0].repeatCount, 16);

  const restored = createKnitStore({ storage });
  assert.equal(restored.getActivePart().rowRules.length, 1);

  restored.removeRowRule(rule.id);
  assert.equal(restored.getActivePart().rowRules.length, 0);
});

test('KnitStore adds and removes row markers on active part and persists them', () => {
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage });

  const marker = store.addRowMarker(42, 'Разделить рукава');
  assert.ok(marker.id);
  assert.equal(marker.rowNumber, 42);
  assert.equal(marker.text, 'Разделить рукава');
  assert.equal(store.getActivePart().rowMarkers.length, 1);

  const restored = createKnitStore({ storage });
  assert.equal(restored.getActivePart().rowMarkers.length, 1);
  assert.equal(restored.getActivePart().rowMarkers[0].text, 'Разделить рукава');

  restored.removeRowMarker(marker.id);
  assert.equal(restored.getActivePart().rowMarkers.length, 0);
});

test('KnitStore updates project passport, targetRows, yarns, notes, photo, and persists', () => {
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage });

  store.updateProjectPassport({
    name: 'Свитер «Север»',
    needleSize: '4.5 мм',
    notes: 'Вязать свободно по кругу'
  });
  store.updatePartTargetRows(120);

  const yarn = store.addYarnEntry({
    name: 'Drops Merino Extra Fine',
    composition: '100% меринос',
    strands: 2,
    skeinsUsed: 3,
    skeinsTotal: 8
  });
  assert.ok(yarn.id);
  store.updateYarnEntry(yarn.id, { skeinsUsed: 4 });

  const project = store.getActiveProject();
  assert.equal(project.name, 'Свитер «Север»');
  assert.equal(project.needleSize, '4.5 мм');
  assert.equal(project.notes, 'Вязать свободно по кругу');
  assert.equal(project.yarns.length, 1);
  assert.equal(project.yarns[0].strands, 2);
  assert.equal(project.yarns[0].skeinsUsed, 4);
  assert.equal(project.yarns[0].skeinsTotal, 8);
  assert.equal(store.getActivePart().targetRows, 120);

  const restored = createKnitStore({ storage });
  assert.equal(restored.getActiveProject().name, 'Свитер «Север»');
  assert.equal(restored.getActiveProject().yarns[0].skeinsUsed, 4);
  assert.equal(restored.getActivePart().targetRows, 120);

  restored.removeYarnEntry(yarn.id);
  assert.equal(restored.getActiveProject().yarns.length, 0);
});

test('KnitStore clones a paired part preserving targets, rules, and markers while resetting progress', () => {
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage });

  store.updatePartTargetRows(60);
  store.updatePartCheckSettings({ stitchCheckInterval: 12, targetStitchCount: 48 });
  store.addRowRule({ label: 'Прибавка', everyNRows: 4, startRow: 2, repeatCount: 6 });
  store.addRowMarker(30, 'Пройма');
  store.incrementRow();
  store.incrementRow();
  store.setActualStitchCount(48);

  const original = store.getActivePart();
  const paired = store.clonePairedPart(original.id);

  assert.notEqual(paired.id, original.id);
  assert.equal(paired.currentRow, 0);
  assert.deepEqual(paired.rowLog, []);
  assert.equal(paired.timer.elapsedMs, 0);
  assert.equal(paired.timer.runningSince, null);
  assert.equal(paired.actualStitchCount, null);
  assert.equal(paired.targetRows, 60);
  assert.equal(paired.stitchCheckInterval, 12);
  assert.equal(paired.targetStitchCount, 48);
  assert.equal(paired.rowRules.length, 1);
  assert.equal(paired.rowRules[0].label, 'Прибавка');
  assert.equal(paired.rowMarkers.length, 1);
  assert.equal(paired.rowMarkers[0].text, 'Пройма');
  assert.equal(store.getActivePart().id, paired.id);
  assert.equal(store.getActiveProject().parts.length, 2);

  // Switch back to original part
  store.setActivePart(original.id);
  assert.equal(store.getActivePart().id, original.id);
  assert.equal(store.getActivePart().currentRow, 2);
});

test('KnitStore adds, renames, removes parts and updates toolType, knittingMethod, stitchPattern', () => {
  const storage = createMemoryStorage();
  const store = createKnitStore({ storage });

  store.updateProjectPassport({
    toolType: 'hook',
    knittingMethod: 'circular',
    stitchPattern: 'Резинка 1×1'
  });
  assert.equal(store.getActiveProject().toolType, 'hook');
  assert.equal(store.getActiveProject().knittingMethod, 'circular');
  assert.equal(store.getActiveProject().stitchPattern, 'Резинка 1×1');

  const firstId = store.getActivePart().id;
  store.renamePart(firstId, 'Отворот');
  assert.equal(store.getActivePart().name, 'Отворот');

  const crown = store.addPart('Макушка');
  assert.equal(crown.name, 'Макушка');
  assert.equal(crown.currentRow, 0);
  assert.equal(store.getActivePart().id, crown.id);
  assert.equal(store.getActiveProject().parts.length, 2);

  // Removing active part switches back to remaining part
  store.removePart(crown.id);
  assert.equal(store.getActiveProject().parts.length, 1);
  assert.equal(store.getActivePart().id, firstId);

  // Cannot remove the last remaining part
  store.removePart(firstId);
  assert.equal(store.getActiveProject().parts.length, 1);
});

test('KnitStore creates projects with custom folders, colors, icons, unique names, and trash', () => {
  const storage = createMemoryStorage();
  let currentTime = new Date(2026, 10, 24, 10, 0, 0).getTime();
  const store = createKnitStore({ storage, now: () => currentTime });

  assert.deepEqual(store.getState().folders, []);
  const folder = store.addFolder('Шапки', '#34c759');
  assert.equal(folder?.name, 'Шапки');
  assert.equal(folder?.color, '#34c759');

  const first = store.createProject({
    name: 'Снуд',
    folder: 'Шарфы',
    icon: 'scarf',
    color: '#af52de',
    tags: ['зима', 'шерсть'],
    toolType: 'needles',
    needleSize: '6 мм'
  });
  assert.equal(first.parts.length, 1);
  assert.equal(first.folder, 'Шарфы');
  assert.equal(first.icon, 'scarf');
  assert.equal(first.color, '#af52de');
  assert.equal(store.isProjectNameTaken('снуд'), true);
  assert.equal(store.isProjectNameTaken('Снуд', first.id), false);

  const second = store.createProject({
    name: 'Носки',
    folder: 'Носки'
  });
  assert.equal(store.getActiveProject().id, second.id);

  // Pinned project tracks where timer/rows actually ran, not just active view
  store.setActiveProject(first.id);
  store.incrementRow();
  store.setActiveProject(second.id);
  assert.equal(store.getPinnedProject().id, first.id);

  // Delete project moves to trash and can be restored
  const delRes = store.deleteProject(second.id);
  assert.equal(delRes.ok, true);
  assert.equal(store.getState().trash.projects.length, 1);
  store.restoreTrashedProject(second.id);
  assert.equal(store.getState().trash.projects.length, 0);
  assert.equal(store.getState().projects.some((p) => p.id === second.id), true);

  // Deleting empty folder removes it immediately without trash
  store.deleteFolder('Шапки');
  assert.equal(store.getState().folders.some((f) => f.name === 'Шапки'), false);
  assert.equal(store.getState().trash.folders.length, 0);
});

test('KnitStore aggregates daily rows and time across morning and evening sessions, plus monthly and all-time stats', () => {
  const storage = createMemoryStorage();
  // Local time: 2026-11-24 09:00:00
  let currentTime = new Date(2026, 10, 24, 9, 0, 0).getTime();
  const store = createKnitStore({ storage, now: () => currentTime });

  // Previous day session on 2026-11-23 (1 hour, 2 rows)
  currentTime = new Date(2026, 10, 23, 18, 0, 0).getTime();
  store.incrementRow();
  currentTime += 30 * 60_000;
  store.incrementRow();
  currentTime += 30 * 60_000;
  store.pauseTimer(); // 60 min on Nov 23

  // Morning session on 2026-11-24 (20 min, 2 rows)
  currentTime = new Date(2026, 10, 24, 8, 30, 0).getTime();
  store.incrementRow();
  currentTime += 10 * 60_000;
  store.incrementRow();
  currentTime += 10 * 60_000;
  store.pauseTimer(); // 20 min on Nov 24 morning

  // Evening session on 2026-11-24 (25 min active + running, 1 row)
  currentTime = new Date(2026, 10, 24, 20, 0, 0).getTime();
  store.incrementRow();
  currentTime += 25 * 60_000;

  store.setProjectStatus(store.getActiveProject().id, 'completed');

  const stats = store.getActivityStats();
  assert.equal(stats.todayRows, 3);
  assert.equal(stats.todayTimeMs, 45 * 60_000);
  assert.equal(stats.monthTimeMs, 105 * 60_000);
  assert.equal(stats.totalTimeMs >= 105 * 60_000, true);
  assert.equal(stats.completedProjectsCount, 1);
});
