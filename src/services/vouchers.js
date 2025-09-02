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

export async function redeemVoucher(_code, refreshStats) {
  if (!hasSupabase || !supabase) return { success: false, message: 'Redeem service unavailable' };
  const { data, error } = await supabase.functions.invoke('voucher-redeem', { body: {} });
  const success = !error && (data?.success ?? false);
  if (success) {
    // Loyalty values change after redemption; bypass any cached stats
    await refreshStats?.(true);
    return { success: true };
  }
  return { success: false, message: 'No vouchers available' };
}
