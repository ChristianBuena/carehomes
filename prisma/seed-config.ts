/**
 * Seed configuration guard (release blocker S-7).
 *
 * The seed creates an ADMIN account. It must never run against production and
 * must never fall back to a built-in password, so every credential comes from
 * the environment and there are no defaults.
 *
 *   SEED_ADMIN_EMAIL     email of the first ADMIN account
 *   SEED_ADMIN_PASSWORD  its password (min 12 characters)
 *   SEED_DEMO_PASSWORD   password for the two demo MEMBER accounts (min 12)
 *
 * See docs/SECRET_ROTATION.md, "Creating the first admin safely".
 */

export const MIN_SEED_PASSWORD_LENGTH = 12;

export type SeedConfig = {
  adminEmail: string;
  adminPassword: string;
  demoPassword: string;
};

export class SeedConfigError extends Error {}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new SeedConfigError(`${name} is not set. The seed has no default credentials.`);
  }
  return value;
}

function password(env: Env, name: string): string {
  const value = required(env, name);
  if (value.length < MIN_SEED_PASSWORD_LENGTH) {
    throw new SeedConfigError(`${name} must be at least ${MIN_SEED_PASSWORD_LENGTH} characters.`);
  }
  return value;
}

export function readSeedConfig(env: Env): SeedConfig {
  if (env.NODE_ENV === "production") {
    throw new SeedConfigError(
      "Refusing to seed: NODE_ENV is production. Create the first admin with the steps in docs/SECRET_ROTATION.md instead."
    );
  }

  const adminEmail = required(env, "SEED_ADMIN_EMAIL").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new SeedConfigError("SEED_ADMIN_EMAIL is not a valid email address.");
  }

  return {
    adminEmail,
    adminPassword: password(env, "SEED_ADMIN_PASSWORD"),
    demoPassword: password(env, "SEED_DEMO_PASSWORD"),
  };
}
