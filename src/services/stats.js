import { supabase } from '../lib/supabase';

export async function getMyStats() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    console.log('session user', session?.user?.id, session?.user?.email);
    console.log('functions URL', process.env.EXPO_PUBLIC_FUNCTIONS_URL || process.env.FUNCTIONS_URL);
    if (!session?.access_token) return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };

    const base = process.env.EXPO_PUBLIC_FUNCTIONS_URL || process.env.FUNCTIONS_URL
      || `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
    const url = `${base.replace(/\/$/, '')}/me-stats`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    const text = await res.text();
    console.log('me-stats raw', res.status, text);
    let json = {};
    try { json = JSON.parse(text || '{}'); } catch {}

    if (!res.ok) {
      console.error('me-stats error', res.status, json);
      return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };
    }


    console.log('me-stats response', json);
    return {
      loyaltyStamps: Number(json?.loyaltyStamps ?? 0),
      freebiesLeft: Number(json?.freebiesLeft ?? 0),

      vouchers: Array.isArray(json?.vouchers) ? json.vouchers.filter(Boolean) : []
    };
  } catch (e) {
    console.error('getMyStats failed', e);

    return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };
  }
}
