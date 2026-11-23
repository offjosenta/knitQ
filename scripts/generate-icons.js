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
 * Generates a large, unmistakable Apple iOS minimalist KnitQ icon:
 * Full-length crossed knitting needles with round stoppers passing behind
 * a clean Liquid Silver yarn ball with parallel yarn-wrap arcs and a trailing thread.
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

  const cx = 0.5;
  const cy = 0.53;
  const ballR = 0.255;
  const strokeW = 0.020;

  // Full-length crossed knitting needles passing behind the yarn ball
  const needles = [
    { a: [0.19, 0.19], b: [0.80, 0.80] },
    { a: [0.81, 0.19], b: [0.20, 0.80] },
  ];
  const needleW = 0.018;
  const stopperR = 0.042;

  let pos = 0;
  for (let py = 0; py < size; py++) {
    rawData[pos++] = 0; // Filter: None
    const y = (py + 0.5) / size;

    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size;

      // 1. Deep Apple OLED / Liquid Glass background
      let r = mix(6, 16, y);
      let g = mix(7, 18, y);
      let b = mix(10, 24, y);

      const topGlow = Math.exp(-((x - 0.5) * (x - 0.5) * 3.2 + (y - 0.28) * (y - 0.28) * 3.8));
      r = mix(r, 34, topGlow * 0.55);
      g = mix(g, 38, topGlow * 0.55);
      b = mix(b, 50, topGlow * 0.55);

      // 2. Full-length crossed knitting needles (behind the yarn ball)
      for (const n of needles) {
        const seg = sdSegment(x, y, n.a[0], n.a[1], n.b[0], n.b[1]);
        const taperedW = needleW * (1.0 - 0.42 * seg.t);
        const shaftAlpha = 1.0 - smoothstep(taperedW - aa, taperedW + aa, seg.dist);
        if (shaftAlpha > 0) {
          const shine = 1.0 - clamp01(seg.dist / taperedW);
          const sv = mix(160, 238, shine);
          [r, g, b] = blendOver(r, g, b, sv, sv + 4, sv + 10, shaftAlpha);
        }

        // Minimalist round stopper knob at the top of each needle
        const capDist = Math.hypot(x - n.a[0], y - n.a[1]);
        const capAlpha = 1.0 - smoothstep(stopperR - aa, stopperR + aa, capDist);
        if (capAlpha > 0) {
          const lx = (x - n.a[0]) / stopperR;
          const ly = (y - n.a[1]) / stopperR;
          const light = clamp01(0.65 - 0.4 * lx - 0.5 * ly);
          const cv = mix(165, 248, light);
          [r, g, b] = blendOver(r, g, b, cv, cv + 3, cv + 8, capAlpha);
        }
      }

      // 3. Trailing yarn thread at bottom-right
      const tailDist = sdQuadraticBezier(x, y, [0.68, 0.70], [0.76, 0.78], [0.85, 0.72]);
      const tailAlpha = 1.0 - smoothstep(strokeW * 0.9 - aa, strokeW * 0.9 + aa, tailDist);
      if (tailAlpha > 0) {
        [r, g, b] = blendOver(r, g, b, 215, 222, 232, tailAlpha);
      }

      // 4. Yarn ball disc (masks the needle intersection cleanly)
      const discDist = Math.hypot(x - cx, y - cy);
      const discAlpha = 1.0 - smoothstep(ballR - aa, ballR + aa, discDist);
      if (discAlpha > 0) {
        const glassGrad = clamp01(1.0 - (y - (cy - ballR)) / (ballR * 2));
        const br = mix(22, 42, glassGrad);
        const bg = mix(24, 46, glassGrad);
        const bb = mix(28, 54, glassGrad);
        [r, g, b] = blendOver(r, g, b, br, bg, bb, discAlpha);
      }

      // 5. Crisp Liquid Silver yarn ball outline + clean parallel wrap arcs
      const ringDist = Math.abs(discDist - ballR);
      const insideBall = 1.0 - smoothstep(ballR - aa, ballR + aa, discDist);

      // Parallel curved yarn strands inside the ball (2 upper-right, 2 lower-left)
      const a1 = sdQuadraticBezier(x, y, [0.27, 0.44], [0.49, 0.37], [0.72, 0.53]) + (1.0 - insideBall);
      const a2 = sdQuadraticBezier(x, y, [0.25, 0.55], [0.49, 0.48], [0.72, 0.64]) + (1.0 - insideBall);
      const a3 = sdQuadraticBezier(x, y, [0.35, 0.72], [0.47, 0.63], [0.64, 0.68]) + (1.0 - insideBall);

      const glyphDist = Math.min(ringDist, a1, a2, a3);
      const glyphAlpha = 1.0 - smoothstep(strokeW - aa, strokeW + aa, glyphDist);
      if (glyphAlpha > 0) {
        const silverT = clamp01(1.0 - (y - 0.25) / 0.55);
        const sr = mix(205, 250, silverT);
        const sg = mix(210, 252, silverT);
        const sb = mix(220, 255, silverT);
        [r, g, b] = blendOver(r, g, b, sr, sg, sb, glyphAlpha);
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
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateKnitIconPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateKnitIconPNG(512));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), generateKnitIconPNG(180));
console.log('Icons successfully generated!');
