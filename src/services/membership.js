import { supabase } from '../lib/supabase';
import { FUNCTIONS_URL } from '../lib/env';

async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session;
  const anon = await supabase.auth.signInAnonymously();
  if (anon.error) throw anon.error;
  return (await supabase.auth.getSession()).data.session;
}

export async function getMembershipSummary() {
  const session = await ensureSession();
  const res = await fetch(`${FUNCTIONS_URL}/me-membership`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
