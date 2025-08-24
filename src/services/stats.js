export async function getMyStats(token) {
  const base = process.env.EXPO_PUBLIC_FUNCTIONS_URL || (process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1');
  const r = await fetch(`${base}/me-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
    body: JSON.stringify({}),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || `me-stats ${r.status}`);
  const { loyaltyStamps, freebiesLeft, vouchers } = json;
  if (![loyaltyStamps, freebiesLeft].every(n => Number.isFinite(n)) || !Array.isArray(vouchers)) {
    throw new Error('Invalid me-stats payload');
  }
  return { loyaltyStamps, freebiesLeft, vouchers };
}

