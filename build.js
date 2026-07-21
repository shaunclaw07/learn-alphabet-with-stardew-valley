#!/usr/bin/env node
/**
 * build.js — Baut die Lese-Schule aus Shared-Includes zu self-contained
 * HTML-Dateien im dist/-Ordner zusammen.
 *
 * Aufruf:  node build.js
 * Output:  dist/  (per Doppelklick im Browser öffnen, Deployment-Ziel)
 *
 * Verarbeitet <!-- #INCLUDE shared/datei --> Marker und kopiert den Rest.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const SHARED = path.join(ROOT, "shared");

// ─── Shared-Includes laden ──────────────────────────────────────────
function loadShared(name) {
  return fs.readFileSync(path.join(SHARED, name), "utf-8");
}

const includes = {
  "shared/base.css": loadShared("base.css"),
  "shared/dark-mode.css": loadShared("dark-mode.css"),
  "shared/voice-picker.js": loadShared("voice-picker.js"),
  "shared/celebrate.js": loadShared("celebrate.js"),
  "shared/srs.js": loadShared("srs.js"),
  "shared/reader-util.js": loadShared("reader-util.js"),
  "shared/progress.js": loadShared("progress.js"),
  "shared/speak-text.js": loadShared("speak-text.js"),
  "shared/exercises.js": loadShared("exercises.js"),
  "shared/reader.js": loadShared("reader.js"),
  "shared/chrome-back-link.html": loadShared("chrome-back-link.html"),
  "shared/farm.js": loadShared("farm.js"),
  "shared/trace.js": loadShared("trace.js"),
  "shared/pwa-head.html": loadShared("pwa-head.html"),
  "shared/sw-register.js": loadShared("sw-register.js"),
};

// ─── Marker ersetzen ────────────────────────────────────────────────
// Drei Marker-Formate:
//   <!-- #INCLUDE shared/file -->   (HTML)
//   /* #INCLUDE shared/file */      (CSS)
//   // #INCLUDE shared/file.js      (JS)
const MARKERS = [
  /<!--\s*#INCLUDE\s+(shared\/[\w./-]+)\s*-->/g,
  /\/\*\s*#INCLUDE\s+(shared\/[\w./-]+)\s*\*\//g,
  /\/\/\s*#INCLUDE\s+(shared\/[\w./-]+)\s*/g,
];

function hasMarkers(content) {
  return MARKERS.some((re) => re.test(content));
}

// ─── Text- vs. Binärdateien ─────────────────────────────────────────
// Nur echte Textdateien dürfen als UTF-8 gelesen/geschrieben werden.
// Binärdateien (PNG, PDF, WOFF …) MÜSSEN roh kopiert werden — sonst
// zerstört das UTF-8-Round-Trip jedes Nicht-UTF-8-Byte (z. B. die
// PNG-Signatur 0x89 → ) und die Datei ist unbrauchbar.
const TEXT_EXT = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".json", ".webmanifest",
  ".md", ".txt", ".svg", ".xml", ".csv",
]);

function isTextFile(relPath) {
  return TEXT_EXT.has(path.extname(relPath).toLowerCase());
}

function replaceMarkers(content, relPath) {
  let result = content;
  for (const re of MARKERS) {
    re.lastIndex = 0;
    result = result.replace(re, (match, key) => {
      // JS-Marker (//) behält das Zeilenende
      if (match.startsWith("//") && !match.includes("\n")) {
        // Stelle sicher, dass der Inhalt mit einem Zeilenumbruch endet
        const inc = includes[key];
        if (!inc) {
          console.error(`  ⚠️  Unbekannter Include: ${key} in ${relPath}`);
          return `// UNBEKANNT: ${key}`;
        }
        // Entferne das trailing newline vom Match (wird vom Regex nicht erfasst)
        // und hänge an den Include-Inhalt an
        return inc.replace(/\n*$/, "\n");
      }
      if (!includes[key]) {
        console.error(`  ⚠️  Unbekannter Include: ${key} in ${relPath}`);
        return `/* UNBEKANNT: ${key} */`;
      }
      return includes[key];
    });
  }
  return result;
}

function processFile(srcPath, relPath) {
  const destPath = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  // Binärdatei → roh kopieren, niemals durch UTF-8 schicken.
  if (!isTextFile(relPath)) {
    fs.copyFileSync(srcPath, destPath);
    return;
  }

  const content = fs.readFileSync(srcPath, "utf-8");

  if (!hasMarkers(content)) {
    // Kein Marker → 1:1 kopieren
    fs.writeFileSync(destPath, content, "utf-8");
    return;
  }

  const processed = replaceMarkers(content, relPath);

  fs.writeFileSync(destPath, processed, "utf-8");
  console.log(`  ✅ ${relPath} (${(processed.length / 1024).toFixed(1)} KB)`);
}

// ─── Dateien sammeln ────────────────────────────────────────────────
function walk(dir, base = "") {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;

    // Ausschließen: dist/, shared/, .git/, tests/, node_modules/, docs/
    if (
      entry.name === "dist" ||
      entry.name === "shared" ||
      entry.name === ".git" ||
      entry.name === "tests" ||
      entry.name === "node_modules" ||
      entry.name === "docs" ||
      entry.name === ".github" ||
      (entry.name.endsWith(".js") && base === "" && entry.name !== "sw.js") // root-level helper scripts, but NOT sw.js
    )
      continue;

    if (entry.isDirectory()) {
      entries.push(...walk(path.join(dir, entry.name), rel));
    } else {
      entries.push(rel);
    }
  }
  return entries;
}

// ─── Main ───────────────────────────────────────────────────────────
console.log("🏗️  Baue Lese-Schule …\n");

// dist/ leeren
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Alle Dateien verarbeiten
const files = walk(ROOT);
let processed = 0;
let copied = 0;

for (const rel of files) {
  const src = path.join(ROOT, rel);
  if (fs.statSync(src).isDirectory()) continue;

  if (isTextFile(rel) && hasMarkers(fs.readFileSync(src, "utf-8"))) {
    processFile(src, rel);
    processed++;
  } else {
    processFile(src, rel); // kopiert 1:1 (Text unverändert, Binär roh)
    copied++;
  }
}

console.log(
  `\n📦 Fertig! ${processed} Dateien verarbeitet, ${copied} kopiert → dist/`
);
console.log(`   Öffnen: dist/index.html`);
