import { supabase, hasSupabase } from '../lib/supabase';

export async function syncVouchers(freebiesLeft) {
  if (!hasSupabase || !supabase) {
    return [];
  }
  try {
    const { data } = await supabase.functions.invoke('vouchers-sync', { body: { freebiesLeft } });
    return data?.codes ?? [];
  } catch {
    return [];
  }
}

export async function redeemVoucher(code) {
  if (!hasSupabase || !supabase) return false;
  try {
    const { data, error } = await supabase.functions.invoke('voucher-redeem', { body: { code } });
    if (error) return false;
    return data?.success ?? false;
  } catch {
    return false;
  }
}
