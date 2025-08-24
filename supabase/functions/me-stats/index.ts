import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    console.log('Auth header', authHeader);
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
    console.log('Resolved userId', userId);

    const db = createClient(url, service, { auth: { persistSession: false } });

    const { data: sumRows, error: sumErr } = await db
      .from('loyalty_stamps')
      .select('sum(stamps)')
      .eq('user_id', userId);
    if (sumErr) throw sumErr;
    const totalStamps = Number(sumRows?.[0]?.sum ?? 0);
    const remainder = totalStamps % 8;

    const { data: voucherRows, error: vErr } = await db
      .from('drink_vouchers')
      .select('code')
      .eq('user_id', userId)
      .eq('redeemed', false)
      .order('created_at', { ascending: true });
    if (vErr) throw vErr;

    const vouchers = (voucherRows || []).map(v => v.code);
    const res = {
      loyaltyStamps: remainder,
      freebiesLeft: vouchers.length,
      vouchers,
    };

    return new Response(JSON.stringify(res), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('me-stats failure', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

