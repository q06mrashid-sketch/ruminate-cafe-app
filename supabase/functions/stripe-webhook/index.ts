import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "stripe-signature,content-type",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  const sig = req.headers.get("stripe-signature")!;
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook error: ${err}`, { status: 400, headers: cors() });
  }

  const db = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as any;
    const user_id = sub.metadata?.user_id as string | undefined;
    if (user_id) {
      const status = sub.status === "active" ? "active" : "canceled";
      const nextBilling = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      await db.from("memberships").update({ status, next_billing_at: nextBilling }).eq("user_id", user_id);
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as any;
    const amount = invoice.amount_paid as number;
    const now = new Date();
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0,10);
    await db.from("community_ledger").insert({
      month,
      source: "membership_fee",
      amount_cents: Math.round((amount ?? 0) * 0.60),
      meta: { invoice_id: invoice.id }
    });
  }

  return new Response("OK", { status: 200, headers: cors() });
});
