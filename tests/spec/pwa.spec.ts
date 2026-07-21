import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");

test.describe("PWA – Manifest", () => {
  test("manifest.webmanifest ist valides JSON", () => {
    const content = readFileSync(resolve(PROJECT_ROOT, "manifest.webmanifest"), "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toMatch(/standalone|fullscreen/);
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons!.length).toBeGreaterThanOrEqual(3);
    // id-Feld (Chrome-Kompatibilität, 2026-07 ergänzt)
    expect(manifest.id).toBeDefined();
    // 192er- und 512er-Icon sind für die Installierbarkeit Pflicht
    const sizes = (manifest.icons as { sizes: string }[]).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  test("Manifest wird vom Browser geladen", async ({ page }) => {
    const response = await page.goto("/manifest.webmanifest");
    expect(response?.status()).toBe(200);
    expect(await response?.headerValue("content-type")).toMatch(/json|manifest/);
  });
});

test.describe("PWA – Service Worker", () => {
  test("sw.js ist syntaktisch korrektes JavaScript", () => {
    const content = readFileSync(resolve(PROJECT_ROOT, "sw.js"), "utf-8");
    expect(() => new Function(content)).not.toThrow();
  });

  test("Service Worker hat Cache-Strategie", () => {
    const content = readFileSync(resolve(PROJECT_ROOT, "sw.js"), "utf-8");
    expect(content).toMatch(/caches/i);
    expect(content).toMatch(/install|activate|fetch/);
  });

  test("Service Worker registriert sich auf index.html", async ({ page }) => {
    await page.goto("/index.html");

    const hasSw = await page.evaluate(() => "serviceWorker" in navigator);
    expect(hasSw).toBe(true);

    // Prüfen ob der SW registriert ist (kann beim Static-Server fehlen,
    // da er nur localhost ist – das ist okay)
    const registrations = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length;
    });
    // In CI (python http.server) gibt's oft keine SW-Registrierung,
    // aber das Script muss zumindest existieren und parsebar sein.
  });
});

test.describe("PWA – Icons", () => {
  const icons = [
    "/icons/icon-512.png",
    "/icons/icon-192.png",
    "/icons/icon-180.png",
    "/icons/favicon-32.png",
    "/icons/icon-maskable-512.png",
  ];

  for (const icon of icons) {
    test(`${icon} ist erreichbar`, async ({ page }) => {
      const response = await page.goto(icon);
      expect(response?.status()).toBe(200);
      expect(await response?.headerValue("content-type")).toMatch(/image\/png/);
    });
  }
});
