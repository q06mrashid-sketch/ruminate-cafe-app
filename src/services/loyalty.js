import { supabase, hasSupabase } from '../lib/supabase.js';

export async function redeemLoyaltyReward() {
  if (!hasSupabase || !supabase) return false;
  try {
    const { data, error } = await supabase.functions.invoke('loyalty-redeem', { body: {} });
    if (error) return false;
    return data?.success ?? false;
  } catch {
    return false;
  }
}

export async function checkoutLoyalty(p_user, p_order_id, p_add_stamps, p_redeem) {
  if (!hasSupabase || !supabase) return { data: null, error: new Error('no supabase') };
  try {
    const { data: rawData, error } = await supabase
      .rpc('checkout_loyalty', {
        p_user,
        p_order_id,
        p_add_stamps,
        p_redeem,
      })
      .maybeSingle();
    const data = rawData ?? { loyalty_stamps: 0, free_drinks: 0 };
    if (!error) {
      console.log(
        `[LOYALTY] awarding: +${p_add_stamps} stamp(s); new free drinks: ${data.free_drinks}; loyalty stamps: ${data.loyalty_stamps}`
      );
      console.assert(data.loyalty_stamps <= 7, 'loyalty_stamps exceeded 7');
    }
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
