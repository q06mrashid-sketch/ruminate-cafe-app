import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeRewards } from '../_shared/rewards.ts';

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
    const stats = await normalizeRewards(db, userId);

    return new Response(JSON.stringify(stats), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('me-stats failure', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

