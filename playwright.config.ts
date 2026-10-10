import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3101",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      NODE_ENV: "development",
    },
  },
});
