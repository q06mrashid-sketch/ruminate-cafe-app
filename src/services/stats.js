import { supabase, hasSupabase } from '../lib/supabase';

export async function getMyStats() {
  if (!hasSupabase) {
    return { freebiesLeft: 0, dividendsPending: 0, discountUses: 0, payItForwardContrib: 0, communityContrib: 0 };
  }
  const { data, error } = await supabase.functions.invoke('me-stats', { body: {} });
  if (error) return { freebiesLeft: 0, dividendsPending: 0, discountUses: 0, payItForwardContrib: 0, communityContrib: 0 };
  return {
    freebiesLeft: data?.freebiesLeft ?? 0,
    dividendsPending: data?.dividendsPending ?? 0,
    discountUses: data?.discountUses ?? 0,
    payItForwardContrib: data?.payItForwardContrib ?? 0,
    communityContrib: data?.communityContrib ?? 0,
  };
}
