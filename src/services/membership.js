import { supabase, hasSupabase } from '../lib/supabase';

export async function getMembershipSummary() {
  if (!hasSupabase || !supabase) {
    return { signedIn: false, tier: 'free', status: 'none', next_billing_at: null };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      return { signedIn: false, tier: 'free', status: 'none', next_billing_at: null };
    }

    const meta = session.user.user_metadata || {};
    const tier = meta.tier === 'paid' ? 'paid' : 'free';
    const status = tier === 'paid' ? 'active' : 'none';

    // If you later store billing info in user metadata or a profile table,
    // surface it here. For now, leave next_billing_at null.
    return {
      signedIn: true,
      tier,
      status,
      next_billing_at: null,
    };
  } catch {
    return { signedIn: false, tier: 'free', status: 'none', next_billing_at: null };
  }
}


export async function signOut() {
  if (!hasSupabase || !supabase) return;
  try { await supabase.auth.signOut(); } catch {}
}
