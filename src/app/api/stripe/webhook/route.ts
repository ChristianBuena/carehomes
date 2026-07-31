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

// Helper to get the first user of a membership's organization for email notifications
async function getMembershipUser(stripeSubscriptionId: string) {
  const membership = await prisma.membership.findFirst({
    where: { stripeSubscriptionId },
    include: {
      organization: {
        include: {
          users: {
            take: 1, // Get the primary user
          },
        },
      },
    },
  });
  return membership?.organization?.users[0];
}

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
      // 1. PAYMENT SUCCESS → ACTIVATE OR RENEW SUBSCRIPTION
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const orgId = session.metadata?.orgId;
        const priceId = session.metadata?.priceId;

        if (!orgId || !priceId) {
          console.error("Missing metadata in checkout session");
          return NextResponse.json({ received: true });
        }

        let tier: "TIER_A" | "TIER_B" | "TIER_C" = "TIER_A";

        if (priceId === process.env.STRIPE_PRICE_B) {
          tier = "TIER_B";
        } else if (priceId === process.env.STRIPE_PRICE_C) {
          tier = "TIER_C";
        }

        // Get subscription details for dates
        let endDate: Date | undefined;
        let nextBillingDate: Date | undefined;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          endDate = new Date((subscription as any).current_period_end * 1000);
          nextBillingDate = endDate;
        }

        await prisma.membership.upsert({
          where: { organizationId: orgId },
          update: {
            plan: tier,
            status: "ACTIVE",
            maxFacilities: tierConfig[tier].maxFacilities,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            endDate,
            nextBillingDate,
          },
          create: {
            organizationId: orgId,
            plan: tier,
            status: "ACTIVE",
            maxFacilities: tierConfig[tier].maxFacilities,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            startDate: new Date(),
            endDate,
            nextBillingDate,
          },
        });

        console.log("Membership activated for org:", orgId);

        // SEND CONFIRMATION EMAIL
        try {
          const user = await prisma.user.findFirst({
            where: { organizationId: orgId },
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
          }
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
        }

        break;
      }

      // 2. SUBSCRIPTION RENEWED (invoice paid successfully)
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (!subscriptionId) break;

        console.log("Invoice paid successfully for subscription:", subscriptionId);

        // Fetch subscription to get the accurate updated period end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const endDate = new Date((subscription as any).current_period_end * 1000);

        await prisma.membership.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: "ACTIVE", // reset to active if it was past due
            endDate,
            nextBillingDate: endDate,
          },
        });

        // Only send renewal emails for actual cycle renewals, not the first checkout payment
        if (invoice.billing_reason === "subscription_cycle") {
          const user = await getMembershipUser(subscriptionId);
          if (user) {
            await sendEmail({
              to: user.email,
              subject: "Your Membership Has Renewed",
              text: `Hi ${user.name},\n\nYour membership has successfully renewed. Your next billing date is ${endDate.toLocaleDateString()}.\n\nThank you for using CareHomesSupportDocs!`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
                  <h2>Membership Renewed!</h2>
                  <p>Hi <strong>${user.name}</strong>,</p>
                  <p>Your subscription has been successfully renewed.</p>
                  <p><strong>Next Billing Date:</strong> ${endDate.toLocaleDateString()}</p>
                  <p>Thank you for continuing to use CareHomesSupportDocs!</p>
                </div>
              `,
            });
          }
        }
        break;
      }

      // 3. SUBSCRIPTION PAYMENT FAILED
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (!subscriptionId) break;

        console.log("Invoice payment failed for subscription:", subscriptionId);

        await prisma.membership.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: "PAST_DUE",
          },
        });

        const user = await getMembershipUser(subscriptionId);
        if (user) {
          const isGracePeriod = invoice.attempt_count > 1;
          const subject = isGracePeriod
            ? "Final Warning: Membership Payment Failed"
            : "Action Required: Membership Payment Failed";

          await sendEmail({
            to: user.email,
            subject,
            text: `Hi ${user.name},\n\nWe were unable to process your most recent membership payment.\n\nPlease update your billing information to avoid losing access to your facilities and features.\n\nhttps://carehomessupportdocs.org/dashboard\n\n— CareHomesSupportDocs Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #dc2626;">Payment Failed</h2>
                <p>Hi <strong>${user.name}</strong>,</p>
                <p>We were unable to process your recent membership payment. Your account is now marked as <strong>Past Due</strong>.</p>
                ${isGracePeriod ? "<p><strong>This is a final warning. Your subscription will be canceled soon if payment is not resolved.</strong></p>" : ""}
                <p>Please log in to your dashboard to update your billing information and keep your account active.</p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #dc2626; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Update Billing Info</a>
                </div>
              </div>
            `,
          });
        }
        break;
      }

      // 4. UPCOMING INVOICE (3-day reminder)
      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (!subscriptionId) break;

        const user = await getMembershipUser(subscriptionId);
        if (user) {
          const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format((invoice.amount_due || 0) / 100);
          const nextDate = new Date(invoice.next_payment_attempt ? invoice.next_payment_attempt * 1000 : (invoice.period_end * 1000));

          await sendEmail({
            to: user.email,
            subject: "Upcoming Membership Renewal",
            text: `Hi ${user.name},\n\nThis is a quick reminder that your membership will automatically renew on ${nextDate.toLocaleDateString()} for ${amount}.\n\nNo action is required if you wish to keep your membership active.\n\n— CareHomesSupportDocs Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
                <h2>Upcoming Renewal</h2>
                <p>Hi <strong>${user.name}</strong>,</p>
                <p>Your membership is scheduled to automatically renew soon.</p>
                <ul>
                  <li><strong>Renewal Date:</strong> ${nextDate.toLocaleDateString()}</li>
                  <li><strong>Amount:</strong> ${amount}</li>
                </ul>
                <p>If you need to make changes, please visit your dashboard.</p>
              </div>
            `,
          });
        }
        break;
      }

      // 5. SUBSCRIPTION CANCELED
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

        const user = await getMembershipUser(sub.id);
        if (user) {
          await sendEmail({
            to: user.email,
            subject: "Your Membership Has Been Canceled",
            text: `Hi ${user.name},\n\nYour CareHomesSupportDocs membership has been canceled.\n\nYou will no longer have premium access to your claimed facilities. You can always reactivate your membership from the dashboard.\n\n— CareHomesSupportDocs Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
                <h2>Membership Canceled</h2>
                <p>Hi <strong>${user.name}</strong>,</p>
                <p>Your membership has been successfully canceled.</p>
                <p>You no longer have premium access to your facilities. If you change your mind, you can re-subscribe at any time from your dashboard.</p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="background: #1d3557; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Plans</a>
                </div>
              </div>
            `,
          });
        }
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