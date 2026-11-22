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

function generateKnitIconPNG(size) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Raw RGBA image data with scanline filter bytes
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  let pos = 0;
  for (let y = 0; y < size; y++) {
    rawData[pos++] = 0; // Filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Squircle background corner radius
      const nx = Math.abs(x - cx) / (size * 0.46);
      const ny = Math.abs(y - cy) / (size * 0.46);
      const squircle = Math.pow(nx, 4) + Math.pow(ny, 4);

      if (squircle <= 1.0) {
        // Space gray / titanium metallic dark background
        const gradY = y / size;
        const bgR = Math.round(20 + gradY * 18);
        const bgG = Math.round(24 + gradY * 20);
        const bgB = Math.round(30 + gradY * 26);

        // Yarn ball circle in center
        if (dist <= r) {
          // Silver / emerald metallic sheen with concentric/curved yarn loop pattern
          const angle = Math.atan2(dy, dx);
          const loopWave = Math.sin(dist * 0.25 + angle * 4);
          const highlight = Math.max(0, 1 - dist / r);

          if (loopWave > 0.3) {
            // Shiny chrome / silver thread
            const v = Math.round(180 + highlight * 65);
            rawData[pos++] = v;
            rawData[pos++] = v + 5;
            rawData[pos++] = v + 12;
            rawData[pos++] = 255;
          } else {
            // Deeper metallic tone
            const v = Math.round(120 + highlight * 50);
            rawData[pos++] = Math.round(v * 0.85);
            rawData[pos++] = Math.round(v * 0.95);
            rawData[pos++] = Math.round(v * 1.1);
            rawData[pos++] = 255;
          }
        } else {
          // Outer squircle border sheen
          if (squircle > 0.92) {
            // Titanium border
            rawData[pos++] = 140;
            rawData[pos++] = 150;
            rawData[pos++] = 165;
            rawData[pos++] = 255;
          } else {
            rawData[pos++] = bgR;
            rawData[pos++] = bgG;
            rawData[pos++] = bgB;
            rawData[pos++] = 255;
          }
        }
      } else {
        // Transparent outside squircle
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        rawData[pos++] = 0;
      }
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
