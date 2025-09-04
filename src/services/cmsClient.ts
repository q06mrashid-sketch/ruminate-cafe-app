const base = process.env.CMS_FUNCTIONS_BASE || 'https://eamewialuovzguldcdcf.functions.supabase.co';
const anon = process.env.SUPABASE_ANON || '';

async function j(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      'Authorization': anon ? `Bearer ${anon}` : '',
      'apikey': anon || '',
      'content-type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${url} → ${res.status}`);
  return res.json();
}

export async function listKeys(like = '%'): Promise<string[]> {
  const out = await j(`${base}/cms-list?like=${encodeURIComponent(like)}`);
  return Array.isArray(out?.keys) ? out.keys : [];
}

export async function getValue(key: string): Promise<string | null> {
  const out = await j(`${base}/cms-get?key=${encodeURIComponent(key)}`);
  return typeof out?.value !== 'undefined' ? out.value : null;
}

export async function getAll(): Promise<Record<string,string>> {
  const keys = await listKeys('%');
  const pairs = await Promise.all(
    keys.map(async k => {
      try {
        const v = await getValue(k);
        return [k, v ?? ''] as const;
      } catch {
        return [k, ''] as const;
      }
    })
  );
  return Object.fromEntries(pairs);
}
