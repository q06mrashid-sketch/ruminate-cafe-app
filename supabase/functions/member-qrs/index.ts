import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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

  const { member_uuid } = await req.json().catch(() => ({}));
  if (!member_uuid) {
    return new Response(JSON.stringify({ error: "member_uuid required" }), {
      status: 400,
      headers: { ...cors(), "content-type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile } = await admin
    .from("profiles")
    .select("free_drinks")
    .eq("user_id", member_uuid)
    .maybeSingle();

  const count = Number(profile?.free_drinks ?? 0);
  const vouchers = Array.from({ length: count }, () => `ruminate:voucher:${crypto.randomUUID()}`);

  return new Response(
    JSON.stringify({
      payload: `ruminate:member:${member_uuid}`,
      vouchers,
    }),
    { headers: { ...cors(), "content-type": "application/json" } }
  );
});
