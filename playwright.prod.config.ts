import { defineConfig } from "@playwright/test";

/**
 * Runs the server-action error spec against a PRODUCTION build
 * (`next build` + `next start`), where Next.js hides thrown server-action
 * messages. Use `npm run test:e2e:prod`; DATABASE_URL comes from .env.test.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "action-errors.spec.ts",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3102",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx next build && npx next start --port 3102",
    url: "http://localhost:3102",
    reuseExistingServer: false,
    timeout: 600000,
    env: {
      NODE_ENV: "production",
    },
  },
});
