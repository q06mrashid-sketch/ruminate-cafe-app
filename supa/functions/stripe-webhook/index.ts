import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@12.18.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

serve(async (req) => {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") || "", { apiVersion: "2024-06-20" });
  let event;
  try { event = stripe.webhooks.constructEvent(raw, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""); }
  catch { return new Response("bad sig", { status: 400 }); }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false } }
  );

  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
    const data: any = event.data.object;
    const amount_cents = Number(data.amount_total || data.amount_paid || 0);
    const add = Math.round(amount_cents * 0.60);
    const now = new Date();
    const ym = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);

    const { data: row } = await supabase
      .from("community_monthly_totals")
      .select("from_memberships_cents")
      .eq("year_month", ym)
      .maybeSingle();

    const newVal = (Number(row?.from_memberships_cents) || 0) + add;

    await supabase
      .from("community_monthly_totals")
      .upsert({ year_month: ym, from_memberships_cents: newVal }, { onConflict: "year_month" });
  }

  return new Response("ok", { status: 200 });
});
