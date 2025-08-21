import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SB_URL")!;
const SB_ANON_KEY = Deno.env.get("SB_ANON_KEY")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

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

  let body: any = {};
  try { body = await req.json(); } catch {}
  const desired = Math.max(0, parseInt(body?.freebiesLeft) || 0);

  const authHeader = req.headers.get("Authorization") ?? "";
  const auth = createClient(SB_URL, SB_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors() });

  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);
  const { data: existing } = await admin.from("vouchers").select("code").eq("user_id", user.id).eq("redeemed", false);
  const codes = existing?.map(r => r.code) ?? [];

  if (codes.length < desired) {
    const toCreate = desired - codes.length;
    const newCodes = Array.from({ length: toCreate }, () => crypto.randomUUID());
    const inserts = newCodes.map(code => ({ code, user_id: user.id }));
    await admin.from("vouchers").insert(inserts);
    codes.push(...newCodes);
  }

  return new Response(JSON.stringify({ codes }), { headers: { ...cors(), "content-type": "application/json" } });
});
