import { supabase, hasSupabase } from '../lib/supabase';

export async function getSessionUser() {
  if (!hasSupabase) return { signedIn: false, user: null };
  const { data: { session } } = await supabase.auth.getSession();
  return { signedIn: !!session, user: session?.user ?? null };
}

export async function getMembershipSummary() {
  const { signedIn, user } = await getSessionUser();
  if (!signedIn || !user) return { signedIn: false, status: 'none', tier: 'free', next_billing_at: null };

  const uid = user.id;
  const [{ data: prof }, { data: sub }] = await Promise.all([
    supabase.from('profiles').select('tier').eq('user_id', uid).maybeSingle(),
    supabase.from('subscriptions').select('status,current_period_end').eq('user_id', uid).maybeSingle(),
  ]);

  const tier = prof?.tier ?? 'free';
  const active = sub && ['active', 'trialing'].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  return {
    signedIn: true,
    tier,
    status: active ? 'active' : 'none',
    next_billing_at: sub?.current_period_end ?? null,
  };
}
