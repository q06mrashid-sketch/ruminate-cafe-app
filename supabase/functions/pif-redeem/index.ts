import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
serve(async (req) => {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const allow = token && token === (Deno.env.get("PIF_ADMIN_TOKEN") || "");
  if (!allow) return new Response("unauthorized", { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const count = Math.max(1, parseInt(body?.count ?? 1, 10) || 1);
  const staff_id = body?.staff_id ?? null;
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } });
  await supabase.from("pif_ledger").insert({ type: "redeem", count, staff_id });
  const { data } = await supabase.from("pif_stats").select("*").single();
  return new Response(JSON.stringify(data || { available: 0, purchases: 0, redeems: 0 }), { status: 200, headers: { "content-type": "application/json" } });
});
