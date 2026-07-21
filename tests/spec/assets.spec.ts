import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const DIST = resolve(PROJECT_ROOT, "dist");

// Gültige PNG-Signatur (die ersten 8 Bytes jeder PNG-Datei)
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ICONS = [
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon-180.png",
  "icons/favicon-32.png",
];

// Regressions-Tests für den UTF-8-Build-Bug (2026-07): build.js hatte Binär-
// dateien als Text durchgeschickt und dabei die PNG-Signatur 0x89 → EF BF BD
// zerstört. Der Content-Type blieb image/png, nur die Bytes waren kaputt —
// deshalb reicht ein Status-200-Check NICHT.
test.describe("Asset-Integrität – PNG-Icons (dist)", () => {
  for (const icon of ICONS) {
    test(`dist/${icon} ist ein gültiges PNG (Signatur)`, () => {
      const buf = readFileSync(resolve(DIST, icon));
      expect(
        buf.subarray(0, 8).equals(PNG_MAGIC),
        `Erste Bytes: ${buf.subarray(0, 8).toString("hex")} (erwartet ${PNG_MAGIC.toString("hex")})`,
      ).toBe(true);
    });
  }

  test("kein Icon enthält das UTF-8-Ersetzungszeichen (EF BF BD)", () => {
    for (const icon of ICONS) {
      const buf = readFileSync(resolve(DIST, icon));
      expect(
        buf.includes(Buffer.from([0xef, 0xbf, 0xbd])),
        `${icon} enthält EF BF BD → Binärdatei wurde durch UTF-8 zerstört`,
      ).toBe(false);
    }
  });
});

test.describe("Build-Integrität – Binärdateien roh kopiert", () => {
  const binaries = [
    ...ICONS,
    "phase1/phase1-druckversion.pdf", // war vom selben Bug betroffen
  ];

  for (const rel of binaries) {
    test(`dist/${rel} ist byte-identisch zur Quelle`, () => {
      const src = readFileSync(resolve(PROJECT_ROOT, rel));
      const dst = readFileSync(resolve(DIST, rel));
      expect(
        dst.equals(src),
        `${rel}: dist (${dst.length} B) weicht von der Quelle (${src.length} B) ab`,
      ).toBe(true);
    });
  }

  test("phase1-druckversion.pdf hat gültige PDF-Signatur", () => {
    const buf = readFileSync(resolve(DIST, "phase1/phase1-druckversion.pdf"));
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
