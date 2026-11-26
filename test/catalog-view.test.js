import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildCatalogView } from '../src/core/catalog-view.js';

const rootDir = path.resolve(import.meta.dirname, '..');

/**
 * @param {string} id
 * @param {Partial<import('../src/core/knit-store.js').Project>} [overrides]
 */
function makeProject(id, overrides = {}) {
  return /** @type {import('../src/core/knit-store.js').Project} */ ({
    id,
    name: `Проект ${id}`,
    status: 'active',
    folder: '',
    icon: 'hat',
    color: '#94A3B8',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    toolType: 'needles',
    needleSize: '4 мм',
    knittingMethod: '',
    stitchPattern: '',
    yarns: [],
    notes: '',
    photoDataUrl: null,
    activePartId: 'part-1',
    parts: [],
    gauge: {
      stitchesCount: null,
      rowsCount: null,
      widthPreWashCm: null,
      heightPreWashCm: null,
      widthPostWashCm: null,
      heightPostWashCm: null,
      targetWidthCm: null,
      targetHeightCm: null
    },
    ...overrides
  });
}

test('buildCatalogView shows folders only on Active tab with total project count across active and completed', () => {
  const folders = [
    { name: 'Шапки', color: '#38BDF8' },
    { name: 'Свитера', color: '#F472B6' }
  ];
  const projects = [
    makeProject('1', { status: 'active', folder: 'Шапки' }),
    makeProject('2', { status: 'completed', folder: 'Шапки' }),
    makeProject('3', { status: 'active', folder: '' }),
    makeProject('4', { status: 'completed', folder: '' })
  ];

  const activeView = buildCatalogView({
    projects,
    folders,
    status: 'active',
    openedFolder: null,
    tag: 'all'
  });

  assert.equal(activeView.showStatusTabs, true);
  assert.equal(activeView.effectiveStatus, 'active');
  assert.deepEqual(
    activeView.folderItems.map((item) => ({ name: item.folder.name, count: item.projectCount })),
    [
      { name: 'Шапки', count: 2 },
      { name: 'Свитера', count: 0 }
    ]
  );
  assert.deepEqual(
    activeView.rootProjects.map((p) => p.id),
    ['3']
  );
  assert.equal(activeView.openedFolderSections, null);
});

test('buildCatalogView renders Completed tab as a flat portfolio of all completed projects without folders', () => {
  const folders = [{ name: 'Шапки', color: '#38BDF8' }];
  const projects = [
    makeProject('1', { status: 'active', folder: 'Шапки' }),
    makeProject('2', { status: 'completed', folder: 'Шапки', photoDataUrl: 'data:image/jpeg;base64,abc' }),
    makeProject('3', { status: 'completed', folder: '' })
  ];

  const completedView = buildCatalogView({
    projects,
    folders,
    status: 'completed',
    openedFolder: null,
    tag: 'all'
  });

  assert.equal(completedView.showStatusTabs, true);
  assert.equal(completedView.effectiveStatus, 'completed');
  assert.deepEqual(completedView.folderItems, []);
  assert.deepEqual(
    completedView.rootProjects.map((p) => p.id),
    ['2', '3']
  );
  assert.equal(completedView.openedFolderSections, null);
});

test('buildCatalogView inside an opened folder separates active and completed projects and hides root status tabs', () => {
  const folders = [{ name: 'Шапки', color: '#38BDF8' }];
  const projects = [
    makeProject('1', { status: 'active', folder: 'Шапки', tags: ['зима'] }),
    makeProject('2', { status: 'completed', folder: 'Шапки', tags: ['подарок'] }),
    makeProject('3', { status: 'active', folder: '', tags: ['зима'] })
  ];

  const folderView = buildCatalogView({
    projects,
    folders,
    status: 'active',
    openedFolder: 'Шапки',
    tag: 'all'
  });

  assert.equal(folderView.showStatusTabs, false);
  assert.deepEqual(folderView.availableTags, ['зима', 'подарок']);
  assert.deepEqual(folderView.folderItems, []);
  assert.deepEqual(folderView.rootProjects, []);
  assert.deepEqual(
    folderView.openedFolderSections?.active.map((p) => p.id),
    ['1']
  );
  assert.deepEqual(
    folderView.openedFolderSections?.completed.map((p) => p.id),
    ['2']
  );
});

test('buildCatalogView falls back to active status when no completed projects exist and resets stale openedFolder', () => {
  const folders = [{ name: 'Носки', color: '#45FF38' }];
  const projects = [makeProject('1', { status: 'active', folder: 'Носки' })];

  const view = buildCatalogView({
    projects,
    folders,
    status: 'completed',
    openedFolder: 'Удалённая папка',
    tag: 'несуществующий'
  });

  assert.equal(view.showStatusTabs, false);
  assert.equal(view.effectiveStatus, 'active');
  assert.equal(view.effectiveOpenedFolder, null);
  assert.equal(view.effectiveTag, 'all');
  assert.equal(view.folderItems.length, 1);
});

test('project cards in app.js show only time without row count, and tabs use Активные / Завершённые', () => {
  const appJs = fs.readFileSync(path.join(rootDir, 'src/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(rootDir, 'src/style.css'), 'utf8');
  const swJs = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');

  assert.doesNotMatch(appJs, /\$\{totalRows\}\s*р\./);
  assert.match(appJs, /sub\.textContent\s*=\s*formatHoursMinutes\(store\.getProjectTotalElapsedMs\(proj\.id\)\)/);
  assert.match(html, /data-catalog-status="active"[^>]*>Активные</);
  assert.match(html, /data-catalog-status="completed"[^>]*>Завершённые</);
  assert.match(css, /\.catalog-subsection-title\s*\{/);
  assert.match(css, /\.square-tile\.has-photo::after\s*\{/);
  assert.match(swJs, /'\.\/src\/core\/catalog-view\.js'/);
});
