import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/mailer", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { resetDb, testDb, disconnectDb } from "../helpers/db";
import { buildRequest } from "../helpers/http";
import { sendEmail } from "@/lib/mailer";

import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as verify } from "@/app/api/auth/verify/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as mfaGenerate } from "@/app/api/mfa/generate/route";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

afterAll(async () => {
  await disconnectDb();
});

async function readJson(res: Response) {
  return res.json();
}

describe("POST /api/auth/signup", () => {
  it("creates an Organization + INACTIVE/NONE Membership + User", async () => {
    const res = await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: {
          name: "Jane Doe",
          email: "jane@example.com",
          password: "password123",
          confirmPassword: "password123",
        },
      })
    );
    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body.success).toBe(true);

    const user = await testDb.user.findUnique({
      where: { email: "jane@example.com" },
      include: { organization: { include: { membership: true } } },
    });
    expect(user).not.toBeNull();
    expect(user!.organization).not.toBeNull();
    expect(user!.organization!.membership?.plan).toBe("NONE");
    expect(user!.organization!.membership?.status).toBe("INACTIVE");
    // Password must not be stored in plaintext.
    expect(user!.password).not.toBe("password123");
  });

  it("rejects duplicate email with 409", async () => {
    await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "A", email: "dup@example.com", password: "password123", confirmPassword: "password123" },
      })
    );
    const res2 = await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "B", email: "dup@example.com", password: "password123", confirmPassword: "password123" },
      })
    );
    expect(res2.status).toBe(409);
  });

  it("rejects missing required fields with 400", async () => {
    const res = await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { email: "x@example.com", password: "password123", confirmPassword: "password123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects mismatched confirmPassword with 400", async () => {
    const res = await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "A", email: "x2@example.com", password: "password123", confirmPassword: "nope" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const res = await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "A", email: "x3@example.com", password: "short1", confirmPassword: "short1" },
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("Login + MFA flow (POST /api/auth/login then /api/auth/verify)", () => {
  async function signupUser(email: string, password = "password123") {
    await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "Test", email, password, confirmPassword: password },
      })
    );
  }

  it("valid credentials issue an mfa-pending cookie and send one OTP email", async () => {
    await signupUser("mfa1@example.com");
    const res = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa1@example.com", password: "password123" },
      })
    );
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.mfaRequired).toBe(true);
    expect(res.cookies.get("mfa-pending")?.value).toBeTruthy();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid password with 401 and does not create an OTP", async () => {
    await signupUser("mfa2@example.com");
    const res = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa2@example.com", password: "wrong-password" },
      })
    );
    expect(res.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects unknown email with 401 (does not leak whether the account exists)", async () => {
    const res = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "nobody@example.com", password: "password123" },
      })
    );
    expect(res.status).toBe(401);
    const body = await readJson(res);
    expect(body.error).toBe("Invalid credentials");
  });

  it("completes login with the correct OTP and sets a session auth-token with userId/email/role/orgId", async () => {
    await signupUser("mfa3@example.com");
    const loginRes = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa3@example.com", password: "password123" },
      })
    );
    const pending = loginRes.cookies.get("mfa-pending")!.value;

    const otpRecord = await testDb.mfaOtp.findFirstOrThrow({ where: { email: "mfa3@example.com" } });

    const verifyRes = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: otpRecord.code },
        cookies: { "mfa-pending": pending },
      })
    );
    expect(verifyRes.status).toBe(200);
    const authToken = verifyRes.cookies.get("auth-token")?.value;
    expect(authToken).toBeTruthy();

    const meRes = await me(
      buildRequest("http://localhost/api/auth/me", { cookies: { "auth-token": authToken! } })
    );
    expect(meRes.status).toBe(200);
    const meBody = await readJson(meRes);
    expect(meBody.email).toBe("mfa3@example.com");
    expect(meBody.organization).not.toBeNull();
  });

  it("rejects a wrong OTP code and increments attempts", async () => {
    await signupUser("mfa4@example.com");
    const loginRes = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa4@example.com", password: "password123" },
      })
    );
    const pending = loginRes.cookies.get("mfa-pending")!.value;

    const verifyRes = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: "000000" },
        cookies: { "mfa-pending": pending },
      })
    );
    expect(verifyRes.status).toBe(401);

    const otpRecord = await testDb.mfaOtp.findFirstOrThrow({ where: { email: "mfa4@example.com" } });
    expect(otpRecord.attempts).toBe(1);
    expect(otpRecord.used).toBe(false);
  });

  it("locks the OTP out after OTP_MAX_ATTEMPTS (5) wrong guesses", async () => {
    await signupUser("mfa5@example.com");
    const loginRes = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa5@example.com", password: "password123" },
      })
    );
    const pending = loginRes.cookies.get("mfa-pending")!.value;

    for (let i = 0; i < 5; i++) {
      await verify(
        buildRequest("http://localhost/api/auth/verify", {
          method: "POST",
          body: { otp: "000000" },
          cookies: { "mfa-pending": pending },
        })
      );
    }

    const otpRecord = await testDb.mfaOtp.findFirstOrThrow({ where: { email: "mfa5@example.com" } });
    expect(otpRecord.used).toBe(true); // invalidated after max attempts

    // Even the CORRECT code is now rejected because the OTP is invalidated.
    const finalRes = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: otpRecord.code },
        cookies: { "mfa-pending": pending },
      })
    );
    expect(finalRes.status).toBe(401);
  });

  it("rejects reusing an already-consumed OTP", async () => {
    await signupUser("mfa6@example.com");
    const loginRes = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa6@example.com", password: "password123" },
      })
    );
    const pending = loginRes.cookies.get("mfa-pending")!.value;
    const otpRecord = await testDb.mfaOtp.findFirstOrThrow({ where: { email: "mfa6@example.com" } });

    const first = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: otpRecord.code },
        cookies: { "mfa-pending": pending },
      })
    );
    expect(first.status).toBe(200);

    const second = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: otpRecord.code },
        cookies: { "mfa-pending": pending },
      })
    );
    expect(second.status).toBe(401);
  });

  it("rejects an expired OTP", async () => {
    await signupUser("mfa7@example.com");
    const loginRes = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa7@example.com", password: "password123" },
      })
    );
    const pending = loginRes.cookies.get("mfa-pending")!.value;
    const otpRecord = await testDb.mfaOtp.findFirstOrThrow({ where: { email: "mfa7@example.com" } });

    // Force expiry directly in the DB (equivalent to waiting 5+ minutes).
    await testDb.mfaOtp.update({
      where: { id: otpRecord.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: otpRecord.code },
        cookies: { "mfa-pending": pending },
      })
    );
    expect(res.status).toBe(401);
  });

  it("verify fails with 401 when there is no mfa-pending cookie", async () => {
    const res = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: "123456" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("verify fails with 400 on a malformed OTP (not 6 digits)", async () => {
    await signupUser("mfa8@example.com");
    const loginRes = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa8@example.com", password: "password123" },
      })
    );
    const pending = loginRes.cookies.get("mfa-pending")!.value;
    const res = await verify(
      buildRequest("http://localhost/api/auth/verify", {
        method: "POST",
        body: { otp: "12a" },
        cookies: { "mfa-pending": pending },
      })
    );
    expect(res.status).toBe(400);
  });

  it("mfa/generate (resend) is blocked by a 60s cooldown returning 429", async () => {
    await signupUser("mfa9@example.com");
    const loginRes = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "mfa9@example.com", password: "password123" },
      })
    );
    const pending = loginRes.cookies.get("mfa-pending")!.value;

    const resendRes = await mfaGenerate(
      buildRequest("http://localhost/api/mfa/generate", {
        method: "POST",
        cookies: { "mfa-pending": pending },
      })
    );
    expect(resendRes.status).toBe(429);
  });
});

describe("Protected routes without a token", () => {
  it("/api/auth/me returns 401 with no cookie", async () => {
    const res = await me(buildRequest("http://localhost/api/auth/me"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the auth-token cookie", async () => {
    const res = await logout(buildRequest("http://localhost/api/auth/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(res.cookies.get("auth-token")?.value).toBe("");
  });
});
