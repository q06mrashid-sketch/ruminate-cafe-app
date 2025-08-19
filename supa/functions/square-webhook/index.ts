import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const getJson = async (req: Request) => { try { return await req.json(); } catch { return null; } };

serve(async (req) => {
  const body = await getJson(req);
  if (!body) return new Response("bad json", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false } }
  );

  const pifSku = (Deno.env.get("PIF_ITEM_SKU") || "pif_drink").toLowerCase();

  const order = body?.data?.object?.order || body?.order || null;
  const payment = body?.data?.object?.payment || body?.payment || null;

  const external_id = payment?.id || order?.id || crypto.randomUUID();
  const total_money = payment?.amount_money?.amount ?? order?.total_money?.amount ?? 0;
  const currency = payment?.amount_money?.currency ?? order?.total_money?.currency ?? "GBP";
  const customer_email = payment?.buyer_email_address ?? order?.customer_details?.email_address ?? null;

  const { data: ord } = await supabase
    .from("orders")
    .upsert({ source: "square", external_id, total_cents: Number(total_money)||0, currency, customer_email }, { onConflict: "external_id" })
    .select("id")
    .single();

  const order_id = ord?.id;
  const items = order?.line_items || [];

  for (const it of items) {
    const sku = String(it?.catalog_object_id || it?.variation_name || it?.item_type || "").toLowerCase();
    const name = it?.name || it?.variation_name || "item";
    const qty = Number(it?.quantity) || 1;
    const amount = Number(it?.gross_sales_money?.amount || it?.total_money?.amount || 0);

    await supabase.from("order_items").insert({ order_id, sku, name, qty, amount_cents: amount });
    if (sku.includes(pifSku)) {
      await supabase.from("pif_ledger").insert({ type: "purchase", count: qty, source_order_id: order_id });
    }
  }

  return new Response("ok", { status: 200 });
});
