/**
 * SOW 11.1a: authorization must go through the database-backed session check
 * (resolveSessionUser / getSessionUser / getUserFromRequest in src/lib/auth.ts),
 * which sees revoked sessions and role changes. verifyToken() alone does not,
 * so only src/lib/auth.ts may call it.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

describe("session guard", () => {
  it("only src/lib/auth.ts calls verifyToken()", () => {
    const allowed = new Set(["src/lib/auth.ts", "src/lib/jwt.ts"]);
    const offenders = walk(SRC)
      .map((f) => path.relative(ROOT, f).split(path.sep).join("/"))
      .filter((rel) => !allowed.has(rel))
      .filter((rel) => /\bverifyToken\s*\(/.test(fs.readFileSync(path.join(ROOT, rel), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the deprecated src/middleware.ts is gone and src/proxy.ts exports proxy", () => {
    expect(fs.existsSync(path.join(SRC, "middleware.ts"))).toBe(false);
    const proxySrc = fs.readFileSync(path.join(SRC, "proxy.ts"), "utf8");
    expect(proxySrc).toMatch(/export async function proxy\(/);
    expect(proxySrc).toMatch(/getSessionUser/);
  });
});
