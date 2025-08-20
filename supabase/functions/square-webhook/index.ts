import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
const getJson = async (req: Request) => { try { return await req.json(); } catch { return null; } };
serve(async (req) => {
  const body = await getJson(req);
  if (!body) return new Response("bad json", { status: 400 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")||"", Deno.env.get("SERVICE_ROLE_KEY")||"", { auth: { persistSession: false } });
  const pifPurchase = (Deno.env.get("PIF_PURCHASE_SKU")||"pif_purchase").toLowerCase();
  const pifRedeem   = (Deno.env.get("PIF_REDEEM_SKU")  ||"pif_redeem").toLowerCase();
  const order   = body?.data?.object?.order   || body?.order   || null;
  const payment = body?.data?.object?.payment || body?.payment || null;
  const external_id    = payment?.id || order?.id || crypto.randomUUID();
  const total_money    = payment?.amount_money?.amount ?? order?.total_money?.amount ?? 0;
  const currency       = payment?.amount_money?.currency ?? order?.total_money?.currency ?? "GBP";
  const customer_email = payment?.buyer_email_address ?? order?.customer_details?.email_address ?? null;
  const { data: ord } = await supabase.from("orders").upsert({ source: "square", external_id, total_cents: Number(total_money)||0, currency, customer_email }, { onConflict: "external_id" }).select("id").single();
  const order_id = ord?.id ?? null;
  const items = order?.line_items || [];
  let matchedPurchase=0, matchedRedeem=0; const errors:string[]=[];
  for (const it of items) {
    const rawSku  = String(it?.catalog_object_id || it?.variation_name || it?.item_type || "");
    const sku     = rawSku.toLowerCase();
    const name    = String(it?.name || "");
    const qty     = Number(it?.quantity) || 1;
    const amount  = Number(it?.gross_sales_money?.amount || it?.total_money?.amount || 0);
    const { error: eItem } = await supabase.from("order_items").insert({ order_id, sku: rawSku, name, qty, amount_cents: amount });
    if (eItem) errors.push(`order_items:${eItem.message}`);
    const isPurchase = sku.includes(pifPurchase);
    const isRedeem   = sku.includes(pifRedeem);
    if (isPurchase) { const { error: eP } = await supabase.from("pif_ledger").insert({ type: "purchase", count: qty, source_order_id: order_id }); if (eP) errors.push(`pif_purchase:${eP.message}`); else matchedPurchase += qty; }
    if (isRedeem)   { const { error: eR } = await supabase.from("pif_ledger").insert({ type: "redeem", count: qty, source_order_id: order_id });   if (eR) errors.push(`pif_redeem:${eR.message}`);   else matchedRedeem   += qty; }
  }
  const ok = errors.length===0;
  return new Response(JSON.stringify({ ok, matchedPurchase, matchedRedeem, errors }), { status: ok?200:207, headers:{ "content-type":"application/json" } });
});
