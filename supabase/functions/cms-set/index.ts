import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("CMS_SUPABASE_URL")!;
const SERVICE = Deno.env.get("CMS_SERVICE_ROLE")!;
const CMS_WRITE_SECRET = Deno.env.get("CMS_WRITE_SECRET")!;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-cms-secret",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const secret = req.headers.get("x-cms-secret") || "";
    if (secret !== CMS_WRITE_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json", ...cors } });
    }

    const body = await req.json();
    if (!body?.key || typeof body.key !== "string") throw new Error("Missing key");
    if (typeof body.value !== "string") throw new Error("Missing value");

    const supabase = createClient(SUPABASE_URL, SERVICE);
    const { error } = await supabase.from("cms_texts").upsert({ key: body.key, value: body.value, updated_at: new Date().toISOString() });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", ...cors } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { "content-type": "application/json", ...cors } });
  }
});
