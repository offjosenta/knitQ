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

test('index.html brand-icon renders minimalist Q monogram SVG', () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const brandIconMatch = html.match(/<div class="brand-icon">([\s\S]*?)<\/div>/);
  assert.ok(brandIconMatch, 'index.html must contain .brand-icon');
  assert.match(brandIconMatch[1], /M18\.2 14\.2A7 7/, 'brand-icon SVG must render the Q yarn monogram');
  assert.doesNotMatch(brandIconMatch[1], /crossed knitting needles/i, 'legacy yarn-ball needles icon must be replaced');
});

test('generated PNG icons exist with valid PNG headers and exact required dimensions', () => {
  const expectedIcons = [
    { file: 'icons/apple-touch-icon.png', width: 180, height: 180 },
    { file: 'icons/icon-192.png', width: 192, height: 192 },
    { file: 'icons/icon-512.png', width: 512, height: 512 },
  ];

  for (const { file, width, height } of expectedIcons) {
    const buf = fs.readFileSync(path.join(ROOT_DIR, file));
    assert.strictEqual(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} must have valid PNG signature`);
    assert.strictEqual(buf.subarray(12, 16).toString('ascii'), 'IHDR', `${file} must start with IHDR chunk`);
    assert.strictEqual(buf.readUInt32BE(16), width, `${file} width must be ${width}`);
    assert.strictEqual(buf.readUInt32BE(20), height, `${file} height must be ${height}`);
  }
});

test('sw.js STATIC_ASSETS uses relative paths and precaches all src and icon files', () => {
  const swCode = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf8');
  const assetsMatch = swCode.match(/const\s+STATIC_ASSETS\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(assetsMatch, 'sw.js must define STATIC_ASSETS array');

  const entries = [...assetsMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(entries.includes('./'), 'STATIC_ASSETS must include "./"');
  assert.ok(entries.includes('./index.html'), 'STATIC_ASSETS must include "./index.html"');
  assert.ok(entries.includes('./manifest.json'), 'STATIC_ASSETS must include "./manifest.json"');

  for (const entry of entries) {
    assert.ok(entry.startsWith('./'), `STATIC_ASSETS entry "${entry}" must be relative (start with "./") for GitHub Pages`);
    if (entry !== './') {
      const diskPath = path.join(ROOT_DIR, entry.slice(2));
      assert.ok(fs.existsSync(diskPath), `STATIC_ASSETS entry "${entry}" must exist on disk`);
    }
  }

  /**
   * @param {string} dir
   * @returns {string[]}
   */
  const collectFiles = (dir) => {
    const results = [];
    for (const item of fs.readdirSync(path.join(ROOT_DIR, dir), { withFileTypes: true })) {
      const rel = `${dir}/${item.name}`;
      if (item.isDirectory()) {
        results.push(...collectFiles(rel));
      } else {
        results.push(`./${rel}`);
      }
    }
    return results;
  };

  const requiredAssets = [...collectFiles('src'), ...collectFiles('icons')];
  for (const asset of requiredAssets) {
    assert.ok(entries.includes(asset), `STATIC_ASSETS must precache "${asset}" for offline mode`);
  }
});

test('manifest.json uses relative paths and .nojekyll exists for GitHub Pages', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8'));
  assert.ok(!manifest.start_url.startsWith('/'), 'manifest start_url must be relative');
  assert.ok(!manifest.scope.startsWith('/'), 'manifest scope must be relative');
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'), `manifest icon src "${icon.src}" must be relative`);
  }
  assert.ok(fs.existsSync(path.join(ROOT_DIR, '.nojekyll')), '.nojekyll must exist at repo root for GitHub Pages');
});
