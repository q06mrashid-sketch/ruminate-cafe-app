import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  const db = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  const now = new Date();
  const monthKey = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0,10);

  const { data: goalRow } = await db.from("community_monthly").select("goal_cents").eq("month", monthKey).maybeSingle();
  const { data: totalRows } = await db.from("community_ledger").select("amount_cents").eq("month", monthKey);

  const total_cents = (totalRows ?? []).reduce((s, r: any) => s + (r.amount_cents ?? 0), 0);
  const goal_cents = goalRow?.goal_cents ?? 0;

  return new Response(JSON.stringify({ month: monthKey, total_cents, goal_cents }), {
    headers: { ...cors(), "content-type": "application/json" }
  });
});
