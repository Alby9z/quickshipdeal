import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import Stripe from "stripe";
import { resetDb, makePendingOrder, checkoutCompletedEvent } from "./helpers";

const SECRET = "whsec_test_only_not_a_real_secret";

describe("route webhook Stripe : vérification de signature", () => {
  let POST: (req: Request) => Promise<Response>;
  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder_for_signature_tests";
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    ({ POST } = await import("@/app/api/webhooks/stripe/route"));
  });
  beforeEach(resetDb);

  const req = (body: string, sig?: string) => new Request("http://localhost/api/webhooks/stripe", { method: "POST", body, headers: sig ? { "stripe-signature": sig } : {} });

  it("rejette une requête sans signature", async () => {
    expect((await POST(req("{}"))).status).toBe(400);
  });

  it("rejette une signature invalide", async () => {
    expect((await POST(req("{}", "t=1,v1=deadbeef"))).status).toBe(400);
  });

  it("accepte une signature valide et traite l'événement", async () => {
    const { order } = await makePendingOrder({ quantity: 1 });
    const payload = JSON.stringify(checkoutCompletedEvent(order, "evt_signed"));
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const res = await POST(req(payload, header));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, duplicate: false });
  });
});
