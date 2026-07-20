// Erzeugt die PWA-Icons (🐔 auf grüner Kachel) ohne externe Abhängigkeiten.
// Aufruf: node tools/make-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

// ---- Farben (Design-Tokens) ----
const C = {
  _: null,                 // transparent
  g: [0x7e, 0xc8, 0x50],   // Grün hell (Kachel)
  G: [0x5d, 0xa0, 0x3c],   // Grün dunkel (Kachel-Schatten)
  r: [0x3d, 0x6b, 0x22],   // Rahmen-Grün
  w: [0xff, 0xfa, 0xf0],   // Creme/weiß (Huhn)
  s: [0xd8, 0xcf, 0xba],   // Schatten Huhn
  o: [0xff, 0x6b, 0x35],   // Orange (Kamm/Schnabel/Füße)
  k: [0x4a, 0x37, 0x28],   // Auge
};

// ---- 16x16 Grid: Huhn-Silhouette (nur Vordergrund; . = Kachel) ----
const CHICK = [
  "................",
  "................",
  ".......oo.......",
  "......oooo......",
  ".....wwww.......",
  "....wwwwww..oo..",
  "...wwwwwwwwoooo.",
  "...wwkwwwwww.o..",
  "..swwwwwwwww....",
  "..swwwwwwwww....",
  "...swwwwwwww....",
  ".... swwwww.....",
  ".....oo.oo......",
  ".....oo.oo......",
  "................",
  "................",
];

// Zeichnet Kachel+Rahmen+Huhn in ein GRID×GRID Zellenraster → RGBA-Buffer size×size.
// pad = zusätzlicher grüner Innenrand in Zellen (für maskable).
function render(size, pad = 0) {
  const GRID = 16;
  const cell = size / GRID;
  const buf = Buffer.alloc(size * size * 4);
  const put = (x, y, rgb, a = 255) => {
    const i = (y * size + x) * 4;
    buf[i] = rgb[0]; buf[i + 1] = rgb[1]; buf[i + 2] = rgb[2]; buf[i + 3] = a;
  };
  const inner = GRID - pad * 2; // Zellen des sichtbaren Kachelbereichs
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Zellkoordinate im vollen 16er-Grid
      const gx = Math.floor(px / cell);
      const gy = Math.floor(py / cell);
      // Kachel-Hintergrund (heller oben, dunkler unten = leichte Tiefe)
      let rgb = gy < GRID / 2 ? C.g : C.G;
      // Rahmen: äußerster Ring des sichtbaren Bereichs
      const bx = gx - pad, by = gy - pad;
      const onEdge = bx === 0 || by === 0 || bx === inner - 1 || by === inner - 1;
      if (bx >= 0 && by >= 0 && bx < inner && by < inner && onEdge) rgb = C.r;
      // Huhn: auf den sichtbaren Bereich skaliert
      if (bx >= 0 && by >= 0 && bx < inner && by < inner) {
        const cxi = Math.floor((bx / inner) * GRID);
        const cyi = Math.floor((by / inner) * GRID);
        const ch = CHICK[cyi][cxi];
        if (ch !== ".") rgb = C[ch] || rgb;
      }
      put(px, py, rgb);
    }
  }
  return buf;
}

// ---- Minimaler PNG-Encoder (RGBA, 8-bit) ----
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "latin1");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function toPng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  // Filter-Byte 0 pro Zeile voranstellen
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("icons", { recursive: true });
const jobs = [
  ["icons/icon-192.png", 192, 0],
  ["icons/icon-512.png", 512, 0],
  ["icons/icon-maskable-512.png", 512, 2], // Safe-Zone: 2 Zellen grüner Innenrand
  ["icons/icon-180.png", 180, 0],
  ["icons/favicon-32.png", 32, 0],
];
for (const [path, size, pad] of jobs) {
  writeFileSync(path, toPng(size, render(size, pad)));
  console.log("geschrieben:", path);
}
