const base = process.env.EXPO_PUBLIC_FUNCTIONS_URL || '';
const norm = (s) => (s || '').endsWith('/') ? s.slice(0,-1) : s;
const FN = norm(base);

export async function getFundProgress() {
  try {
    const res = await fetch(FN + '/fund-current', { headers: { accept: 'application/json' } });
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

export async function getFundHistory(months = 6) {
  try {
    const url = FN + '/fund-history?months=' + months;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('no history');
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('bad shape');
    return arr.map(row => ({
      month: String(row?.month || ''),
      total_cents: Number(row?.total_cents) || 0,
      goal_cents: Number(row?.goal_cents) || 0
    }));
  } catch {
    const now = new Date();
    const mk = (i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.toLocaleString(undefined, { month: 'short' });
      const y = d.getFullYear();
      return { month: `${m} ${y}`, total_cents: 0, goal_cents: 0 };
    };
    return [0,1,2,3].map(mk).reverse();
  }
}
