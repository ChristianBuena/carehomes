import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const tierConfig: Record<string, { maxFacilities: number }> = {
  TIER_A: { maxFacilities: 1 },
  TIER_B: { maxFacilities: 3 },
  TIER_C: { maxFacilities: 10 },
};

export async function POST(req: Request) {
  const body = await req.text();

  const headerList = await headers();
  const sig = headerList.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Missing stripe signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  try {
    switch (event.type) {

      // PAYMENT SUCCESS → ACTIVATE SUBSCRIPTION
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;

        if (!userId || !priceId) {
          console.error("Missing metadata in checkout session");
          return NextResponse.json({ received: true });
        }

        let tier: "TIER_A" | "TIER_B" | "TIER_C" = "TIER_A";

        if (priceId === process.env.STRIPE_PRICE_B) {
          tier = "TIER_B";
        } else if (priceId === process.env.STRIPE_PRICE_C) {
          tier = "TIER_C";
        }

        await prisma.membership.upsert({
          where: { userId },
          update: {
            plan: tier,
            status: "ACTIVE",
            maxFacilities: tierConfig[tier].maxFacilities,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
          create: {
            userId,
            plan: tier,
            status: "ACTIVE",
            maxFacilities: tierConfig[tier].maxFacilities,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
        });

        console.log("Membership activated:", userId);
        break;
      }

      // SUBSCRIPTION RENEWED
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        console.log("Invoice paid:", invoice.id);

        // optional: extend membership status
        break;
      }

      // SUBSCRIPTION CANCELED
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await prisma.membership.updateMany({
          where: {
            stripeSubscriptionId: sub.id,
          },
          data: {
            status: "CANCELED",
            plan: "NONE",
            maxFacilities: 0,
          },
        });

        console.log("Subscription canceled:", sub.id);
        break;
      }

      default:
        console.log("Unhandled event:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse("Webhook failed", { status: 500 });
  }
}