/**
 * Release blocker S-20 / secrets step 2.1: .env.example must list every
 * environment variable the code reads, with placeholders only.
 *
 * Fails when someone adds `process.env.NEW_THING` without documenting it.
 */
import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

/** Read by libraries, not by name in our source. */
const LIBRARY_VARS = ["UPLOADTHING_TOKEN"];
/** Set by Next.js or the host, never by us. */
const PLATFORM_VARS = ["NODE_ENV"];

function exampleVars(): Map<string, string> {
  const text = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
  const vars = new Map<string, string>();
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (m) vars.set(m[1], m[2].replace(/^"|"$/g, ""));
  }
  return vars;
}

function varsReadByCode(): string[] {
  const files = execFileSync("git", ["ls-files", "src", "prisma", "next.config.ts", "prisma.config.ts"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !f.startsWith("src/generated/"));
  const names = new Set<string>();
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) names.add(m[1]);
    for (const m of src.matchAll(/env\[\s*"([A-Z][A-Z0-9_]*)"\s*\]/g)) names.add(m[1]);
  }
  // Seed variables are read through readSeedConfig(env) by string name.
  for (const m of fs.readFileSync(path.join(ROOT, "prisma", "seed-config.ts"), "utf8").matchAll(/"(SEED_[A-Z_]+)"/g)) {
    names.add(m[1]);
  }
  return [...names].sort();
}

describe(".env.example", () => {
  it("is tracked by git (not swallowed by the .env* ignore rule)", () => {
    // check-ignore exits 1 when the path is NOT ignored.
    expect(spawnSync("git", ["check-ignore", "-q", ".env.example"], { cwd: ROOT }).status).toBe(1);
  });

  it("lists every variable the code reads, plus library-read variables", () => {
    const listed = exampleVars();
    const missing = [...varsReadByCode(), ...LIBRARY_VARS]
      .filter((v) => !PLATFORM_VARS.includes(v))
      .filter((v) => !listed.has(v));
    expect(missing).toEqual([]);
  });

  it("contains placeholders only, no real-looking secrets", () => {
    const text = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
    expect(text).not.toMatch(/sk_(live|test)_[0-9A-Za-z]{16,}/);
    expect(text).not.toMatch(/whsec_[0-9A-Za-z]{16,}/);
    expect(text).not.toMatch(/postgres(ql)?:\/\/[^:\s"]+:(?!PASSWORD@)[^@\s"]+@/);
    for (const [name, value] of exampleVars()) {
      if (/SECRET|PASS|TOKEN|KEY/.test(name) && value) {
        expect(value, name).toMatch(/replace|_replace_me|^$/);
      }
    }
  });
});
