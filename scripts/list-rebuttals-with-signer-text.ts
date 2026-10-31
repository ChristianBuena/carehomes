/**
 * READ-ONLY. Lists rebuttals created before the SOW 11.3 change whose
 * (possibly published) text still contains the print form's
 * "Signed: <name> (<date>)" or "Date of Visit: <date>" lines.
 *
 *   npx dotenv -e .env -- npx tsx scripts/list-rebuttals-with-signer-text.ts
 *
 * Prints id, status, created date and which line type was found. It never
 * prints the rebuttal text or the name, and it never changes data: deciding
 * what to do with each row (edit, unpublish, leave) is a manual decision.
 */
import type { PrismaClient } from "../src/generated/prisma/client";

export type SignerTextHit = {
  id: string;
  status: string;
  createdAt: string;
  hasSignedLine: boolean;
  hasVisitDateLine: boolean;
};

const SIGNED_LINE = /^Signed: .+$/m;
const VISIT_LINE = /^Date of Visit: .*$/m;

export async function findRebuttalsWithSignerText(db: Pick<PrismaClient, "rebuttal">): Promise<SignerTextHit[]> {
  const rows = await db.rebuttal.findMany({
    where: {
      OR: [{ content: { contains: "Signed: " } }, { content: { contains: "Date of Visit: " } }],
    },
    select: { id: true, status: true, createdAt: true, content: true },
    orderBy: { createdAt: "asc" },
  });
  return rows
    .map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      hasSignedLine: SIGNED_LINE.test(r.content),
      hasVisitDateLine: VISIT_LINE.test(r.content),
    }))
    .filter((r) => r.hasSignedLine || r.hasVisitDateLine);
}

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const hits = await findRebuttalsWithSignerText(db);
    console.log(`${hits.length} rebuttal(s) contain signer or visit-date lines in their text.`);
    for (const h of hits) {
      console.log(
        `${h.id}\t${h.status}\t${h.createdAt}\t${[h.hasSignedLine && "Signed", h.hasVisitDateLine && "Date of Visit"].filter(Boolean).join(", ")}`
      );
    }
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && /list-rebuttals-with-signer-text\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
