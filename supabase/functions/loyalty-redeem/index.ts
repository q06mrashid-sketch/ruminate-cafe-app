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
  const { data: stampRows } = await admin
    .from("loyalty_stamps")
    .select("id, stamps")
    .eq("user_id", user.id);
  const total = (stampRows ?? []).reduce((sum, r) => sum + (r.stamps || 0), 0);
  if (total < 8) {
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...cors(), "content-type": "application/json" },
    });
  }

  const remaining = total - 8;
  await admin.from("loyalty_stamps").delete().eq("user_id", user.id);
  if (remaining > 0) {
    await admin.from("loyalty_stamps").insert({ user_id: user.id, stamps: remaining });
  }

  const code = crypto.randomUUID();
  await admin.from("drink_vouchers").insert({ user_id: user.id, code });

  const { data: profile } = await admin
    .from("profiles")
    .select("free_drinks")
    .eq("user_id", user.id)
    .maybeSingle();
  const freeDrinks = (profile?.free_drinks ?? 0) + 1;
  await admin.from("profiles").upsert({ user_id: user.id, free_drinks: freeDrinks });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors(), "content-type": "application/json" },
  });
});
