import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("CMS_SUPABASE_URL")!;
const SERVICE = Deno.env.get("CMS_SERVICE_ROLE")!;
const CMS_WRITE_SECRET = Deno.env.get("CMS_WRITE_SECRET")!;
const FUNCTIONS_BASE = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co");

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-cms-secret",
  "access-control-allow-methods": "GET, POST, OPTIONS, DELETE",
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...cors, ...(init.headers || {}) },
    status: init.status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (req.method !== "DELETE") {
      return json({ error: "method_not_allowed" }, { status: 405 });
    }

    const secret = req.headers.get("x-cms-secret") || "";
    if (secret !== CMS_WRITE_SECRET) {
      return json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get("key") || "";
    const key = rawKey.replace(/\/+$/, "");
    if (!key) throw new Error("Missing key");

    const supabase = createClient(SUPABASE_URL, SERVICE);
    const { error } = await supabase.from("cms_texts").delete().eq("key", key);
    if (error) throw error;

    const posSyncResponse = await fetch(`${FUNCTIONS_BASE}/pos-sync`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${SERVICE}`,
        apikey: SERVICE,
      },
      body: JSON.stringify({ action: "cms-delete", key }),
    });

    if (!posSyncResponse.ok) {
      const text = await posSyncResponse.text();
      throw new Error(`pos-sync failed: ${posSyncResponse.status} ${text}`);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[cms-del]", e);
    const message = e instanceof Error ? e.message : String(e);
    const status = message === "Missing key" ? 400 : 500;
    return json({ error: message }, { status });
  }
});
