import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")||"", Deno.env.get("SERVICE_ROLE_KEY")||"", { auth: { persistSession: false } });
  const { data: items }  = await supabase.from("order_items").select("created_at, sku, name, qty, amount_cents").order("created_at",{ascending:false}).limit(10);
  const { data: ledger } = await supabase.from("pif_ledger").select("created_at, type, count").order("created_at",{ascending:false}).limit(10);
  const { data: stats }  = await supabase.from("pif_stats").select("*").single();
  return new Response(JSON.stringify({ items: items||[], ledger: ledger||[], stats: stats||{} }), { status:200, headers:{ "content-type":"application/json" } });
});
