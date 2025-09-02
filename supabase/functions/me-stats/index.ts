import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401 });
    }

    const supabaseAnon = createClient(url, anon);
    const { data: auth, error: authErr } = await supabaseAnon.auth.getUser(token);
    if (authErr || !auth?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const userId = auth.user.id;

    const db = createClient(url, service, { auth: { persistSession: false } });

    // Determine profiles primary key (id vs user_id)
    let pk = 'id';
    const { error: userIdErr } = await db
      .from('profiles')
      .select('user_id')
      .limit(1);
    if (!userIdErr) {
      pk = 'user_id';
    } else {
      const { error: idErr } = await db.from('profiles').select('id').limit(1);
      if (idErr) throw idErr;
    }

    // Fetch current rewards from profile
    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('loyalty_stamps, free_drinks')
      .eq(pk, userId)
      .single();
    if (profileErr) throw profileErr;

    const loyaltyStamps = Number(profile?.loyalty_stamps ?? 0);
    const vouchers = Number(profile?.free_drinks ?? 0);

    return new Response(JSON.stringify({ loyaltyStamps, vouchers }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('me-stats failure', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

