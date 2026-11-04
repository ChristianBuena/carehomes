/**
 * Release blocker S-18: `npm run lint` crashed under ESLint 10
 * ("contextOrFilename.getFilename is not a function" in eslint-plugin-react).
 * ESLint is pinned to 9, which eslint-config-next's plugins support.
 *
 * Also guards the 41 react/no-unescaped-entities fixes in the public pages.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

function eslintJson(args: string[]) {
  const r = spawnSync("npx", ["eslint", "-f", "json", ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe("ESLint", () => {
  it("runs without crashing (exit 0 or 1, never 2)", () => {
    const r = eslintJson(["src/lib/utils.ts", "src/app/(public)/privacy/page.tsx"]);
    expect(r.stderr).not.toContain("Oops! Something went wrong");
    expect([0, 1]).toContain(r.status);
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  }, 120000);

  it("public pages have no unescaped JSX entities", () => {
    const r = eslintJson(["src/app/(public)", "src/app/not-found.tsx", "src/components"]);
    const results = JSON.parse(r.stdout) as Array<{ filePath: string; messages: Array<{ ruleId: string | null; line: number }> }>;
    const hits = results.flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "react/no-unescaped-entities").map((m) => `${path.relative(ROOT, f.filePath)}:${m.line}`)
    );
    expect(hits).toEqual([]);
  }, 180000);
});
