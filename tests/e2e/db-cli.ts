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
  createRebuttal,
  createMemberFile,
  createShareLink,
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
    case "createRebuttal":
      result = await createRebuttal(args as any);
      break;
    case "createMemberFile":
      result = await createMemberFile(args as any);
      break;
    case "createShareLink": {
      const a = args as { userId: string; shareAll?: boolean; fileIds?: string[]; expiresAt?: string | null; revokedAt?: string | null };
      result = await createShareLink({
        ...a,
        expiresAt: a.expiresAt ? new Date(a.expiresAt) : null,
        revokedAt: a.revokedAt ? new Date(a.revokedAt) : null,
      });
      break;
    }
    case "softDeleteFacility":
      result = await testDb.facility.update({
        where: { id: (args as { id: string }).id },
        data: { deletedAt: new Date() },
      });
      break;
    case "setRebuttalStatus": {
      const { id, status } = args as { id: string; status: "PENDING" | "APPROVED" | "REJECTED" | "REQUEST_FIX" };
      result = await testDb.rebuttal.update({ where: { id }, data: { status } });
      break;
    }
    case "countRebuttals":
      result = await testDb.rebuttal.count();
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
