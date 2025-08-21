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
    const [{ data: profile }, { data, error }] = await Promise.all([
      supabase.from('profiles').select('free_drinks, discount_credits').eq('user_id', session.user.id).maybeSingle(),
      supabase.functions.invoke('me-stats', { body: {} })
    ]);

    let freebiesLeft = profile?.free_drinks ?? 0;
    let dividendsPending = 0;
    let loyaltyStamps = 0;
    let payItForwardContrib = 0;
    let communityContrib = 0;
    const discountCredits = profile?.discount_credits ?? 0;

    if (!error && data) {
      freebiesLeft += data.freebiesLeft ?? 0;
      dividendsPending = data.dividendsPending ?? 0;
      loyaltyStamps = data.loyaltyStamps ?? data.discountUses ?? 0;
      payItForwardContrib = data.payItForwardContrib ?? 0;
      communityContrib = data.communityContrib ?? 0;
    } else {
      try {
        const [{ count: voucherCount }, { data: stampRows }] = await Promise.all([
          supabase
            .from('drink_vouchers')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('redeemed', false),
          supabase
            .from('loyalty_stamps')
            .select('stamps')
            .eq('user_id', session.user.id)
        ]);
        freebiesLeft += voucherCount ?? 0;
        loyaltyStamps = (stampRows ?? []).reduce((sum, r) => sum + (r.stamps || 0), 0);
      } catch {}
    }

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
