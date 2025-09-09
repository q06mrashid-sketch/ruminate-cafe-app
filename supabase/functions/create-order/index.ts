import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MENU,
  SYRUP_PRICE,
  PIF_PRICE,
  VOUCHER_VALUE,
  calculateOrderTotals,
} from "./calc.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,content-type",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  const authHeader = req.headers.get("Authorization") ?? "";
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors() });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const items = Array.isArray(body.items) ? body.items : [];
  const syrupShots = Number(body.syrupShots) || 0;
  const payItForward = Number(body.payItForward) || 0;
  const voucherCodes: string[] = Array.isArray(body.voucherCodes) ? body.voucherCodes : [];
  const redeemCount = voucherCodes.length;
  const timeslot = typeof body.timeslot === "string" ? body.timeslot : null;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: membership } = await admin
    .from("memberships")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("free_drinks")
    .eq("user_id", user.id)
    .maybeSingle();
  const membershipTier = membership?.status === "active" ? "paid" : "free";
  const freebies = Number(profile?.free_drinks ?? 0);

  let total: number;
  let hotCount: number;
  try {
    ({ total, hotCount } = calculateOrderTotals({
      items,
      syrupShots,
      payItForward,
      redeemCount,
      membershipTier,
      freebies,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...cors(), "content-type": "application/json" } });
  }

  let pickup_code = "";
  while (true) {
    pickup_code = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const { data: existing } = await admin.from("orders").select("id").eq("pickup_code", pickup_code).maybeSingle();
    if (!existing) break;
  }

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      total_cents: total,
      pickup_code,
      timeslot,
      source: 'app',
      source_meta: null,
      channel: 'click_and_collect',
    })
    .select("id")
    .single();
  if (orderErr) {
    return new Response(JSON.stringify({ error: orderErr.message }), { status: 400, headers: { ...cors(), "content-type": "application/json" } });
  }
  const orderId = order.id;

  for (const it of items) {
    const sku = String(it.sku);
    const qty = Number(it.qty) || 0;
    const def = MENU[sku];
    const amount = def.price * qty;
    await admin.from("order_items").insert({ order_id: orderId, sku, name: sku, qty, amount_cents: amount });
  }

  if (syrupShots > 0) {
    await admin.from("order_items").insert({
      order_id: orderId,
      sku: "syrup_shot",
      name: "Syrup shot",
      qty: syrupShots,
      amount_cents: SYRUP_PRICE * syrupShots,
    });
  }

  if (payItForward > 0) {
    await admin.from("order_items").insert({
      order_id: orderId,
      sku: "pif_purchase",
      name: "Pay It Forward",
      qty: payItForward,
      amount_cents: PIF_PRICE * payItForward,
    });
    await admin.from("pif_ledger").insert({ type: "purchase", count: payItForward, source_order_id: orderId });
  }

  if (hotCount > 0 || redeemCount > 0) {
    await admin.rpc("checkout_loyalty", {
      p_user: user.id,
      p_order_id: orderId,
      p_add_stamps: hotCount,
      p_redeem: redeemCount,
    });
  }

  return new Response(JSON.stringify({ orderId, pickup_code, total_cents: total }), {
    status: 200,
    headers: { ...cors(), "content-type": "application/json" },
  });
});
