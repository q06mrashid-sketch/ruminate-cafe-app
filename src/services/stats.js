import { supabase, hasSupabase } from '../lib/supabase';

export async function getMyStats() {
  if (!hasSupabase || !supabase) {
    return {
      freebiesLeft: 3,
      dividendsPending: 0,
      loyaltyStamps: 0,
      payItForwardContrib: 0,
      communityContrib: 0,
    };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return {
        freebiesLeft: 3,
        dividendsPending: 0,
        loyaltyStamps: 0,
        payItForwardContrib: 0,
        communityContrib: 0,
      };
    }
    const { data, error } = await supabase.functions.invoke('me-stats', { body: {} });
    if (error) {
      return {
        freebiesLeft: 3,
        dividendsPending: 0,
        loyaltyStamps: 0,
        payItForwardContrib: 0,
        communityContrib: 0,
      };
    }
    return {
      freebiesLeft: data?.freebiesLeft ?? 3,
      dividendsPending: data?.dividendsPending ?? 0,
      loyaltyStamps: data?.loyaltyStamps ?? data?.discountUses ?? 0,
      payItForwardContrib: data?.payItForwardContrib ?? 0,
      communityContrib: data?.communityContrib ?? 0,
    };
  } catch {
    return {
      freebiesLeft: 3,
      dividendsPending: 0,
      loyaltyStamps: 0,
      payItForwardContrib: 0,
      communityContrib: 0,
    };
  }
}
