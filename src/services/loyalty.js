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
    const res = await supabase.rpc('checkout_loyalty', {
      p_user,
      p_order_id,
      p_add_stamps,
      p_redeem,
    });
    if (res.data) {
      console.log(
        `[LOYALTY] awarding: +${p_add_stamps} stamp(s); new free drinks: ${res.data.free_drinks}; loyalty stamps: ${res.data.loyalty_stamps}`
      );
      console.assert(res.data.loyalty_stamps <= 7, 'loyalty_stamps exceeded 7');
    }
    return res;
  } catch (error) {
    return { data: null, error };
  }
}
