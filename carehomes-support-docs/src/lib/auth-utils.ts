import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password before saving to DB
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare plain password with hashed password from DB
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Simple token generator (currently NOT used for auth)
 * Keep for future use or remove later when switching to JWT
 */
export function generateToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}