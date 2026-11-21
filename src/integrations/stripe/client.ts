import Stripe from "stripe";
import { env } from "@/lib/env";
import { NotConfiguredError } from "@/lib/errors";

let client: Stripe | null | undefined;

/** Client Stripe côté serveur uniquement. null si STRIPE_SECRET_KEY est absent. */
export function stripeClient(): Stripe | null {
  if (client !== undefined) return client;
  const key = env().STRIPE_SECRET_KEY;
  client = key ? new Stripe(key, { appInfo: { name: "QuickShipDeals" }, maxNetworkRetries: 2 }) : null;
  return client;
}

export function requireStripe(): Stripe {
  const s = stripeClient();
  if (!s) throw new NotConfiguredError("Le paiement Stripe");
  return s;
}

export function isStripeTestMode() {
  return env().STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;
}
