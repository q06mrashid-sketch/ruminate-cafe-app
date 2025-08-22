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
