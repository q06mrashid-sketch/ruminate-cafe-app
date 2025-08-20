import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SB_URL")!;
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

  const { member_uuid } = await req.json().catch(() => ({}));
  if (!member_uuid) {
    return new Response(JSON.stringify({ error: "member_uuid required" }), {
      status: 400,
      headers: { ...cors(), "content-type": "application/json" },
    });
  }

  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);
  const { data: profile } = await admin.from("profiles").select("tier").eq("user_id", member_uuid).maybeSingle();
  const { data: membership } = await admin.from("memberships").select("status,next_billing_at").eq("user_id", member_uuid).maybeSingle();

  return new Response(
    JSON.stringify({
      member_uuid,
      tier: profile?.tier ?? "free",
      status: membership?.status ?? "none",
      next_billing_at: membership?.next_billing_at ?? null,
    }),
    { headers: { ...cors(), "content-type": "application/json" } }
  );
});
