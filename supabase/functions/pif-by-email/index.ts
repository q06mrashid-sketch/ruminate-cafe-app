import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
serve(async (req) => {
  const u = new URL(req.url);
  const email = String(u.searchParams.get("email")||"").trim().toLowerCase();
  if (!email) return new Response(JSON.stringify({ total_cents:0, count:0 }), { status:200, headers:{ "content-type":"application/json" } });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")||"", Deno.env.get("SERVICE_ROLE_KEY")||"", { auth: { persistSession: false } });
  const pifPurchase = (Deno.env.get("PIF_PURCHASE_SKU")||"pif_purchase").toLowerCase();
  const { data, error } = await supabase
    .from("order_items")
    .select("amount_cents, qty, sku, name, orders!inner(customer_email)")
    .eq("orders.customer_email", email)
    .limit(2000);
  if (error) return new Response(JSON.stringify({ total_cents:0, count:0 }), { status:200, headers:{ "content-type":"application/json" } });
  let total=0, count=0;
  for (const it of data||[]) {
    const sku=String(it.sku||"").toLowerCase();
    const name=String(it.name||"").toLowerCase();
    const isPurchase = sku.includes(pifPurchase) || name.includes(pifPurchase);
    if (isPurchase) { total += Number(it.amount_cents)||0; count += Number(it.qty)||0; }
  }
  return new Response(JSON.stringify({ total_cents: total, count }), { status:200, headers:{ "content-type":"application/json" } });
});
