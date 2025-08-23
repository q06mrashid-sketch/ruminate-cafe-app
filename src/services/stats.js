import { supabase, hasSupabase } from '../lib/supabase';

export async function getMyStats(token) {
  const base =
    process.env.EXPO_PUBLIC_FUNCTIONS_URL ||
    (process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1');

  const authToken = token;
  if (!authToken && hasSupabase && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || '';
    } catch {
      token = '';
    }
  }

  const res = await fetch(`${base}/me-stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken || token || ''}`,
    },
    body: JSON.stringify({}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `me-stats ${res.status}`);
  const { loyaltyStamps, freebiesLeft, vouchers } = json;
  if (
    ![loyaltyStamps, freebiesLeft].every(n => Number.isFinite(n)) ||
    !Array.isArray(vouchers)
  ) {
    throw new Error('Invalid me-stats payload');
  }
  return { loyaltyStamps, freebiesLeft, vouchers };
}
