import { supabase } from '../lib/supabase';
import { getFunctionsUrl } from '../lib/config';

export async function getMyStats() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };

    const base = getFunctionsUrl();
    const url = `${base.replace(/\/$/, '')}/me-stats`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });

    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text || '{}'); } catch {}

    if (!res.ok) {
      console.error('me-stats error', res.status, json);
      return { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };
    }

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
