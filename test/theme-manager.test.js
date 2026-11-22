import test from 'node:test';
import assert from 'node:assert/strict';
import { createThemeManager, THEMES, DEFAULT_THEME } from '../src/core/theme-manager.js';

/**
 * Shared mock environment helper for ThemeManager tests
 * @param {Array<[string, string]>} [initialEntries]
 */
function createMockEnvironment(initialEntries = []) {
  /** @type {Map<string, string>} */
  const storage = new Map(initialEntries);
  /** @type {Map<string, string>} */
  const attributes = new Map();
  const documentElement = {
    /**
     * @param {string} key
     * @param {string} val
     */
    setAttribute: (key, val) => attributes.set(key, val),
    /**
     * @param {string} key
     */
    getAttribute: (key) => attributes.get(key) ?? null
  };

  const themeManager = createThemeManager({
    storage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v)
    },
    documentElement
  });

  return { storage, attributes, documentElement, themeManager };
}

test('ThemeManager defaults to liquid-silver when no theme is stored', () => {
  const { themeManager, documentElement } = createMockEnvironment();

  assert.strictEqual(themeManager.getTheme(), DEFAULT_THEME);
  assert.strictEqual(DEFAULT_THEME, 'liquid-silver');
  assert.strictEqual(documentElement.getAttribute('data-theme'), 'liquid-silver');
});

test('ThemeManager changes theme, persists to storage, and updates data-theme attribute', () => {
  const { themeManager, storage, documentElement } = createMockEnvironment();

  themeManager.setTheme('emerald-glass');
  assert.strictEqual(themeManager.getTheme(), 'emerald-glass');
  assert.strictEqual(storage.get('knit_theme'), 'emerald-glass');
  assert.strictEqual(documentElement.getAttribute('data-theme'), 'emerald-glass');

  themeManager.setTheme('light-minimal');
  assert.strictEqual(themeManager.getTheme(), 'light-minimal');
  assert.strictEqual(storage.get('knit_theme'), 'light-minimal');
  assert.strictEqual(documentElement.getAttribute('data-theme'), 'light-minimal');
});

test('ThemeManager restores stored theme on initialization', () => {
  const { themeManager, documentElement } = createMockEnvironment([['knit_theme', 'emerald-glass']]);

  assert.strictEqual(themeManager.getTheme(), 'emerald-glass');
  assert.strictEqual(documentElement.getAttribute('data-theme'), 'emerald-glass');
});

test('ThemeManager rejects invalid theme and falls back to default', () => {
  const { themeManager } = createMockEnvironment([['knit_theme', 'invalid-theme']]);

  assert.strictEqual(themeManager.getTheme(), DEFAULT_THEME);
  assert.throws(() => themeManager.setTheme('unknown-theme'), /Invalid theme/);
});
