/**
 * Basic secret scan (release blocker S-5, step 2.4).
 *
 *   npm run scan:secrets            tracked files in the working tree
 *   npm run scan:secrets:history    every commit on every ref (added lines + file names)
 *
 * Prints the RULE and LOCATION only, never the matched value. Exits 1 when
 * anything is found. Mark a deliberate, non-secret line with the comment
 * `secret-scan:allow`.
 *
 * This is a safety net, not a replacement for a dedicated scanner such as
 * gitleaks or GitHub secret scanning.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

export type Finding = { rule: string; location: string };

type ContentRule = { rule: string; pattern: RegExp };

export const CONTENT_RULES: ContentRule[] = [
  { rule: "stripe-live-key", pattern: /\b[sr]k_live_[0-9A-Za-z]{10,}/ },
  { rule: "stripe-test-key", pattern: /\bsk_test_[0-9A-Za-z]{16,}/ },
  { rule: "stripe-webhook-secret", pattern: /\bwhsec_[0-9A-Za-z]{16,}/ },
  { rule: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { rule: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { rule: "github-token", pattern: /\bgh[pousr]_[0-9A-Za-z]{30,}\b/ },
  { rule: "slack-token", pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}/ },
  { rule: "private-key-block", pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  {
    rule: "database-url-with-password",
    // user:password@ where the password is not an obvious placeholder.
    pattern: /\bpostgres(?:ql)?:\/\/[^:\s"'/]+:(?!(?:PASSWORD|pass|password|<[^>]*>|\$\{[^}]*\}|\*+)@)[^@\s"'/]{3,}@/i,
  },
  {
    rule: "secret-env-assignment",
    // NAME=value for secret-looking names, outside example files. Empty,
    // ${VAR} and obvious placeholders are fine.
    pattern: /^\s*(?:export\s+)?[A-Z0-9_]*(?:SECRET|PASSWORD|PASS|TOKEN|API_KEY)[A-Z0-9_]*\s*[=:]\s*["']?(?!\$\{|replace|changeme|your[-_]|<|["']?\s*$)[^\s"'#]{6,}/m,
  },
];

/** Tracked file names that should never be committed. */
export const FILENAME_RULES: ContentRule[] = [
  { rule: "env-file", pattern: /(^|\/)\.env(\.[^/]*)?$/ },
  { rule: "key-or-cert-file", pattern: /\.(pem|key|p12|pfx|jks|keystore)$/i },
  { rule: "ssh-private-key", pattern: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/ },
  { rule: "database-dump", pattern: /\.(dump|sql\.gz|bak|backup)$|(^|\/)[^/]*backup[^/]*$/i },
  { rule: "sql-file-outside-migrations", pattern: /^(?!.*prisma\/migrations\/[^/]+\/migration\.sql$).*\.sql$/ },
];

const FILENAME_ALLOW = [/(^|\/)\.env\.example$/];
const ALLOW_MARKER = "secret-scan:allow";
const SKIP_CONTENT = [/^package-lock\.json$/, /^src\/generated\//, /\.(png|jpe?g|gif|ico|webp|pdf|docx|woff2?)$/i];

export function scanFilename(file: string): Finding[] {
  if (FILENAME_ALLOW.some((r) => r.test(file))) return [];
  return FILENAME_RULES.filter((r) => r.pattern.test(file)).map((r) => ({ rule: r.rule, location: file }));
}

export function scanText(text: string, where: string): Finding[] {
  const findings: Finding[] = [];
  const isExample = /\.env\.example$/.test(where);
  text.split("\n").forEach((line, i) => {
    if (line.includes(ALLOW_MARKER)) return;
    for (const r of CONTENT_RULES) {
      if (isExample && r.rule === "secret-env-assignment") continue;
      if (r.pattern.test(line)) findings.push({ rule: r.rule, location: `${where}:${i + 1}` });
    }
  });
  return findings;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
}

export function scanWorkingTree(): Finding[] {
  const findings: Finding[] = [];
  for (const file of git(["ls-files"]).split("\n").filter(Boolean)) {
    findings.push(...scanFilename(file));
    if (SKIP_CONTENT.some((r) => r.test(file)) || !fs.existsSync(file)) continue;
    findings.push(...scanText(fs.readFileSync(file, "utf8"), file));
  }
  return findings;
}

export function scanHistory(): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const file of git(["log", "--all", "--format=", "--name-only"]).split("\n").filter(Boolean)) {
    if (seen.has(file)) continue;
    seen.add(file);
    for (const f of scanFilename(file)) findings.push({ rule: f.rule, location: `history: ${file}` });
  }
  let commit = "";
  let file = "";
  for (const line of git(["log", "--all", "-p", "--no-color", "--format=commit %h"]).split("\n")) {
    if (line.startsWith("commit ")) commit = line.slice(7);
    else if (line.startsWith("+++ b/")) file = line.slice(6);
    else if (line.startsWith("+") && !line.startsWith("+++")) {
      if (SKIP_CONTENT.some((r) => r.test(file))) continue;
      for (const f of scanText(line.slice(1), file)) {
        findings.push({ rule: f.rule, location: `${commit} ${file}` });
      }
    }
  }
  const unique = new Map(findings.map((f) => [`${f.rule}|${f.location}`, f]));
  return [...unique.values()];
}

function main() {
  const history = process.argv.includes("--history");
  const findings = history ? scanHistory() : scanWorkingTree();
  if (findings.length === 0) {
    console.log(`secret-scan: no findings (${history ? "full history" : "tracked files"}).`);
    return;
  }
  console.log(`secret-scan: ${findings.length} finding(s) (${history ? "full history" : "tracked files"}). Values are not printed.`);
  for (const f of findings) console.log(`  [${f.rule}] ${f.location}`);
  process.exitCode = 1;
}

if (process.argv[1] && /secret-scan\.ts$/.test(process.argv[1])) main();
