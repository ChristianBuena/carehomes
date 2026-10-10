/**
 * Static check: every object-literal key passed to a Prisma model call
 * (`prisma.user.findMany({ select: { ... } })`, `tx.facility.count({ where })`,
 * ...) must exist on the generated argument type for that model + operation —
 * recursively through select / include / where / data / orderBy.
 *
 * Why tsc alone is not enough: Prisma's generated methods are generic,
 *
 *   findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs>)
 *
 * so the argument's type is INFERRED as T and only has to be assignable to the
 * constraint. Assignability allows extra properties, so `select: { id: true,
 * membership: {...} }` on a model with no `membership` relation compiles (the
 * field just comes back typed `never`) and then throws at runtime. That is how
 * GET /api/admin/access-review shipped broken (TEST_REPORT.md #1/#10).
 *
 * This test walks the same AST tsc sees and applies the strict (non-generic)
 * check to every call, covering pages, server actions and services that the
 * route smoke test (tests/integration/route-smoke.test.ts) cannot reach.
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(__dirname, "..", "..");

type Audit = {
  calls: number;
  files: Set<string>;
  keysChecked: number;
  violations: string[];
  untyped: string[];
};

function auditPrismaCalls(extraFiles: Record<string, string> = {}): Audit {
  const configPath = path.join(ROOT, "tsconfig.json");
  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    },
  });
  if (!parsed) throw new Error("could not parse tsconfig.json");

  const options: ts.CompilerOptions = { ...parsed.options, incremental: false, noEmit: true };
  const host = ts.createCompilerHost(options);
  const virtual = new Map(Object.entries(extraFiles).map(([rel, text]) => [path.join(ROOT, rel), text]));
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = (f) => virtual.get(f) ?? readFile(f);
  host.fileExists = (f) => virtual.has(f) || fileExists(f);

  const program = ts.createProgram([...parsed.fileNames, ...virtual.keys()], options, host);
  const checker = program.getTypeChecker();
  const audit: Audit = { calls: 0, files: new Set(), keysChecked: 0, violations: [], untyped: [] };

  const rel = (sf: ts.SourceFile) => path.relative(ROOT, sf.fileName).split(path.sep).join("/");
  const loc = (node: ts.Node) => {
    const sf = node.getSourceFile();
    return `${rel(sf)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  };
  const flat = (t: ts.Type): ts.Type[] => (t.isUnion() ? t.types.flatMap(flat) : [t]);
  const strip = (types: ts.Type[]) =>
    types
      .flatMap(flat)
      .filter((t) => !(t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Never)));
  const elementTypes = (types: ts.Type[]) =>
    strip(types).flatMap((t) => (checker.isArrayType(t) ? strip([...checker.getTypeArguments(t as ts.TypeReference)]) : [t]));

  function unwrap(e: ts.Expression): ts.Expression {
    let cur = e;
    while (
      ts.isParenthesizedExpression(cur) ||
      ts.isAsExpression(cur) ||
      ts.isSatisfiesExpression(cur) ||
      ts.isNonNullExpression(cur)
    ) {
      cur = cur.expression;
    }
    return cur;
  }

  function walk(input: ts.Expression, targets: ts.Type[], ctx: string, trail: string, seen: Set<ts.Node>) {
    const expr = unwrap(input);

    if (ts.isConditionalExpression(expr)) {
      walk(expr.whenTrue, targets, ctx, trail, seen);
      walk(expr.whenFalse, targets, ctx, trail, seen);
      return;
    }
    if (ts.isArrayLiteralExpression(expr)) {
      const el = elementTypes(targets);
      for (const e of expr.elements) if (!ts.isSpreadElement(e)) walk(e, el, ctx, `${trail}[]`, seen);
      return;
    }
    if (ts.isIdentifier(expr)) {
      // Follow `const where = { ... }` back to its literal.
      const decl = checker.getSymbolAtLocation(expr)?.valueDeclaration;
      if (decl && ts.isVariableDeclaration(decl) && decl.initializer && !seen.has(decl)) {
        seen.add(decl);
        walk(decl.initializer, targets, ctx, trail, seen);
      }
      return;
    }
    if (!ts.isObjectLiteralExpression(expr)) return;

    const targetTypes = strip(targets).map((t) => checker.getApparentType(t));
    if (targetTypes.some((t) => t.flags & ts.TypeFlags.Any)) {
      audit.untyped.push(`${loc(expr)}  ${ctx}  ${trail || "(args)"} is typed any`);
      return;
    }

    for (const prop of expr.properties) {
      if (ts.isSpreadAssignment(prop)) {
        walk(prop.expression, targets, ctx, trail, seen);
        continue;
      }
      if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue;
      if (!ts.isIdentifier(prop.name) && !ts.isStringLiteral(prop.name)) continue;

      const name = prop.name.text;
      const here = trail ? `${trail}.${name}` : name;
      audit.keysChecked += 1;

      const found: ts.Type[] = [];
      for (const t of targetTypes) {
        const symbol = checker.getPropertyOfType(t, name);
        if (symbol) found.push(checker.getTypeOfSymbolAtLocation(symbol, prop));
        else {
          const index = checker.getIndexTypeOfType(t, ts.IndexKind.String);
          if (index) found.push(index);
        }
      }
      if (found.length === 0) {
        audit.violations.push(`${loc(prop)}  ${ctx}  unknown key "${here}"`);
        continue;
      }
      walk(ts.isShorthandPropertyAssignment(prop) ? prop.name : prop.initializer, found, ctx, here, seen);
    }
  }

  for (const sf of program.getSourceFiles()) {
    const file = rel(sf);
    if (sf.isDeclarationFile || !(file.startsWith("src/") || file.startsWith("prisma/")) || file.startsWith("src/generated/")) {
      continue;
    }
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.text;
        const receiver = node.expression.expression;
        const receiverType = checker.getTypeAtLocation(receiver);
        const delegate = /^(\w+)Delegate</.exec(checker.typeToString(receiverType));

        if (delegate) {
          const ctx = `${delegate[1]}.${method}`;
          audit.calls += 1;
          audit.files.add(file);
          const declaration = checker.getResolvedSignature(node)?.getDeclaration();
          const constraint = declaration?.typeParameters?.[0]?.constraint;
          if (node.arguments.length > 0 && constraint) {
            walk(node.arguments[0], [checker.getTypeFromTypeNode(constraint)], ctx, "", new Set());
          }
        } else if (
          receiverType.flags & ts.TypeFlags.Any &&
          !method.startsWith("$") &&
          /\bprisma\b|\btx\b|delegate/i.test(receiver.getText())
        ) {
          // e.g. `(prisma as any).takedownRequest.update(...)` — nothing is type-checked at all.
          audit.untyped.push(`${loc(node)}  ${receiver.getText()}.${method}(...) — receiver is typed any`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  return audit;
}

describe("Prisma query shapes — every select/include/where/data key exists on its model", () => {
  it("no Prisma call anywhere under src/ or prisma/seed.ts references a field that is not on the model, " +
     "and none goes through an `any`-typed client", () => {
    const audit = auditPrismaCalls();

    // Sanity: the walker really found the codebase's queries (139 calls in 43 files when written).
    expect(audit.calls).toBeGreaterThan(100);
    expect(audit.files.size).toBeGreaterThan(30);
    expect(audit.keysChecked).toBeGreaterThan(500);

    expect(audit.violations).toEqual([]);
    expect(audit.untyped).toEqual([]);
  }, 120000);

  it("the check itself works: it flags the exact access-review bug (User.membership) and other unknown keys " +
     "that `tsc --noEmit` accepts, and stays quiet on the corrected query", () => {
    const audit = auditPrismaCalls({
      "src/__prisma_shape_probe__.ts": `
        import { prisma } from "@/lib/prisma";
        export const broken = () =>
          prisma.user.findMany({
            select: { id: true, membership: { select: { plan: true, status: true } } },
          });
        export const nested = () =>
          prisma.user.findMany({
            include: { organization: { select: { membership: true, nope: true } } },
            where: { id: "x", bogus: 1 },
          });
        export const write = () => prisma.user.update({ where: { id: "x" }, data: { name: "n", zzz: 1 } });
        export const untyped = () => (prisma as any).takedownRequest.findMany({ where: { nope: 1 } });
        export const fixed = () =>
          prisma.user.findMany({
            where: { OR: [{ lastReviewedAt: null }, { role: { in: ["ADMIN"] } }] },
            select: { id: true, organization: { select: { membership: { select: { plan: true, status: true } } } } },
            orderBy: { createdAt: "asc" },
          });
      `,
    });

    const probe = (list: string[]) => list.filter((v) => v.startsWith("src/__prisma_shape_probe__.ts"));
    expect(probe(audit.violations).map((v) => v.replace(/^\S+\s+/, ""))).toEqual([
      'User.findMany  unknown key "select.membership"',
      'User.findMany  unknown key "include.organization.select.nope"',
      'User.findMany  unknown key "where.bogus"',
      'User.update  unknown key "data.zzz"',
    ]);
    expect(probe(audit.untyped)).toHaveLength(1);
    // Nothing outside the probe file is affected.
    expect(audit.violations.filter((v) => !v.startsWith("src/__prisma_shape_probe__.ts"))).toEqual([]);
  }, 120000);
});
