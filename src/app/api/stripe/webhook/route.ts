import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import Stripe from "stripe";

const tierConfig: Record<string, { maxFacilities: number; label: string; price: string }> = {
  TIER_A: { maxFacilities: 1, label: "Tier A", price: "$300/year" },
  TIER_B: { maxFacilities: 3, label: "Tier B", price: "$400/year" },
  TIER_C: { maxFacilities: 10, label: "Tier C", price: "$500/year" },
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

        // SEND CONFIRMATION EMAIL
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          });

          if (user) {
            const { label, price } = tierConfig[tier];

            await sendEmail({
              to: user.email,
              subject: "Your CareHomesSupportDocs.org Membership is Active!",
              text: `Hi ${user.name},\n\nThank you for subscribing! Your ${label} membership (${price}) is now active.\n\nYou can now log in to your dashboard to manage your facilities and rebuttals.\n\nhttps://carehomessupportdocs.org/dashboard\n\n— CareHomesSupportDocs Team`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
                  <div style="background: #1d3557; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">CareHomesSupportDocs</h1>
                  </div>
                  <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1d3557; margin-top: 0;">🎉 Membership Activated!</h2>
                    <p style="color: #374151;">Hi <strong>${user.name}</strong>,</p>
                    <p style="color: #374151;">Thank you for subscribing to CareHomesSupportDocs! Your membership is now <strong style="color: #16a34a;">ACTIVE</strong>.</p>
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 24px 0;">
                      <p style="margin: 0; color: #0369a1;"><strong>Plan:</strong> ${label}</p>
                      <p style="margin: 8px 0 0; color: #0369a1;"><strong>Price:</strong> ${price}</p>
                    </div>
                    <p style="color: #374151;">You can now log in to your dashboard to manage your facilities and submit rebuttals.</p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #1d3557; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                    </div>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">If you have any questions, please contact our support team.<br/>— CareHomesSupportDocs Team</p>
                  </div>
                </div>
              `,
            });

            console.log("Confirmation email sent to:", user.email);
          }
        } catch (emailError) {
          // Don't fail the webhook if email fails — membership is already activated
          console.error("Failed to send confirmation email:", emailError);
        }

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