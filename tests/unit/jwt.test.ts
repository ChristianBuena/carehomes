import { describe, it, expect } from "vitest";
import {
  signToken,
  verifyToken,
  signMfaPendingToken,
  verifyMfaPendingToken,
} from "@/lib/jwt";
import { SignJWT } from "jose";

const payload = {
  userId: "user_123",
  email: "a@example.com",
  role: "MEMBER" as const,
  orgId: "org_123",
};

describe("signToken / verifyToken", () => {
  it("round-trips the full payload: userId, email, role, orgId", async () => {
    const token = await signToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.orgId).toBe(payload.orgId);
  });

  it("rejects a tampered token (payload modified after signing)", async () => {
    const token = await signToken(payload);
    const parts = token.split(".");
    // Flip a character in the MIDDLE of the payload segment, not the last one —
    // base64url's final character can carry unused padding bits for some lengths,
    // so a last-character flip can occasionally decode to the identical bytes.
    const mid = Math.floor(parts[1].length / 2);
    const flipped = parts[1][mid] === "A" ? "B" : "A";
    const tamperedPayload = parts[1].slice(0, mid) + flipped + parts[1].slice(mid + 1);
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    await expect(verifyToken(tampered)).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode("a-completely-different-secret");
    const foreignToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(otherSecret);
    await expect(verifyToken(foreignToken)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const expired = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("-1s")
      .sign(secret);
    await expect(verifyToken(expired)).rejects.toThrow();
  });

  it("rejects a garbage/non-JWT string", async () => {
    await expect(verifyToken("not.a.jwt")).rejects.toThrow();
  });

  it("rejects an MFA-pending token presented as a session token", async () => {
    const pending = await signMfaPendingToken("a@example.com");
    await expect(verifyToken(pending)).rejects.toThrow(
      "MFA-pending token cannot be used as a session token"
    );
  });
});

describe("signMfaPendingToken / verifyMfaPendingToken", () => {
  it("round-trips the email", async () => {
    const token = await signMfaPendingToken("a@example.com");
    const email = await verifyMfaPendingToken(token);
    expect(email).toBe("a@example.com");
  });

  it("returns null for a tampered mfa-pending token", async () => {
    const token = await signMfaPendingToken("a@example.com");
    const parts = token.split(".");
    // Flip a middle character of the signature — see the session-token test above
    // for why the LAST character of a base64url segment is a bad choice here.
    const mid = Math.floor(parts[2].length / 2);
    const flipped = parts[2][mid] === "A" ? "B" : "A";
    const tamperedSig = parts[2].slice(0, mid) + flipped + parts[2].slice(mid + 1);
    const tampered = `${parts[0]}.${parts[1]}.${tamperedSig}`;
    const email = await verifyMfaPendingToken(tampered);
    expect(email).toBeNull();
  });

  it("returns null for garbage input instead of throwing", async () => {
    const email = await verifyMfaPendingToken("garbage");
    expect(email).toBeNull();
  });

  it("a normal session token is not accepted as an mfa-pending token", async () => {
    const session = await signToken(payload);
    const email = await verifyMfaPendingToken(session);
    expect(email).toBeNull();
  });
});
