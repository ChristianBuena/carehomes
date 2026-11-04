/**
 * Release blocker S-7: the seed created an ADMIN with a hard-coded password
 * and had no production guard.
 *
 * The subprocess tests run the REAL prisma/seed.ts. DATABASE_URL points at a
 * closed port, so even a broken guard could not touch any real database: the
 * assertions prove the script exits on configuration alone.
 */
import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { readSeedConfig, SeedConfigError, MIN_SEED_PASSWORD_LENGTH } from "../../prisma/seed-config";

const execFileP = promisify(execFile);
const ROOT = path.resolve(__dirname, "..", "..");
const UNREACHABLE_DB = "postgresql://seed-guard-test@127.0.0.1:1/never";

const GOOD = {
  SEED_ADMIN_EMAIL: "First.Admin@example.org",
  SEED_ADMIN_PASSWORD: "a-long-admin-passphrase", // secret-scan:allow (test fixture)
  SEED_DEMO_PASSWORD: "a-long-demo-passphrase", // secret-scan:allow (test fixture)
};

describe("readSeedConfig", () => {
  it("refuses to run when NODE_ENV is production, even with every variable set", () => {
    expect(() => readSeedConfig({ ...GOOD, NODE_ENV: "production" })).toThrow(SeedConfigError);
    expect(() => readSeedConfig({ ...GOOD, NODE_ENV: "production" })).toThrow(/production/);
  });

  for (const name of ["SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD", "SEED_DEMO_PASSWORD"] as const) {
    it(`has no default for ${name}: missing or blank is an error`, () => {
      expect(() => readSeedConfig({ ...GOOD, [name]: undefined })).toThrow(name);
      expect(() => readSeedConfig({ ...GOOD, [name]: "   " })).toThrow(name);
    });
  }

  it(`rejects passwords shorter than ${MIN_SEED_PASSWORD_LENGTH} characters`, () => {
    expect(() => readSeedConfig({ ...GOOD, SEED_ADMIN_PASSWORD: "short" })).toThrow(/at least/);
    expect(() => readSeedConfig({ ...GOOD, SEED_DEMO_PASSWORD: "short" })).toThrow(/at least/);
  });

  it("rejects an invalid admin email", () => {
    expect(() => readSeedConfig({ ...GOOD, SEED_ADMIN_EMAIL: "not-an-email" })).toThrow(/valid email/);
  });

  it("returns the configured values (email lower-cased) in development and test", () => {
    for (const NODE_ENV of [undefined, "development", "test"]) {
      expect(readSeedConfig({ ...GOOD, NODE_ENV })).toEqual({
        adminEmail: "first.admin@example.org",
        adminPassword: GOOD.SEED_ADMIN_PASSWORD,
        demoPassword: GOOD.SEED_DEMO_PASSWORD,
      });
    }
  });
});

describe("prisma/seed.ts source", () => {
  it("contains no built-in passwords or the old hard-coded admin address", () => {
    const src = fs.readFileSync(path.join(ROOT, "prisma", "seed.ts"), "utf8");
    expect(src).not.toMatch(/@123456/);
    expect(src).not.toContain("carehomessupport444");
    expect(src).not.toMatch(/console\.log\([^)]*[Pp]assword:/);
  });
});

describe("prisma/seed.ts as a process (exits before connecting)", () => {
  async function runSeed(env: Record<string, string>) {
    const baseEnv = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !k.startsWith("SEED_"))
    ) as Record<string, string>;
    try {
      const { stdout, stderr } = await execFileP("npx", ["tsx", "prisma/seed.ts"], {
        cwd: ROOT,
        env: { ...baseEnv, NODE_ENV: "development", DATABASE_URL: UNREACHABLE_DB, ...env },
        timeout: 60000,
      });
      return { code: 0, out: stdout + stderr };
    } catch (e) {
      const err = e as { code?: number; stdout?: string; stderr?: string };
      return { code: err.code ?? -1, out: (err.stdout ?? "") + (err.stderr ?? "") };
    }
  }

  it("NODE_ENV=production: exits 1 with a refusal message", async () => {
    const r = await runSeed({ ...GOOD, NODE_ENV: "production" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("Seed aborted: Refusing to seed: NODE_ENV is production");
    expect(r.out).not.toContain("Starting seed");
  }, 90000);

  it("no SEED_ADMIN_PASSWORD: exits 1 and never starts seeding", async () => {
    const r = await runSeed({ NODE_ENV: "development", SEED_ADMIN_EMAIL: GOOD.SEED_ADMIN_EMAIL, SEED_DEMO_PASSWORD: GOOD.SEED_DEMO_PASSWORD });
    expect(r.code).toBe(1);
    expect(r.out).toContain("SEED_ADMIN_PASSWORD is not set");
    expect(r.out).not.toContain("Starting seed");
  }, 90000);
});
