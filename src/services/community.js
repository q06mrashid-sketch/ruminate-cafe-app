import { FUNCTIONS_URL } from '../lib/env';

export async function getFundCurrent() {
  const res = await fetch(`${FUNCTIONS_URL}/fund-current`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
