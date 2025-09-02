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

  let pk = "id";
  const { error: userIdColErr } = await admin.from("profiles").select("user_id").limit(1);
  if (!userIdColErr) {
    pk = "user_id";
  } else {
    const { error: idColErr } = await admin.from("profiles").select("id").limit(1);
    if (idColErr) throw idColErr;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("free_drinks")
    .eq(pk, user.id)
    .single();

  const freebies = profile?.free_drinks ?? 0;
  if (freebies <= 0) {
    return new Response(JSON.stringify({ success: false }), {
      status: 400,
      headers: { ...cors(), "content-type": "application/json" },
    });
  }

  await admin
    .from("profiles")
    .update({ free_drinks: freebies - 1 })
    .eq(pk, user.id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors(), "content-type": "application/json" },
  });
});
