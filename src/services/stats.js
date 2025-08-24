import { supabase } from '../lib/supabase';

export async function getMyStats() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };

    const base = process.env.EXPO_PUBLIC_FUNCTIONS_URL || process.env.FUNCTIONS_URL;
    const res = await fetch(`${base}/me-stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };

    const json = await res.json();
    console.log('me-stats response', json);
    return {
      loyaltyStamps: Number(json?.loyaltyStamps ?? 0),
      freebiesLeft: Number(json?.freebiesLeft ?? 0),
      vouchers: Array.isArray(json?.vouchers) ? [...new Set(json.vouchers.filter(Boolean))] : [],
    };
  } catch {
    return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };
  }
}
