import { config } from "dotenv";
import path from "path";
import { vi } from "vitest";
import { getCookieStore, getHeaderStore } from "./helpers/nextRequestContext";

config({ path: path.resolve(__dirname, "..", ".env.test") });

if (!process.env.DATABASE_URL?.includes("carehomes_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not point at carehomes_test. " +
      "Check .env.test — tests must never run against the dev/prod database."
  );
}

// Stand in for Next's request-scoped cookies()/headers() (see nextRequestContext.ts).
vi.mock("next/headers", () => ({
  cookies: async () => getCookieStore(),
  headers: async () => getHeaderStore(),
}));
