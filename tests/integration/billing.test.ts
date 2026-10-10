import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

const { mockSubscriptionsRetrieve, mockCheckoutCreate, mockPortalCreate } = vi.hoisted(() => ({
  mockSubscriptionsRetrieve: vi.fn(),
  mockCheckoutCreate: vi.fn(),
  mockPortalCreate: vi.fn(),
}));

// Partially mock @/lib/stripe: keep REAL signature verification (local HMAC, no
// network call) via a genuine Stripe client constructed with our test webhook
// secret, but mock the network-calling methods (subscriptions.retrieve,
// checkout session / portal session creation) so no real Stripe API is hit.
vi.mock("@/lib/stripe", async () => {
  const Stripe = (await import("stripe")).default;
  const real = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" as any });
  return {
    stripe: {
      webhooks: real.webhooks,
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
      checkout: { sessions: { create: mockCheckoutCreate } },
      billingPortal: { sessions: { create: mockPortalCreate } },
    },
  };
});

import Stripe from "stripe";
import {
  resetDb,
  testDb,
  disconnectDb,
  createOrg,
  createMembership,
  createUser,
} from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { setRequestHeaders, clearRequestContext } from "../helpers/nextRequestContext";
import { sendEmail } from "@/lib/mailer";
import { TIER_FACILITY_LIMITS, canClaimFacility } from "@/lib/permissions";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { POST as portal } from "@/app/api/stripe/portal/route";
import { POST as membershipUpdate } from "@/app/api/membership/update/route";

function signedWebhookRequest(payload: object) {
  const body = JSON.stringify(payload);
  const header = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  const headers = { "stripe-signature": header, "content-type": "application/json" };
  setRequestHeaders(headers); // the route reads this via next/headers headers(), not req.headers
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body });
}

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  clearRequestContext();
});
afterAll(disconnectDb);

describe("POST /api/stripe/checkout", () => {
  it("includes orgId, userId, and priceId in the session metadata", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    mockCheckoutCreate.mockResolvedValue({ url: "https://stripe.test/session/abc" });

    const res = await checkout(
      buildRequest("http://localhost/api/stripe/checkout", {
        method: "POST",
        body: { plan: "TIER_B" },
        cookies: await authCookie(user),
      }) as unknown as Request
    );
    expect(res.status).toBe(200);
    expect(mockCheckoutCreate).toHaveBeenCalledTimes(1);
    const args = mockCheckoutCreate.mock.calls[0][0];
    expect(args.metadata.orgId).toBe(org.id);
    expect(args.metadata.userId).toBe(user.id);
    expect(args.metadata.priceId).toBe(process.env.STRIPE_PRICE_B);
    expect(args.client_reference_id).toBe(org.id);
  });

  it("401 when not logged in", async () => {
    const res = await checkout(
      buildRequest("http://localhost/api/stripe/checkout", {
        method: "POST",
        body: { plan: "TIER_B" },
      }) as unknown as Request
    );
    expect(res.status).toBe(401);
  });

  it("400 on an invalid plan", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const res = await checkout(
      buildRequest("http://localhost/api/stripe/checkout", {
        method: "POST",
        body: { plan: "NOT_A_PLAN" },
        cookies: await authCookie(user),
      }) as unknown as Request
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/stripe/portal", () => {
  it("creates a portal session when a stripeCustomerId exists", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE", stripeCustomerId: "cus_123" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    mockPortalCreate.mockResolvedValue({ url: "https://stripe.test/portal/abc" });

    const res = await portal(
      buildRequest("http://localhost/api/stripe/portal", {
        method: "POST",
        cookies: await authCookie(user),
      }) as unknown as Request
    );
    expect(res.status).toBe(200);
  });

  it("400 when the org has no stripeCustomerId", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "NONE", status: "INACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });

    const res = await portal(
      buildRequest("http://localhost/api/stripe/portal", {
        method: "POST",
        cookies: await authCookie(user),
      }) as unknown as Request
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/stripe/webhook — signature verification", () => {
  it("rejects a request with an invalid/tampered signature (400)", async () => {
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    setRequestHeaders({ "stripe-signature": "t=1,v1=deadbeefnotarealsignature" });
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeefnotarealsignature" },
      body,
    });
    const res = await webhook(req);
    expect(res.status).toBe(400);
  });

  it("rejects a request with no signature header at all (400)", async () => {
    setRequestHeaders({});
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });
    const res = await webhook(req);
    expect(res.status).toBe(400);
  });

  it("accepts a validly signed event", async () => {
    const org = await createOrg();
    const req = signedWebhookRequest({
      id: "evt_test_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { orgId: org.id, priceId: process.env.STRIPE_PRICE_A }, customer: "cus_1", subscription: null } },
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/stripe/webhook — checkout.session.completed activates membership by organizationId", () => {
  for (const [tier, priceEnv] of [["TIER_A", "STRIPE_PRICE_A"], ["TIER_B", "STRIPE_PRICE_B"], ["TIER_C", "STRIPE_PRICE_C"]] as const) {
    it(`${tier}: the maxFacilities written by the webhook is exactly the limit canClaimFacility enforces (single source of truth)`, async () => {
      const org = await createOrg();
      const res = await webhook(
        signedWebhookRequest({
          id: `evt_limit_${tier}`,
          type: "checkout.session.completed",
          data: { object: { metadata: { orgId: org.id, priceId: process.env[priceEnv] }, customer: "cus_l", subscription: null } },
        })
      );
      expect(res.status).toBe(200);

      const membership = await testDb.membership.findUnique({ where: { organizationId: org.id } });
      expect(membership?.plan).toBe(tier);
      expect(membership?.maxFacilities).toBe(TIER_FACILITY_LIMITS[tier]);
      expect(canClaimFacility(tier, membership!.maxFacilities)).toBe(false);
      expect(canClaimFacility(tier, membership!.maxFacilities - 1)).toBe(true);
    });
  }

  it("creates an ACTIVE Membership for the org with the correct tier and maxFacilities", async () => {
    const org = await createOrg();
    await createUser({ organizationId: org.id, role: "MEMBER" }); // for the confirmation email lookup

    const req = signedWebhookRequest({
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { orgId: org.id, priceId: process.env.STRIPE_PRICE_C },
          customer: "cus_abc",
          subscription: null,
        },
      },
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);

    const membership = await testDb.membership.findUnique({ where: { organizationId: org.id } });
    expect(membership?.plan).toBe("TIER_C");
    expect(membership?.status).toBe("ACTIVE");
    expect(membership?.maxFacilities).toBe(10);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("missing orgId/priceId metadata is handled gracefully (200, no crash, no membership change)", async () => {
    const req = signedWebhookRequest({
      id: "evt_no_meta",
      type: "checkout.session.completed",
      data: { object: { metadata: {}, customer: "cus_x" } },
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/stripe/webhook — lifecycle events", () => {
  it("invoice.payment_failed sets status to PAST_DUE", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE", stripeSubscriptionId: "sub_1" });
    await createUser({ organizationId: org.id, role: "MEMBER" });

    const req = signedWebhookRequest({
      id: "evt_failed_1",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_1", attempt_count: 1 } },
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);

    const membership = await testDb.membership.findUnique({ where: { organizationId: org.id } });
    expect(membership?.status).toBe("PAST_DUE");
  });

  it("customer.subscription.deleted sets status CANCELED, plan NONE, maxFacilities 0", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE", stripeSubscriptionId: "sub_2", maxFacilities: 10 });
    await createUser({ organizationId: org.id, role: "MEMBER" });

    const req = signedWebhookRequest({
      id: "evt_deleted_1",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_2" } },
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);

    const membership = await testDb.membership.findUnique({ where: { organizationId: org.id } });
    expect(membership?.status).toBe("CANCELED");
    expect(membership?.plan).toBe("NONE");
    expect(membership?.maxFacilities).toBe(0);
  });

  it("invoice.payment_succeeded (subscription_cycle) resets PAST_DUE back to ACTIVE and emails once", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "PAST_DUE", stripeSubscriptionId: "sub_3" });
    await createUser({ organizationId: org.id, role: "MEMBER" });
    mockSubscriptionsRetrieve.mockResolvedValue({ current_period_end: Math.floor(Date.now() / 1000) + 2592000 });

    const req = signedWebhookRequest({
      id: "evt_renew_1",
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_3", billing_reason: "subscription_cycle" } },
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);

    const membership = await testDb.membership.findUnique({ where: { organizationId: org.id } });
    expect(membership?.status).toBe("ACTIVE");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/stripe/webhook — idempotency on duplicate delivery (FIXED)", () => {
  it("FIXED (was CONFIRMED GAP, email sent twice): delivering the SAME event twice keeps the DB idempotent " +
     "AND sends the confirmation email exactly ONCE — the event.id is recorded in ProcessedStripeEvent and a " +
     "redelivery skips its side effects", async () => {
    const org = await createOrg();
    await createUser({ organizationId: org.id, role: "MEMBER" });
    const payload = {
      id: "evt_dup_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { orgId: org.id, priceId: process.env.STRIPE_PRICE_A }, customer: "cus_dup", subscription: null } },
    };

    const res1 = await webhook(signedWebhookRequest(payload));
    const res2 = await webhook(signedWebhookRequest(payload));
    const res3 = await webhook(signedWebhookRequest(payload));
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);

    // DB side: idempotent, exactly one Membership row, correct final state.
    const memberships = await testDb.membership.findMany({ where: { organizationId: org.id } });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].status).toBe("ACTIVE");

    // Side-effect (email) IS deduplicated: once per event, not once per delivery.
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const processed = await testDb.processedStripeEvent.findMany();
    expect(processed.map((p) => ({ id: p.id, type: p.type }))).toEqual([
      { id: "evt_dup_1", type: "checkout.session.completed" },
    ]);
  });

  it("two DIFFERENT events for the same org each send their own email (dedup is per event.id, not per org/type)", async () => {
    const org = await createOrg();
    await createUser({ organizationId: org.id, role: "MEMBER" });
    const object = { metadata: { orgId: org.id, priceId: process.env.STRIPE_PRICE_A }, customer: "cus_two", subscription: null };

    await webhook(signedWebhookRequest({ id: "evt_two_a", type: "checkout.session.completed", data: { object } }));
    await webhook(signedWebhookRequest({ id: "evt_two_b", type: "checkout.session.completed", data: { object } }));

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(await testDb.processedStripeEvent.count()).toBe(2);
  });

  it("the same event delivered CONCURRENTLY (5 at once) still sends exactly one email", async () => {
    const org = await createOrg();
    await createUser({ organizationId: org.id, role: "MEMBER" });
    const payload = {
      id: "evt_concurrent_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { orgId: org.id, priceId: process.env.STRIPE_PRICE_B }, customer: "cus_c", subscription: null } },
    };
    // Build every signed request first: signedWebhookRequest() sets the shared header mock.
    const requests = Array.from({ length: 5 }, () => signedWebhookRequest(payload));

    const responses = await Promise.all(requests.map((r) => webhook(r)));
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await testDb.membership.count({ where: { organizationId: org.id } })).toBe(1);
    expect(await testDb.processedStripeEvent.count()).toBe(1);
  });

  it("if processing FAILS (500), the event is not marked processed, so Stripe's retry is handled in full " +
     "and its email is still sent", async () => {
    const org = await createOrg();
    await createUser({ organizationId: org.id, role: "MEMBER" });
    const payload = {
      id: "evt_retry_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { orgId: org.id, priceId: process.env.STRIPE_PRICE_A }, customer: "cus_r", subscription: "sub_retry" } },
    };

    // First delivery: Stripe's API is down while fetching the subscription.
    mockSubscriptionsRetrieve.mockRejectedValueOnce(new Error("stripe unavailable"));
    const failed = await webhook(signedWebhookRequest(payload));
    expect(failed.status).toBe(500);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await testDb.processedStripeEvent.count()).toBe(0);

    // Retry succeeds and is treated as a first delivery.
    mockSubscriptionsRetrieve.mockResolvedValueOnce({ id: "sub_retry", current_period_end: Math.floor(Date.now() / 1000) + 86400 });
    const retried = await webhook(signedWebhookRequest(payload));
    expect(retried.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await testDb.processedStripeEvent.count()).toBe(1);
  });

  it("an event with an invalid signature is rejected before anything is recorded", async () => {
    const headers = { "stripe-signature": "t=1,v1=bad", "content-type": "application/json" };
    setRequestHeaders(headers);
    const res = await webhook(
      new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body: JSON.stringify({ id: "evt_forged" }) })
    );
    expect(res.status).toBe(400);
    expect(await testDb.processedStripeEvent.count()).toBe(0);
  });
});

describe("POST /api/membership/update — ADMIN-only manual override", () => {
  it("ADMIN can set a plan directly", async () => {
    const org = await createOrg();
    const admin = await createUser({ role: "ADMIN", organizationId: null });

    const res = await membershipUpdate(
      buildRequest("http://localhost/api/membership/update", {
        method: "POST",
        body: { organizationId: org.id, plan: "TIER_C" },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(200);
    const membership = await testDb.membership.findUnique({ where: { organizationId: org.id } });
    expect(membership?.plan).toBe("TIER_C");
    expect(membership?.status).toBe("ACTIVE");
  });

  it("MEMBER is forbidden (403)", async () => {
    const org = await createOrg();
    const member = await createUser({ role: "MEMBER", organizationId: org.id });

    const res = await membershipUpdate(
      buildRequest("http://localhost/api/membership/update", {
        method: "POST",
        body: { organizationId: org.id, plan: "TIER_C" },
        cookies: await authCookie(member),
      })
    );
    expect(res.status).toBe(403);
  });

  it("nonexistent organizationId returns 404", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const res = await membershipUpdate(
      buildRequest("http://localhost/api/membership/update", {
        method: "POST",
        body: { organizationId: "does-not-exist", plan: "TIER_C" },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(404);
  });

  it("invalid plan value returns 400", async () => {
    const org = await createOrg();
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const res = await membershipUpdate(
      buildRequest("http://localhost/api/membership/update", {
        method: "POST",
        body: { organizationId: org.id, plan: "SUPER_TIER" },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(400);
  });
});
