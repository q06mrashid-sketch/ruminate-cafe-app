import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.from("pif_stats").select("*").single();
  if (error) return new Response(JSON.stringify({ available: 0, purchases: 0, redeems: 0 }), { status: 200, headers: { "content-type": "application/json" } });

  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
});
