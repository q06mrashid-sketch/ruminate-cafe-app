import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function clientForRequest(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
    auth: { persistSession: false }
  });
}

Deno.serve(async (req) => {
  try {
    console.log('Auth header', req.headers.get('authorization'));
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401 });
    }

    const supabase = clientForRequest(req);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const userId = user.id;
    console.log('Resolved userId', userId);

    const { data: stampRows, error: stampsErr } = await supabase
      .from('loyalty_stamps')
      .select('stamps')
      .eq('user_id', userId);
    if (stampsErr) throw stampsErr;
    const totalStamps = (stampRows || []).reduce((s, r) => s + Number(r.stamps || 0), 0);
    const remainder = totalStamps % 8;

    const { data: vouchersRows, error: vErr } = await supabase
      .from('drink_vouchers')
      .select('code, redeemed')
      .eq('user_id', userId)
      .eq('redeemed', false)
      .order('created_at', { ascending: true });
    if (vErr) throw vErr;

    const vouchers = (vouchersRows || []).map(v => v.code);

    return new Response(
      JSON.stringify({ loyaltyStamps: remainder, freebiesLeft: vouchers.length, vouchers }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (e) {
    console.error('me-stats failure', e);

    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

