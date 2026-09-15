import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = String(process.env.E2E_BASE_URL || "").trim();
const localBaseUrl = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./specs",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: externalBaseUrl || localBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm --prefix ../.. run dev -- --host 127.0.0.1 --port 4173",
        url: localBaseUrl,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
