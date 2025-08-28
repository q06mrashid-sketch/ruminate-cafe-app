import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNCTIONS_URL = Deno.env.get("FUNCTIONS_URL")!;

type MenuItem = { price: number; hot: boolean };
const MENU: Record<string, MenuItem> = {
  latte: { price: 350, hot: true },
  cappuccino: { price: 350, hot: true },
  americano: { price: 300, hot: true },
  tea: { price: 250, hot: true },
  iced_latte: { price: 400, hot: false },
};

const SYRUP_PRICE = 50;
const PIF_PRICE = 300;
const VOUCHER_VALUE = 300;

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
  const timeslot = typeof body.timeslot === "string" ? body.timeslot : null;

  let total = 0;
  let hotCount = 0;
  for (const it of items) {
    const sku = String(it?.sku || "");
    const qty = Number(it?.qty) || 0;
    const def = MENU[sku];
    if (!def) {
      return new Response(JSON.stringify({ error: `invalid item ${sku}` }), { status: 400, headers: { ...cors(), "content-type": "application/json" } });
    }
    total += def.price * qty;
    if (def.hot) hotCount += qty;
  }

  total += SYRUP_PRICE * syrupShots;
  total += PIF_PRICE * payItForward;

  for (const code of voucherCodes) {
    const res = await fetch(`${FUNCTIONS_URL}/voucher-redeem`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ code }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.success) {
      return new Response(JSON.stringify({ error: `voucher ${code} failed` }), { status: 400, headers: { ...cors(), "content-type": "application/json" } });
    }
  }

  total -= VOUCHER_VALUE * voucherCodes.length;
  if (total < 0) total = 0;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let collection_code = "";
  while (true) {
    collection_code = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const { data: existing } = await admin.from("orders").select("id").eq("collection_code", collection_code).maybeSingle();
    if (!existing) break;
  }

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      total_cents: total,
      collection_code,
      timeslot,
      source: 'app',
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

  if (hotCount > 0) {
    await admin.from("loyalty_stamps").insert({ user_id: user.id, stamps: hotCount });
  }

  return new Response(JSON.stringify({ orderId, collection_code, total_cents: total }), {
    status: 200,
    headers: { ...cors(), "content-type": "application/json" },
  });
});
