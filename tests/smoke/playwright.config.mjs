import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  testMatch: "smoke.spec.mjs",
  globalSetup: "./global-setup.mjs",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  forbidOnly: true,
  outputDir: "../../test-results/smoke/playwright",
  reporter: [
    ["list"],
    ["html", { outputFolder: "../../test-results/smoke/report", open: "never" }]
  ],
  use: {
    baseURL: "http://127.0.0.1:4175",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node start-vite.mjs",
    url: "http://127.0.0.1:4175",
    timeout: 120_000,
    reuseExistingServer: false
  }
});
