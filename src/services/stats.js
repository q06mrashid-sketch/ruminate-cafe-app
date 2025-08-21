import { supabase, hasSupabase } from '../lib/supabase';

export async function getMyStats() {
  if (!hasSupabase || !supabase) {
    return {
      freebiesLeft: 0,
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
        freebiesLeft: 0,
        dividendsPending: 0,
        loyaltyStamps: 0,
        payItForwardContrib: 0,
        communityContrib: 0,
      };
    }
    const [
      { data: profile },
      { data: statsData, error: statsError },
      { count: voucherCount },
      { data: stampRows },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('free_drinks, discount_credits')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase.functions.invoke('me-stats', { body: {} }),
        supabase
          .from('drink_vouchers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .or('redeemed.eq.false,redeemed.is.null'),
      supabase
        .from('loyalty_stamps')
        .select('stamps')
        .eq('user_id', session.user.id),
    ]);


    const edgeStats = statsError ? {} : statsData || {};
    const freebiesLeft = (profile?.free_drinks ?? 0) + (voucherCount ?? 0);
    const dividendsPending = edgeStats.dividendsPending ?? 0;
    const loyaltyStamps =
      (edgeStats.loyaltyStamps ?? edgeStats.discountUses ?? 0) +
      (stampRows ?? []).reduce((sum, r) => sum + (r.stamps || 0), 0);
    const payItForwardContrib = edgeStats.payItForwardContrib ?? 0;
    const communityContrib = edgeStats.communityContrib ?? 0;
    const discountCredits = profile?.discount_credits ?? 0;

    const result = {
      freebiesLeft,
      dividendsPending,
      loyaltyStamps,
      payItForwardContrib,
      communityContrib,
      discountCredits,
    };
    globalThis.freebiesLeft = result.freebiesLeft;
    globalThis.loyaltyStamps = result.loyaltyStamps;
    return result;
  } catch {
    const result = {
      freebiesLeft: 0,
      dividendsPending: 0,
      loyaltyStamps: 0,
      payItForwardContrib: 0,
      communityContrib: 0,
      discountCredits: 0,
    };
    globalThis.freebiesLeft = result.freebiesLeft;
    globalThis.loyaltyStamps = result.loyaltyStamps;
    return result;
  }
}
