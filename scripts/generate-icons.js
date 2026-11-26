import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function blendOver(dstR, dstG, dstB, srcR, srcG, srcB, alpha) {
  const a = clamp01(alpha);
  return [
    mix(dstR, srcR, a),
    mix(dstG, srcG, a),
    mix(dstB, srcB, a),
  ];
}

/** Distance from point (px, py) to line segment (ax, ay)-(bx, by). */
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return { dist: Math.sqrt(dx * dx + dy * dy), t: h };
}

/** Distance to a quadratic Bezier curve. */
function sdQuadraticBezier(px, py, p0, p1, p2, steps = 28) {
  let minDist = Infinity;
  let prevX = p0[0];
  let prevY = p0[1];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const it = 1 - t;
    const cx = it * it * p0[0] + 2 * it * t * p1[0] + t * t * p2[0];
    const cy = it * it * p0[1] + 2 * it * t * p1[1] + t * t * p2[1];
    const seg = sdSegment(px, py, prevX, prevY, cx, cy);
    if (seg.dist < minDist) minDist = seg.dist;
    prevX = cx;
    prevY = cy;
  }
  return minDist;
}

/**
 * Smooth minimum for organic liquid-metal blending.
 */
function smin(a, b, k) {
  const h = clamp01(0.5 + 0.5 * (b - a) / k);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/**
 * Signed distance to the fluid "Q" monogram (negative inside, positive outside).
 * Sized large (~78% of canvas) with organic liquid-metal proportions.
 */
function sdLiquidQ(x, y) {
  const cx = 0.47;
  const cy = 0.47;
  const loopR = 0.285;
  const dx = x - cx;
  const dy = y - cy;
  const angle = Math.atan2(dy, dx);

  // Subtle organic swell in stroke thickness for a fluid, molten-metal silhouette
  const ringHalfW = 0.068 + 0.010 * Math.sin(angle * 2.0 - 0.7);
  const ringDist = Math.abs(Math.hypot(dx, dy) - loopR) - ringHalfW;

  // Fluid S-curved tail emerging from inside the lower-right of the loop
  const tailDist = sdQuadraticBezier(x, y, [0.49, 0.50], [0.68, 0.65], [0.84, 0.84]) - 0.064;

  // Liquid-metal smooth union at the junction
  return smin(ringDist, tailDist, 0.032);
}

/**
 * Height profile inside the liquid-metal SDF (0 at edge, 1 at spine ridge).
 */
function liquidHeight(x, y, maxDepth) {
  const d = sdLiquidQ(x, y);
  if (d >= 0) return 0;
  const t = clamp01(-d / maxDepth);
  return Math.sqrt(clamp01(t * (2.0 - t)));
}

/**
 * High-contrast studio chrome environment map for molten silver / liquid mercury reflections.
 */
function sampleChromeEnv(rx, ry, rz) {
  // Primary studio softbox horizon + secondary upper-left & lower-right specular bands
  const band1 = smoothstep(0.18, 0.55, -ry * 0.78 - rx * 0.48 + rz * 0.35);
  const hot1 = smoothstep(0.62, 0.88, -ry * 0.75 - rx * 0.55 + rz * 0.30);
  const band2 = smoothstep(0.35, 0.75, ry * 0.65 + rx * 0.60);
  const rim = Math.pow(1.0 - clamp01(rz), 2.4);

  // Deep dark chrome troughs contrasted against sharp mirror-white highlights
  let lum = 18;
  lum = mix(lum, 165, band1);
  lum = mix(lum, 255, hot1);
  lum = mix(lum, 145, band2 * 0.68);
  lum = mix(lum, 225, rim * 0.45);

  // Slight cool silver tint
  return [
    clamp01((lum * 0.99) / 255) * 255,
    clamp01((lum * 1.00) / 255) * 255,
    clamp01((lum * 1.03) / 255) * 255,
  ];
}

/**
 * Generates the Apple iOS pure OLED black (#000000) KnitQ icon:
 * Maximally large, fluid 3D liquid-chrome "Q" monogram with mirror-silver highlights.
 */
function generateKnitIconPNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = writeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(size * (size * 4 + 1));
  const aa = 1.25 / size;
  const eps = 1.1 / size;
  const maxDepth = 0.078;

  let pos = 0;
  for (let py = 0; py < size; py++) {
    rawData[pos++] = 0; // Filter: None
    const y = (py + 0.5) / size;

    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size;

      // Pure OLED black background (#000000)
      let r = 0;
      let g = 0;
      let b = 0;

      const dist = sdLiquidQ(x, y);
      const alpha = 1.0 - smoothstep(-aa, aa, dist);

      if (alpha > 0) {
        // Compute 3D surface normal from liquid-metal height field
        const hx1 = liquidHeight(x + eps, y, maxDepth);
        const hx0 = liquidHeight(x - eps, y, maxDepth);
        const hy1 = liquidHeight(x, y + eps, maxDepth);
        const hy0 = liquidHeight(x, y - eps, maxDepth);

        const slopeScale = 0.048;
        let nx = -(hx1 - hx0) / (2 * eps) * slopeScale;
        let ny = -(hy1 - hy0) / (2 * eps) * slopeScale;
        let nz = 1.0;
        const nLen = Math.hypot(nx, ny, nz);
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;

        // Reflection vector for view vector V = (0, 0, 1)
        const rx = 2 * nz * nx;
        const ry = 2 * nz * ny;
        const rz = 2 * nz * nz - 1;

        const [mr, mg, mb] = sampleChromeEnv(rx, ry, rz);
        [r, g, b] = blendOver(r, g, b, mr, mg, mb, alpha);
      }

      rawData[pos++] = Math.round(clamp01(r / 255) * 255);
      rawData[pos++] = Math.round(clamp01(g / 255) * 255);
      rawData[pos++] = Math.round(clamp01(b / 255) * 255);
      rawData[pos++] = 255;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', idatData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('icons');
const targetFiles = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const force = process.argv.includes('--force');

if (!force && targetFiles.every((file) => fs.existsSync(path.join(iconsDir, file)))) {
  console.log('Icons already exist in icons/. Skipping procedural generation to preserve the 3D Liquid Chrome icons (pass --force to overwrite).');
  process.exit(0);
}

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateKnitIconPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateKnitIconPNG(512));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), generateKnitIconPNG(180));
console.log('Icons successfully generated!');
