import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve('.');

test('manifest.json conforms to PWA specifications for standalone iOS app', () => {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(content.name, 'manifest must have a name');
  assert.ok(content.short_name, 'manifest must have a short_name');
  assert.strictEqual(content.display, 'standalone');
  assert.ok(content.start_url);
  assert.ok(Array.isArray(content.icons) && content.icons.length > 0, 'manifest must define icons');

  /** @param {{ sizes?: string }} i */
  const matches192 = (i) => Boolean(i.sizes?.includes('192x192'));
  /** @param {{ sizes?: string }} i */
  const matches512 = (i) => Boolean(i.sizes?.includes('512x512'));

  const has192 = content.icons.some(matches192);
  const has512 = content.icons.some(matches512);
  assert.ok(has192, 'manifest must have a 192x192 icon');
  assert.ok(has512, 'manifest must have a 512x512 icon');
});

test('index.html contains required iOS Safari standalone meta tags and links', () => {
  const htmlPath = path.join(ROOT_DIR, 'index.html');
  assert.ok(fs.existsSync(htmlPath), 'index.html must exist');

  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /name=["']viewport["'][^>]*viewport-fit=cover/i, 'viewport-fit=cover required for iPhone 15 notch/Dynamic Island');
  assert.match(html, /name=["']apple-mobile-web-app-capable["'][^>]*content=["']yes["']/i, 'apple-mobile-web-app-capable required');
  assert.match(html, /name=["']apple-mobile-web-app-status-bar-style["']/i, 'status-bar-style required');
  assert.match(html, /rel=["']manifest["'][^>]*href=["']manifest\.json["']/i, 'link to manifest.json required');
  assert.match(html, /rel=["']apple-touch-icon["']/i, 'link to apple-touch-icon required');
});

test('sw.js exists and precaches application resources for offline use', () => {
  const swPath = path.join(ROOT_DIR, 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist');

  const swCode = fs.readFileSync(swPath, 'utf8');
  assert.match(swCode, /CACHE_NAME/i, 'sw.js must define a CACHE_NAME');
  assert.match(swCode, /addEventListener\(['"]install['"]/i, 'sw.js must handle install event');
  assert.match(swCode, /addEventListener\(['"]fetch['"]/i, 'sw.js must handle fetch event');
  assert.match(swCode, /addEventListener\(['"]activate['"]/i, 'sw.js must handle activate event');
});
