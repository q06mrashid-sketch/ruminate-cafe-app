import { serve } from "https://deno.land/std@0.209.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== Deno.env.get("SEED_FN_TOKEN")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { email, password = "Passw0rd!", tier = "paid", status = "active", days = 30, price_id = "price_test" } = await req.json();
  if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const userRes = await supabase.auth.admin.getUserByEmail(email);
  let user = userRes.data?.user;
  if (!user) {
    const c = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (c.error) return new Response(JSON.stringify({ error: c.error.message }), { status: 500 });
    user = c.data.user;
  }

  const prof = await supabase.from("profiles").upsert({ user_id: user!.id, email, tier }).select().single();
  if (prof.error) return new Response(JSON.stringify({ error: prof.error.message }), { status: 500 });

  const current_period_end = new Date(Date.now() + Number(days) * 864e5).toISOString();
  const sub = await supabase.from("subscriptions").upsert({
    user_id: user!.id,
    stripe_customer_id: "cus_test",
    price_id,
    status,
    current_period_end,
  }, { onConflict: "user_id" }).select().single();
  if (sub.error) return new Response(JSON.stringify({ error: sub.error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true, user_id: user!.id, tier, status, current_period_end }), {
    headers: { "content-type": "application/json" },
  });
});
