import { supabase, hasSupabase } from '../lib/supabase';

export async function getMemberQRCodes(userId) {
  if (!hasSupabase || !supabase || !userId) {
    return { payload: `ruminate:member:${userId}`, vouchers: [] };
  }

  try {
    const { data } = await supabase.functions.invoke('member-qrs', { body: { member_uuid: userId } });
    return data || { payload: `ruminate:member:${userId}`, vouchers: [] };
  } catch {
    return { payload: `ruminate:member:${userId}`, vouchers: [] };
  }
}
