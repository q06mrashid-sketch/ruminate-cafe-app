const base = process.env.EXPO_PUBLIC_FUNCTIONS_URL || '';
const url = (base.endsWith('/') ? base.slice(0,-1) : base) + '/fund-current';

export async function getFundProgress() {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('bad status');
    const json = await res.json();
    const total = Number(json?.total_cents) || 0;
    const goal = Number(json?.goal_cents) || 0;
    const progress = goal > 0 ? Math.min(1, total / goal) : 0;
    return { total_cents: total, goal_cents: goal, progress };
  } catch {
    return { total_cents: 0, goal_cents: 0, progress: 0 };
  }
}
