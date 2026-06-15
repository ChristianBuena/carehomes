import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { plan } = await req.json();

    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let priceId: string | undefined;

    switch (plan) {
      case "TIER_A":
        priceId = process.env.STRIPE_PRICE_A;
        break;
      case "TIER_B":
        priceId = process.env.STRIPE_PRICE_B;
        break;
      case "TIER_C":
        priceId = process.env.STRIPE_PRICE_C;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid plan selected" },
          { status: 400 }
        );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Plan configuration error" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      metadata: {
        userId: user.userId,
        priceId,
      },

      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
      },
      {
        status: 500,
      }
    );
  }
}