import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

export async function findUserIdByEmail(supabase, email) {
  try {
    const { data, error } = await supabase
      .from('users', { schema: 'auth' })
      .select('id,email')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error('User not found');
    return data.id;
  } catch (err) {
    // Fallback for environments where auth.users isn't exposed
    return findUserIdByEmailFallback(supabase, email);
  }

export async function findUserIdByEmailFallback(supabase, email) {
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data?.users?.find(x => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (!data?.users?.length) break;
    page++;
  }
  throw new Error('User not found');
}
