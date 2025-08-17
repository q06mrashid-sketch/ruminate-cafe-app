import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("CMS_SUPABASE_URL")!;
const ANON = Deno.env.get("CMS_SUPABASE_ANON")!;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, ANON);
    const { data, error } = await supabase.from("cms_texts").select("key,value");
    if (error) throw error;

    const out: Record<string, string> = {};
    for (const row of data || []) out[row.key] = row.value;

    return new Response(JSON.stringify(out), { headers: { "content-type": "application/json", ...cors } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "content-type": "application/json", ...cors } });
  }
});
