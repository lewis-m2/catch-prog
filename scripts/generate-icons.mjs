// Draws the app icons (a white stopwatch on the accent blue) into public/.
// Uses only Node built-ins, to avoid an image library for one small job.
// Run with: npm run icons. The results are committed, so this rarely needs re-running.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BLUE = [0x00, 0x57, 0xff];
const WHITE = [0xff, 0xff, 0xff];

const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;

/** Is this point, in 0..1 icon coordinates, part of the white stopwatch? */
function inStopwatch(x, y) {
  const distance = Math.hypot(x - 0.5, y - 0.54);
  return (
    (distance <= 0.27 && distance >= 0.205) || // case
    inRect(x, y, 0.44, 0.16, 0.56, 0.22) || // button
    inRect(x, y, 0.475, 0.22, 0.525, 0.28) || // stem
    inRect(x, y, 0.48, 0.38, 0.52, 0.54) || // hand
    inCircle(x, y, 0.5, 0.54, 0.04) // hub
  );
}

/** Rounded square for regular icons. Maskable icons fill the square, as Android crops them itself. */
function inBackground(x, y, cornerRadius) {
  const dx = Math.max(cornerRadius - x, x - (1 - cornerRadius), 0);
  const dy = Math.max(cornerRadius - y, y - (1 - cornerRadius), 0);
  return dx * dx + dy * dy <= cornerRadius * cornerRadius;
}

function render(size, cornerRadius) {
  const SAMPLES = 4; // per axis, for smooth edges
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride); // each row starts with a PNG filter byte of 0

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let covered = 0;
      let white = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) / size;
          const y = (py + (sy + 0.5) / SAMPLES) / size;
          if (inBackground(x, y, cornerRadius)) {
            covered++;
            if (inStopwatch(x, y)) white++;
          }
        }
      }
      const offset = py * stride + 1 + px * 4;
      const whiteShare = covered ? white / covered : 0;
      for (let c = 0; c < 3; c++) {
        raw[offset + c] = Math.round(BLUE[c] + (WHITE[c] - BLUE[c]) * whiteShare);
      }
      raw[offset + 3] = Math.round((covered / SAMPLES ** 2) * 255);
    }
  }
  return encodePng(size, raw);
}

function encodePng(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const chunk = Buffer.alloc(typeAndData.length + 8);
  chunk.writeUInt32BE(data.length, 0);
  typeAndData.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(typeAndData), typeAndData.length + 4);
  return chunk;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const out = (name) => new URL(`../public/${name}`, import.meta.url);

writeFileSync(out('icon-192.png'), render(192, 0.2));
writeFileSync(out('icon-512.png'), render(512, 0.2));
writeFileSync(out('icon-maskable-512.png'), render(512, 0));
writeFileSync(out('apple-touch-icon.png'), render(180, 0)); // iOS rounds the corners itself
