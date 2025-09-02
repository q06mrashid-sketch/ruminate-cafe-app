import { supabase, hasSupabase } from '../lib/supabase';

export async function syncVouchers() {
  if (!hasSupabase || !supabase) {
    return 0;
  }
  try {
    const { data } = await supabase.functions.invoke('vouchers-sync', { body: {} });
    return Number(data?.vouchers) || 0;
  } catch {
    return 0;
  }
}

export async function redeemVoucher(refreshStats) {
  if (!hasSupabase || !supabase) return { success: false, message: 'Redeem service unavailable' };
  const { data, error } = await supabase.functions.invoke('voucher-redeem', { body: { voucher_code: code } });
  const success = !error && (data?.success ?? false);
  if (success) {
    // Loyalty values change after redemption; bypass any cached stats
    await refreshStats?.(true);
    return { success: true };
  }
  return { success: false, message: 'No vouchers available' };
}
