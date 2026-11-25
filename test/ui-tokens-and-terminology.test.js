import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(rootDir, 'src/style.css'), 'utf8');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'src/app.js'), 'utf8');
const storeJs = fs.readFileSync(path.join(rootDir, 'src/core/knit-store.js'), 'utf8');

/**
 * @param {string} selector
 */
function assertSingleCssDefinition(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = css.match(new RegExp(`^${escaped}\\s*\\{`, 'gm')) || [];
  assert.equal(matches.length, 1, `Expected 1 definition for ${selector}, found ${matches.length}`);
}

test('style.css defines Liquid Glass radius, spacing, control, and line-height tokens', () => {
  for (const token of [
    /--radius-card:\s*24px;/,
    /--radius-sheet:\s*28px;/,
    /--radius-button:\s*14px;/,
    /--radius-control:\s*12px;/,
    /--radius-pill:\s*999px;/,
    /--control-height:\s*40px;/,
    /--modal-btn-height:\s*48px;/,
    /--space-md:\s*12px;/,
    /--lh-base:\s*1\.5;/
  ]) {
    assert.match(css, token);
  }
});

test('style.css only supports liquid-silver and light-minimal themes without duplicate rules', () => {
  assert.doesNotMatch(css, /emerald/i);
  const themeMatches = [...css.matchAll(/\[data-theme="([^"]+)"\]/g)].map((m) => m[1]);
  assert.ok(themeMatches.length > 0);
  for (const theme of themeMatches) {
    assert.ok(theme === 'liquid-silver' || theme === 'light-minimal', `Unexpected theme selector: ${theme}`);
  }

  assertSingleCssDefinition('.btn-primary-action');
  assertSingleCssDefinition('.catalog-empty');
});

test('modal action buttons keep fixed 48px height in vertical forms and flex only in horizontal action rows', () => {
  const baseBlock = css.match(/\.btn-primary-action,\s*\.btn-secondary-action,\s*\.btn-destructive-action\s*\{([^}]+)\}/);
  assert.ok(baseBlock, 'Expected shared modal button rule');
  assert.match(baseBlock[1], /height:\s*var\(--modal-btn-height\);/);
  assert.doesNotMatch(baseBlock[1], /\bflex:\s*1;/);

  assert.match(
    css,
    /\.reset-confirm-actions\s*>\s*\.btn-primary-action[\s\S]*?\{[^}]*\bflex:\s*1;/
  );
});

test('UI and store use canonical term "проект" instead of "изделие"', () => {
  assert.doesNotMatch(html, /издели/i);
  assert.doesNotMatch(appJs, /издели/i);
  assert.doesNotMatch(storeJs, /издели/i);
});

test('modal form buttons use unified modal action classes instead of btn-continue-knitting', () => {
  assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]*btn-continue-knitting/);
  assert.doesNotMatch(appJs, /deleteConfirmActionsEl[\s\S]*btn-continue-knitting/);
});
