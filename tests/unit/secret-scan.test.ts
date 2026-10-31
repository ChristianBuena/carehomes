/**
 * Step 2.4: the secret scanner must catch the classes of leak this repo has
 * actually had (a committed .env, hard-coded passwords) and must never print
 * a value. Secret-shaped strings are assembled at runtime so this file does
 * not trip the scanner itself.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { scanText, scanFilename } from "../../scripts/secret-scan";

const ROOT = path.resolve(__dirname, "..", "..");
const j = (...parts: string[]) => parts.join("");

describe("scanFilename", () => {
  it.each([".env", "carehomes-support-docs/.env", ".env.local", ".env.production", "certs/server.pem", "id_rsa", "db-backup.sql", "dump.bak"])(
    "flags %s",
    (f) => expect(scanFilename(f).length).toBeGreaterThan(0)
  );

  it.each([".env.example", "prisma/migrations/20260512115623_init/migration.sql", "src/app/page.tsx"])("allows %s", (f) =>
    expect(scanFilename(f)).toEqual([])
  );
});

describe("scanText", () => {
  it.each([
    ["stripe-live-key", j("const k = 'sk", "_live_", "A1b2C3d4E5f6G7h8'")],
    ["stripe-webhook-secret", j("WH=whsec", "_", "abcdefghijklmnopqrstuv")],
    ["database-url-with-password", j("postgresql://postgres:", "Hunter22", "@db:5432/app")],
    ["secret-env-assignment", j("JWT_SECRET=", "9f8e7d6c5b4a3210")],
    ["secret-env-assignment", j("  POSTGRES_PASSWORD: ", "ADMIN321")],
    ["private-key-block", j("-----BEGIN RSA ", "PRIVATE KEY-----")],
  ])("flags %s", (rule, line) => {
    expect(scanText(line, "x.ts").map((f) => f.rule)).toContain(rule);
  });

  it.each([
    'DATABASE_URL="postgresql://user:PASSWORD@localhost:5432/carehomes"',
    "JWT_SECRET=${JWT_SECRET}",
    'JWT_SECRET="replace-with-a-long-random-string"',
    "EMAIL_PASS=",
    j("JWT_SECRET=", "9f8e7d6c5b4a3210 // secret-scan:allow"),
  ])("does not flag placeholder or allowed line: %s", (line) => {
    expect(scanText(line, "x.ts")).toEqual([]);
  });

  it("reports rule and location only, never the value", () => {
    const value = j("9f8e7d6c", "5b4a3210");
    const findings = scanText(j("line one\nJWT_SECRET=", value), "config/app.env");
    expect(findings).toEqual([{ rule: "secret-env-assignment", location: "config/app.env:2" }]);
    expect(JSON.stringify(findings)).not.toContain(value);
  });
});

describe("npm run scan:secrets on this repository", () => {
  it("finds nothing in the tracked files", () => {
    const out = execFileSync("npx", ["tsx", "scripts/secret-scan.ts"], { cwd: ROOT, encoding: "utf8" });
    expect(out).toContain("no findings");
  }, 120000);
});
