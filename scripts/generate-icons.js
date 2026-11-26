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
 * Renders a cylindrical Liquid Silver stroke pixel given signed distance and half-width.
 */
function shadeLiquidSilver(r, g, b, dist, halfW, x, y, aa) {
  const alpha = 1.0 - smoothstep(halfW - aa, halfW + aa, dist);
  if (alpha <= 0) return [r, g, b];

  const profile = clamp01(1.0 - dist / halfW);
  const specular = Math.pow(profile, 2.4);
  const diagGrad = clamp01(1.0 - ((x - 0.18) * 0.55 + (y - 0.15) * 0.65));

  const baseR = mix(172, 238, diagGrad);
  const baseG = mix(180, 242, diagGrad);
  const baseB = mix(196, 250, diagGrad);

  const sr = mix(baseR, 255, specular * 0.65);
  const sg = mix(baseG, 255, specular * 0.65);
  const sb = mix(baseB, 255, specular * 0.62);
  return blendOver(r, g, b, sr, sg, sb, alpha);
}

/**
 * Generates the Apple iOS Liquid Glass KnitQ icon:
 * Minimalist "Q" monogram formed from a sculpted Liquid Silver yarn strand.
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
  const aa = 1.3 / size;

  const cx = 0.48;
  const cy = 0.48;
  const loopR = 0.26;
  const discR = 0.33;
  const halfStroke = 0.041;
  const tailCurve = [
    [0.52, 0.54],
    [0.66, 0.66],
    [0.78, 0.78],
  ];

  let pos = 0;
  for (let py = 0; py < size; py++) {
    rawData[pos++] = 0; // Filter: None
    const y = (py + 0.5) / size;

    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size;

      // 1. Deep Apple OLED / Liquid Glass background
      let r = mix(7, 17, y);
      let g = mix(8, 20, y);
      let b = mix(12, 27, y);

      const topGlow = Math.exp(-((x - 0.5) * (x - 0.5) * 3.0 + (y - 0.26) * (y - 0.26) * 3.6));
      r = mix(r, 38, topGlow * 0.55);
      g = mix(g, 43, topGlow * 0.55);
      b = mix(b, 56, topGlow * 0.55);

      // 2. Subtle frosted glass disc framing the Q monogram
      const discDist = Math.hypot(x - cx, y - cy);
      const discAlpha = 1.0 - smoothstep(discR - aa, discR + aa, discDist);
      if (discAlpha > 0) {
        [r, g, b] = blendOver(r, g, b, 255, 255, 255, discAlpha * 0.04);
      }

      // 3. Main circular yarn loop of the Q
      const ringDist = Math.abs(discDist - loopR);
      [r, g, b] = shadeLiquidSilver(r, g, b, ringDist, halfStroke, x, y, aa);

      // 4. Crossing Q yarn tail with soft drop shadow for depth
      const tailDist = sdQuadraticBezier(x, y, tailCurve[0], tailCurve[1], tailCurve[2]);
      const shadowDist = sdQuadraticBezier(x, y - 0.014, tailCurve[0], tailCurve[1], tailCurve[2]);
      const shadowAlpha = (1.0 - smoothstep(halfStroke * 0.85, halfStroke * 1.85, shadowDist)) * 0.42;
      if (shadowAlpha > 0) {
        [r, g, b] = blendOver(r, g, b, 0, 0, 0, shadowAlpha);
      }

      [r, g, b] = shadeLiquidSilver(r, g, b, tailDist, halfStroke, x, y, aa);

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
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateKnitIconPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateKnitIconPNG(512));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), generateKnitIconPNG(180));
console.log('Icons successfully generated!');
