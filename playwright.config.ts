import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Needs a database that has been loaded via `npm run ingest`.
  webServer: { command: "npm run build && npx next start -p 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 240_000 },
});
