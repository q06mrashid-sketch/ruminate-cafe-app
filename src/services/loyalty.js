import { supabase, hasSupabase } from '../lib/supabase';

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
    return await supabase.rpc('checkout_loyalty', {
      p_user,
      p_order_id,
      p_add_stamps,
      p_redeem,
    });
  } catch (error) {
    return { data: null, error };
  }
}
