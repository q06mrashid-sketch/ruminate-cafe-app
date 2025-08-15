import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID")!;
const SB_URL = Deno.env.get("SB_URL")!;
const SB_ANON_KEY = Deno.env.get("SB_ANON_KEY")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,content-type",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  const authHeader = req.headers.get("Authorization") ?? "";
  const auth = createClient(SB_URL, SB_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors() });

  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  const { paymentMethodId } = await req.json().catch(() => ({})) as { paymentMethodId?: string };
  if (!paymentMethodId) return new Response("Missing paymentMethodId", { status: 400, headers: cors() });

  const { data: membership } = await admin.from("memberships").select("stripe_customer_id").eq("user_id", user.id).single();

  let customerId = membership?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
    await admin.from("memberships").upsert({ user_id: user.id, stripe_customer_id: customerId });
  }

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });

  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: STRIPE_PRICE_ID }],
    metadata: { user_id: user.id }
  });

  const nextBilling = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

  await admin.from("memberships").update({
    status: 'active',
    stripe_subscription_id: sub.id,
    started_at: new Date().toISOString(),
    next_billing_at: nextBilling
  }).eq("user_id", user.id);

  return new Response(JSON.stringify({ status: 'active', next_billing_at: nextBilling }), {
    headers: { ...cors(), "content-type": "application/json" }
  });
});
