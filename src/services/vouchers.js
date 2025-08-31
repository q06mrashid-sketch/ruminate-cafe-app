import { supabase, hasSupabase } from '../lib/supabase';

export async function syncVouchers() {
  if (!hasSupabase || !supabase) {
    return [];
  }
  try {
    const { data } = await supabase.functions.invoke('vouchers-sync', { body: {} });
    return data?.vouchers ?? [];
  } catch {
    return [];
  }
}

export async function redeemVoucher(code, refreshStats) {
  if (!hasSupabase || !supabase) return false;
  const { data, error } = await supabase.functions.invoke('voucher-redeem', { body: { code } });
  if (error) return false;
  const success = data?.success ?? false;
  if (success && typeof refreshStats === 'function') {
    await refreshStats(true);
  }
  return success;
}
