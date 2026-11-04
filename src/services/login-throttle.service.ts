import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// Brute-force protection for the password step. Failures are counted per
// (email, client IP): after MAX_FAILED_LOGIN_ATTEMPTS wrong passwords from one
// address for one email, that pair is locked for LOGIN_LOCKOUT_MINUTES. The
// same email from any other address is unaffected, so nobody can lock another
// person out just by knowing their email.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;
// Failures older than this no longer count towards the limit.
export const LOGIN_FAILURE_WINDOW_MINUTES = 15;
// Rows untouched for this long are deleted (keeps the table from growing with
// every mistyped or attacker-supplied email).
const STALE_ROW_HOURS = 24;

/** The key failures are counted under. Emails are compared case-insensitively. */
export function throttleKey(email: unknown, ipAddress: string) {
  return {
    // 320 is the longest valid email address; anything longer is just a key.
    email: String(email).trim().toLowerCase().slice(0, 320),
    ipAddress,
  };
}

type ThrottleKey = ReturnType<typeof throttleKey>;

/** Returns when the lock on this (email, IP) pair ends, or null if it is not locked. */
export async function getLoginLock(key: ThrottleKey): Promise<Date | null> {
  const row = await prisma.loginAttempt.findUnique({
    where: { email_ipAddress: key },
    select: { lockedUntil: true },
  });

  return row?.lockedUntil && row.lockedUntil > new Date() ? row.lockedUntil : null;
}

/**
 * Counts one failed attempt for this (email, IP) pair and returns the lock
 * expiry if that attempt (or an earlier one) locked the pair, otherwise null.
 *
 * A single statement, so concurrent guesses are all counted. A failure that
 * arrives while the pair is already locked leaves the lock and count alone.
 */
export async function recordLoginFailure(key: ThrottleKey): Promise<Date | null> {
  const rows = await prisma.$queryRaw<{ lockedUntil: Date | null }[]>`
    INSERT INTO "LoginAttempt" ("id", "email", "ipAddress", "failedAttempts", "lastFailedAt")
    VALUES (${randomUUID()}, ${key.email}, ${key.ipAddress}, 1, now() AT TIME ZONE 'UTC')
    ON CONFLICT ("email", "ipAddress") DO UPDATE SET
      "failedAttempts" = CASE
        WHEN "LoginAttempt"."lockedUntil" > now() AT TIME ZONE 'UTC'
          THEN "LoginAttempt"."failedAttempts"
        WHEN "LoginAttempt"."lockedUntil" IS NOT NULL
          OR "LoginAttempt"."lastFailedAt"
             < (now() AT TIME ZONE 'UTC') - make_interval(mins => ${LOGIN_FAILURE_WINDOW_MINUTES}::int)
          THEN 1
        ELSE "LoginAttempt"."failedAttempts" + 1
      END,
      "lockedUntil" = CASE
        WHEN "LoginAttempt"."lockedUntil" > now() AT TIME ZONE 'UTC'
          THEN "LoginAttempt"."lockedUntil"
        WHEN "LoginAttempt"."lockedUntil" IS NULL
          AND "LoginAttempt"."lastFailedAt"
              >= (now() AT TIME ZONE 'UTC') - make_interval(mins => ${LOGIN_FAILURE_WINDOW_MINUTES}::int)
          AND "LoginAttempt"."failedAttempts" + 1 >= ${MAX_FAILED_LOGIN_ATTEMPTS}::int
          THEN (now() AT TIME ZONE 'UTC') + make_interval(mins => ${LOGIN_LOCKOUT_MINUTES}::int)
        ELSE NULL
      END,
      "lastFailedAt" = now() AT TIME ZONE 'UTC'
    RETURNING "lockedUntil"
  `;

  // Opportunistic cleanup of rows nobody has touched for a day.
  const now = new Date();
  await prisma.loginAttempt.deleteMany({
    where: {
      lastFailedAt: { lt: new Date(now.getTime() - STALE_ROW_HOURS * 60 * 60 * 1000) },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
  });

  return rows[0]?.lockedUntil ?? null;
}

/** Forgets the failure history for this (email, IP) pair after a correct password. */
export async function clearLoginFailures(key: ThrottleKey): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: key });
}
