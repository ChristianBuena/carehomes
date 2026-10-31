import { defineConfig } from "@playwright/test";

/**
 * Runs tests/e2e/analytics-consent.spec.ts against a dev server that has a
 * (dummy) GA measurement id, so the consent banner is active. Requests to
 * Google are aborted inside the spec. Use `npm run test:e2e:analytics`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "analytics-consent.spec.ts",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3103",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3103",
    url: "http://localhost:3103",
    reuseExistingServer: false,
    timeout: 300000,
    env: {
      NODE_ENV: "development",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST000000",
    },
  },
});
