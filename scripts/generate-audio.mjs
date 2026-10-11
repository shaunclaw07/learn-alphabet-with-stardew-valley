#!/usr/bin/env node
/**
 * generate-audio.mjs — erzeugt das vorproduzierte Vorlese-Audio-Set (Welle Audio).
 *
 * Ablauf:
 *   1. Korpus aus den Datenstrukturen der vier Phasen-HTMLs ableiten
 *      (NICHT handpflegen — sonst driftet er bei neuen Wörtern).
 *   2. Je String eine MP3 erzeugen: Piper (lokal, offline) → WAV → ffmpeg → MP3.
 *   3. Idempotent: vorhandene Dateien werden übersprungen.
 *
 * Aufrufe:
 *   node scripts/generate-audio.mjs           # fehlende Dateien erzeugen
 *   node scripts/generate-audio.mjs --check   # nur melden, was fehlt (Exit 1)
 *   node scripts/generate-audio.mjs --force   # alles neu erzeugen
 *   node scripts/generate-audio.mjs --voice de_DE-kerstin-low
 *
 * Umgebung (wird beim ersten Lauf automatisch eingerichtet, solange `uv` da ist):
 *   <cache>/venv           venv mit piper-tts
 *   <cache>/voices/<VOICE> Piper-Stimmenmodell
 * <cache> = $SV_AUDIO_CACHE oder ~/.cache/sv-audio
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "audio");
const CORPUS_FILE = path.join(ROOT, "scripts", "audio_corpus.json");

const DEFAULT_VOICE = "de_DE-thorsten-high";
const BITRATE = "64k";
const SAMPLE_RATE = "22050";

// Tempo je Rolle: kindgerecht gezogen bzw. langsam.
const LENGTH_SCALE = { laut: 1.7, silbe: 1.35, wort: 1.15, satz: 1.15, merk: 1.15 };
// Rollen-Rang (kleiner = höhere Priorität). Bei Mehrfach-Rolle gewinnt die langsamste.
const ROLLE_RANG = { laut: 0, silbe: 1, merk: 2, wort: 3, satz: 4 };

// ==== CLI ====
const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check");
const FORCE = args.includes("--force");
const voiceIdx = args.indexOf("--voice");
const VOICE = voiceIdx >= 0 ? args[voiceIdx + 1] : DEFAULT_VOICE;

const CACHE = process.env.SV_AUDIO_CACHE || path.join(os.homedir(), ".cache", "sv-audio");
const VENV = path.join(CACHE, "venv");
const PIPER = path.join(VENV, "bin", "piper");
const VOICE_DIR = path.join(CACHE, "voices");
const MODEL = path.join(VOICE_DIR, VOICE + ".onnx");
const TMP = path.join(CACHE, "tmp");

// ==== Korpus-Extraktion ====

/** Liest einen `const <name> = [ … ]`-Block per Klammer-Balancing aus dem Quelltext. */
function grabArray(src, name) {
  const at = src.indexOf("const " + name + " =");
  if (at < 0) throw new Error(`Array '${name}' nicht gefunden`);
  const start = src.indexOf("[", at);
  let depth = 0, i = start, str = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (str) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { str = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) break; }
  }
  const literal = src.slice(start, i + 1);
  // Literal auswerten — die Phase-Dateien definieren JS-Objekte (kein reines JSON).
  return new Function("return (" + literal + ")")();
}

const low = (s) => String(s).toLowerCase().trim();
/** Bei „Hof & Huhn“ nur den ersten, sauber sprechbaren Teil nehmen. */
const spokenWord = (mw) => String(mw).split("&")[0].trim();

export function buildCorpus(root = ROOT) {
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
  const p1 = read("phase1/lese-schule.html");
  const p2 = read("phase2/phase2-schule.html");
  const p3 = read("phase3/phase3-schule.html");
  const p4 = read("phase4/phase4-schule.html");

  const letters = grabArray(p1, "letters");
  const wsWords = grabArray(p1, "WS_WORDS");
  const words2 = grabArray(p2, "WORDS");
  const lek2 = grabArray(p2, "LEKTIONEN");
  const words3 = grabArray(p3, "WORDS");
  const sentences = grabArray(p4, "SENTENCES");

  /** Map slug → { text, appText, rolle, lengthScale } */
  const map = new Map();
  const add = (appText, rolle, piperText) => {
    const text = low(appText);
    if (!text) return;
    const slug = slugify(text);
    if (!slug) throw new Error(`Leerer Slug für ${JSON.stringify(appText)}`);
    const prev = map.get(slug);
    const scale = LENGTH_SCALE[rolle];
    if (!prev || ROLLE_RANG[rolle] < ROLLE_RANG[prev.rolle]) {
      map.set(slug, { slug, appText: text, piperText: piperText ?? text, rolle, lengthScale: scale });
    } else if (piperText && prev.piperText === prev.appText) {
      prev.piperText = piperText;
    }
  };

  // Phase 1 — Buchstaben-Laute: App spricht den Einzelbuchstaben (speak(ch.toLowerCase())),
  // aufgenommen wird aber der gezogene Laut aus dem `laut`-Feld.
  for (const l of letters) {
    const laut = (l.laut || l.id).replace(/-/g, " ");
    add(l.id, "laut", laut);
  }
  // Phase 1 — Merkwörter
  for (const l of letters) add(spokenWord(l.merkwort), "merk");
  // Phase 1 — Werkstatt-Wörter
  for (const w of wsWords) add(w, "wort");
  // Silben (Phase 1) — einbuchstabige sind bereits als Laut erfasst
  for (const l of letters) for (const s of l.silben || []) add(s, "silbe");
  // Phase 2 — Wörter + Silben-Familien
  for (const w of words2) {
    add(w.id, "wort");
    for (const s of w.silben || []) add(s, "silbe");
  }
  for (const l of lek2) for (const s of l.familie || []) add(s, "silbe");
  // Phase 3 — Wörter
  for (const w of words3) {
    add(w.id, "wort");
    for (const s of w.silben || []) add(s, "silbe");
  }
  // Phase 4 — Wörter + Satzzeilen (+ Antwortzeilen der Dialoge)
  for (const s of sentences) {
    for (const w of s.words || []) add(w, "wort");
    add((s.words || []).join(" "), "satz");
    if (s.antwort) {
      for (const w of s.antwort) add(w, "wort");
      add(s.antwort.join(" "), "satz");
    }
  }
  return [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Dateiname-Slug: lowercase, Leerzeichen → „-“, nur [a-z0-9-]. Muss in JS & Ausgabe identisch sein. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c]))
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ==== Werkzeuge einrichten ====

function run(cmd, argv, opts = {}) {
  return execFileSync(cmd, argv, { stdio: ["pipe", "pipe", "inherit"], ...opts });
}

function ensureTools() {
  if (fs.existsSync(PIPER)) return;
  console.log("· Piper fehlt — richte Umgebung ein:", VENV);
  fs.mkdirSync(CACHE, { recursive: true });
  run("uv", ["venv", VENV]);
  run("uv", ["pip", "install", "--python", path.join(VENV, "bin", "python"), "piper-tts"]);
}

function ensureVoice() {
  if (fs.existsSync(MODEL)) return;
  console.log("· Stimme fehlt — lade herunter:", VOICE);
  fs.mkdirSync(VOICE_DIR, { recursive: true });
  run(path.join(VENV, "bin", "python"), ["-m", "piper.download_voices", VOICE, "--data-dir", VOICE_DIR]);
}

// ==== Erzeugen ====

function synthesize(entry) {
  fs.mkdirSync(TMP, { recursive: true });
  const out = path.join(OUT_DIR, entry.slug + ".mp3");
  if (fs.existsSync(out) && !FORCE) return "skip";
  const wav = path.join(TMP, entry.slug + ".wav");
  const piper = spawnSync(
    PIPER,
    ["-m", MODEL, "-f", wav, "--length-scale", String(entry.lengthScale)],
    { input: entry.piperText + "\n" }
  );
  if (piper.status !== 0) throw new Error(`piper fehlgeschlagen für ${entry.slug}: ${piper.stderr}`);
  spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", SAMPLE_RATE, "-b:a", BITRATE, out], { stdio: "inherit" });
  if (!fs.existsSync(out)) throw new Error(`ffmpeg hat keine Datei erzeugt: ${out}`);
  fs.rmSync(wav, { force: true });
  return "made";
}

// ==== Manifest (vom Service Worker beim Install gelesen) ====

/** Schreibt audio/manifest.json nur, wenn sich der Inhalt ändert (Idempotenz). */
function writeManifest(corpus) {
  const datei = path.join(OUT_DIR, "manifest.json");
  const inhalt = JSON.stringify({ voice: VOICE, files: corpus.map((e) => e.slug + ".mp3") }, null, 1) + "\n";
  if (fs.existsSync(datei) && fs.readFileSync(datei, "utf8") === inhalt) return;
  fs.writeFileSync(datei, inhalt);
}

function main() {
  const corpus = buildCorpus();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(CORPUS_FILE, JSON.stringify(corpus, null, 1) + "\n");
  writeManifest(corpus);
  const nachRolle = corpus.reduce((a, e) => ((a[e.rolle] = (a[e.rolle] || 0) + 1), a), {});
  console.log(`Korpus: ${corpus.length} Strings`, nachRolle);

  const fehlend = corpus.filter((e) => !fs.existsSync(path.join(OUT_DIR, e.slug + ".mp3")));
  if (CHECK_ONLY) {
    if (!fehlend.length) { console.log("✅ alle Audiodateien vorhanden"); return; }
    console.log(`❌ ${fehlend.length} Audiodateien fehlen:`);
    for (const e of fehlend.slice(0, 20)) console.log("   ", e.slug);
    if (fehlend.length > 20) console.log(`    … und ${fehlend.length - 20} weitere`);
    process.exit(1);
  }

  ensureTools();
  ensureVoice();
  let made = 0, skipped = 0;
  for (const e of corpus) {
    const r = synthesize(e);
    if (r === "made") { made++; if (made % 25 === 0) console.log(`· ${made} erzeugt …`); }
    else skipped++;
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  const bytes = corpus.reduce((a, e) => a + (fs.existsSync(path.join(OUT_DIR, e.slug + ".mp3")) ? fs.statSync(path.join(OUT_DIR, e.slug + ".mp3")).size : 0), 0);
  console.log(`Fertig: ${made} neu, ${skipped} übersprungen · ${corpus.length} Dateien · ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
