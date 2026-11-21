import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { stripeClient } from "@/integrations/stripe/client";
import { handleStripeEvent } from "@/modules/payments/webhook";

export const dynamic = "force-dynamic";

/**
 * Webhook Stripe : la signature est vérifiée sur le corps brut avant tout traitement.
 * 2xx = événement accepté (ou déjà traité) ; 4xx = signature invalide ; 5xx = Stripe réessaiera.
 */
export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Webhook Stripe : signature invalide");
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    const r = await handleStripeEvent(event);
    return NextResponse.json({ received: true, duplicate: r.duplicate });
  } catch (err) {
    logger.error({ err, eventId: event.id, type: event.type }, "Webhook Stripe : traitement en échec");
    return NextResponse.json({ error: "Traitement en échec" }, { status: 500 });
  }
}
