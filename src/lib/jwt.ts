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
 */
export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as AuthTokenPayload;
}