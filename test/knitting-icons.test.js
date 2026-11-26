import test from 'node:test';
import assert from 'node:assert/strict';
import { COLOR_PALETTE, KNITTING_ICONS, getFolderBadgeStyle, renderKnittingIconSvg } from '../src/core/knitting-icons.js';
import { createKnitStore } from '../src/core/knit-store.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    /** @param {string} key */
    getItem: (key) => (map.has(key) ? (map.get(key) ?? null) : null),
    /**
     * @param {string} key
     * @param {string} val
     */
    setItem: (key, val) => {
      map.set(key, String(val));
    },
    /** @param {string} key */
    removeItem: (key) => {
      map.delete(key);
    }
  };
}

test('COLOR_PALETTE contains the 10 agreed Liquid Glass colors', () => {
  assert.equal(COLOR_PALETTE.length, 10);
  assert.deepEqual(
    COLOR_PALETTE.map((c) => ({ label: c.label, hex: c.hex })),
    [
      { label: 'Мягкий зелёный', hex: '#86EFAC' },
      { label: 'Тёплый янтарь', hex: '#FBBF24' },
      { label: 'Алый', hex: '#F87171' },
      { label: 'Василёк', hex: '#5E81F4' },
      { label: 'Небесный лёд', hex: '#38BDF8' },
      { label: 'Лаванда', hex: '#A78BFA' },
      { label: 'Пыльная роза', hex: '#F472B6' },
      { label: 'Бирюзовый изумруд', hex: '#2DD4BF' },
      { label: 'Терракота', hex: '#E07A5F' },
      { label: 'Титан', hex: '#94A3B8' }
    ]
  );
});

test('KnitStore uses Titanium (#94A3B8) as the default color for new projects and folders', () => {
  const store = createKnitStore({ storage: createMemoryStorage() });
  const folder = store.addFolder('Зима');
  assert.equal(folder?.color, '#94A3B8');

  const project = store.createProject({ name: 'Шапка бини' });
  assert.equal(project.color, '#94A3B8');
});

test('KNITTING_ICONS contains 15 unique knitted garment/accessory icons without yarn, blanket, or needles', () => {
  assert.equal(KNITTING_ICONS.length, 15);

  const ids = KNITTING_ICONS.map((ic) => ic.id);
  const labels = KNITTING_ICONS.map((ic) => ic.label);
  assert.equal(new Set(ids).size, 15);
  assert.equal(new Set(labels).size, 15);

  assert.ok(ids.includes('longsleeve'), 'Expected longsleeve icon');
  assert.ok(ids.includes('shorts'), 'Expected shorts icon');
  assert.ok(labels.includes('Манишка'), 'Expected Манишка label');
  assert.ok(labels.includes('Платок Софи'), 'Expected Платок Софи label');

  for (const forbidden of ['yarn', 'blanket', 'needles', 'hook', 'dress', 'beret']) {
    assert.ok(!ids.includes(forbidden), `Forbidden icon id found: ${forbidden}`);
  }
  for (const label of labels) {
    assert.doesNotMatch(label, /клубок|плед|спиц|крюч|\//i);
  }
});

test('renderKnittingIconSvg uses unified 24x24 grid, 1.9 stroke width, and falls back safely for legacy ids', () => {
  for (const ic of KNITTING_ICONS) {
    assert.ok(ic.paths.trim().length > 0, `Empty paths for ${ic.id}`);
    const svg = renderKnittingIconSvg(ic.id, 24);
    assert.match(svg, /^<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1\.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">/);
    assert.ok(svg.includes(ic.paths));
    assert.ok(svg.endsWith('</svg>'));
  }

  const fallbackSvg = renderKnittingIconSvg('yarn');
  assert.ok(fallbackSvg.includes(KNITTING_ICONS[0].paths));
});

test('getFolderBadgeStyle returns tinted glass styles for folder projects and neutral reset without folder', () => {
  const folders = [
    { name: 'Зима', color: '#0ABAB5' },
    { name: 'Лето', color: '#45FF38' }
  ];

  const tinted = getFolderBadgeStyle('Зима', folders);
  assert.deepEqual(tinted, {
    backgroundColor: 'rgba(10, 186, 181, 0.16)',
    borderColor: 'rgba(10, 186, 181, 0.42)',
    color: '#0ABAB5'
  });

  const neutral = getFolderBadgeStyle('', folders);
  assert.deepEqual(neutral, {
    backgroundColor: '',
    borderColor: '',
    color: ''
  });
});
