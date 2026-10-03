import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * RBAC Payload Type
 */
export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: "MEMBER" | "ADMIN" | "MODERATOR";
  /** ID of the Organization this user belongs to (set at signup, present in every JWT). */
  orgId: string;
};

/**
 * Generate JWT token
 */
export async function signToken(payload: AuthTokenPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verify JWT token
 * Rejects MFA-pending tokens so they can never be used as a session.
 */
export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.purpose === MFA_PENDING_PURPOSE) {
    throw new Error("MFA-pending token cannot be used as a session token");
  }
  return payload as AuthTokenPayload;
}

// ── MFA-pending token ───────────────────────────────────────────────────────
// Issued ONLY after a correct password. Proves step 1 of login was completed
// so the OTP endpoints never trust an email supplied in the request body.

export const MFA_PENDING_COOKIE = "mfa-pending";
export const MFA_PENDING_MAX_AGE_SECONDS = 10 * 60; // 10 minutes
const MFA_PENDING_PURPOSE = "mfa_pending";

export async function signMfaPendingToken(email: string): Promise<string> {
  return await new SignJWT({ email, purpose: MFA_PENDING_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MFA_PENDING_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

/** Returns the email bound to a valid MFA-pending token, or null. */
export async function verifyMfaPendingToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.purpose !== MFA_PENDING_PURPOSE) return null;
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}