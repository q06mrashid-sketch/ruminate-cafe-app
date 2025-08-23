import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  const authHeader = req.headers.get("Authorization") ?? "";
  const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors() });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { count: totalStamps = 0 } = await admin
    .from("loyalty_stamps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: vouchersTotal = 0 } = await admin
    .from("drink_vouchers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: vouchersUnredeemed = 0 } = await admin
    .from("drink_vouchers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("redeemed", false);

  const shouldExist = Math.floor(totalStamps / 8);
  const toMint = Math.max(0, shouldExist - vouchersTotal);
  if (toMint > 0) {
    const inserts = Array.from({ length: toMint }, () => ({
      user_id: user.id,
      code: crypto.randomUUID(),
    }));
    await admin.from("drink_vouchers").upsert(inserts, { onConflict: "code" });
  }

  const remainder = totalStamps - shouldExist * 8;

  return new Response(
    JSON.stringify({
      freebiesLeft: (vouchersUnredeemed ?? 0) + toMint,
      dividendsPending: 0,
      loyaltyStamps: remainder,
      payItForwardContrib: 0,
      communityContrib: 0,
    }),
    { headers: { ...cors(), "content-type": "application/json" } }
  );
});
