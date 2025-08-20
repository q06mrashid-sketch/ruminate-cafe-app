import { supabase, hasSupabase } from '../lib/supabase';

export async function createReferral(referrerId, code) {
  if (!code) return null;
  if (hasSupabase && supabase) {
    try {
      await supabase.from('referrals').insert({ code, referrer: referrerId });
    } catch {}
  }
  return code;
}

export async function redeemReferral(code, userId) {
  if (!code) return;
  if (hasSupabase && supabase) {
    try {
      await supabase.rpc('redeem_referral', { p_code: code, p_referred: userId });
    } catch {
      try {
        await supabase.from('referrals').update({ referred: userId }).eq('code', code);
      } catch {}
    }
  }
}
