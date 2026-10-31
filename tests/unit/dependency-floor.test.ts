/**
 * Release blocker S-3: next@16.2.6 had critical advisories (RCE in the Image
 * Optimization API, middleware bypass, Server Action DoS). The last advisory
 * range in `npm audit` ended at <=16.4.0, so 16.4.1 is the floor.
 *
 * Fails if a lockfile change or a downgrade brings a vulnerable version back.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

function installedVersion(pkg: string): string {
  const file = path.join(ROOT, "node_modules", ...pkg.split("/"), "package.json");
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { version: string }).version;
}

function atLeast(version: string, floor: string): boolean {
  const a = version.split(/[.-]/).slice(0, 3).map(Number);
  const b = floor.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

const FLOORS: Record<string, string> = {
  next: "16.4.1",
  "@next/third-parties": "16.4.1",
  "eslint-config-next": "16.4.1",
};

describe("security floors for installed dependencies", () => {
  for (const [pkg, floor] of Object.entries(FLOORS)) {
    it(`${pkg} is at least ${floor}`, () => {
      expect(atLeast(installedVersion(pkg), floor), installedVersion(pkg)).toBe(true);
    });
  }

  it("the lockfile pins next at or above the floor", () => {
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) as {
      packages: Record<string, { version?: string }>;
    };
    const v = lock.packages["node_modules/next"]?.version ?? "0.0.0";
    expect(atLeast(v, FLOORS.next), v).toBe(true);
  });
});

describe("removed dependencies stay removed", () => {
  // next-auth was installed but never imported, and carried a critical
  // advisory (GHSA-7rqj-j65f-68wh). Auth is the custom JWT + OTP flow.
  it("next-auth is not a dependency", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["next-auth"]).toBeUndefined();
    expect(pkg.devDependencies?.["next-auth"]).toBeUndefined();
  });
});
