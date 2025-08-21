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

  let body: any = {};
  try { body = await req.json(); } catch {}
  const code = body?.code as string | undefined;
  if (!code) {
    return new Response(JSON.stringify({ success: false, error: "code required" }), { status: 400, headers: { ...cors(), "content-type": "application/json" } });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await admin
    .from("drink_vouchers")
    .update({ redeemed: true, redeemed_at: new Date().toISOString() })
    .eq("code", code)
    .eq("user_id", user.id)
    .eq("redeemed", false);

  const success = !error;
  return new Response(JSON.stringify({ success }), { status: success ? 200 : 400, headers: { ...cors(), "content-type": "application/json" } });
});
