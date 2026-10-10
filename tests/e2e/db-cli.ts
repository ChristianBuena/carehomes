/**
 * Run via `tsx` as a subprocess (see fixtures.ts). Playwright's own test
 * transform can't load the generated Prisma client (it uses import.meta,
 * which needs real ESM — Vitest/Vite handles this fine, Playwright's
 * lighter transform does not). Isolating all Prisma access in a tsx
 * subprocess sidesteps that entirely.
 */
import {
  testDb,
  resetDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
} from "../helpers/db";

async function main() {
  const { op, args } = JSON.parse(process.argv[2]) as { op: string; args?: Record<string, unknown> };
  let result: unknown = null;

  switch (op) {
    case "reset":
      await resetDb();
      break;
    case "createOrg":
      result = await createOrg(args as any);
      break;
    case "createMembership":
      result = await createMembership(args as any);
      break;
    case "createUser":
      result = await createUser(args as any);
      break;
    case "createFacility":
      result = await createFacility(args as any);
      break;
    default:
      throw new Error(`unknown op: ${op}`);
  }

  process.stdout.write(JSON.stringify(result ?? null));
  await testDb.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
