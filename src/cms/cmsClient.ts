const FNS  = 'https://eamewialuovzguldcdcf.functions.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbWV3aWFsdW92emd1bGRjZGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjY5MjIsImV4cCI6MjA3MDc0MjkyMn0.oZy-UH7mB7NSFZZyivm3dbCtjsbOahcD2_coUNiiQNs';

function h(extra: Record<string,string> = {}) {
  return { Authorization: `Bearer ${ANON}`, apikey: ANON, ...extra };
}

export async function listKeys(like = '%'): Promise<string[]> {
  const url = `${FNS}/cms-list?like=${encodeURIComponent(like)}`;
  const res = await fetch(url, { headers: h() });
  const text = await res.text();
  console.log('[CMS] list status', res.status, 'body', text);
  if (!res.ok) return [];
  try {
    const j = JSON.parse(text);
    return Array.isArray(j?.keys) ? j.keys : [];
  } catch { return []; }
}

export async function getValue(key: string): Promise<string | null> {
  const url = `${FNS}/cms-get?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: h() });
  console.log('[CMS] get', key, '→', res.status);
  if (!res.ok) return null;
  let j: any = null;
  try { j = await res.json(); } catch { return null; }
  if (typeof j?.value === 'undefined') return null;
  return typeof j.value === 'string' ? j.value : String(j.value);
}

export async function fetchCMSMap(): Promise<Record<string,string>> {
  console.log('[CMS] FNS', FNS);
  const keys = await listKeys('%');
  const pairs = await Promise.all(
    keys.map(async k => [k, await getValue(k)] as const)
  );
  const out: Record<string,string> = {};
  for (const [k, v] of pairs) if (v != null) out[k] = v;
  return out;
}

export async function deleteKey(key: string): Promise<boolean> {
  const url = `${FNS}/cms-del?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: 'DELETE', headers: h() });
  console.log('[CMS] delete', key, '→', res.status);
  return res.ok;
}
