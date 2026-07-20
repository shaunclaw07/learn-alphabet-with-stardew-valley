import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./spec",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    trace: process.env.CI ? "on-first-retry" : "off",
  },
  webServer: {
    command: "cd .. && python3 -m http.server 3100",
    port: 3100,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
