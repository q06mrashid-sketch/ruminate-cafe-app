#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/reset-rewards.js <email>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function getUserByEmailOrList(email) {
  const hasGetByEmail =
    supabase?.auth?.admin && typeof supabase.auth.admin.getUserByEmail === 'function';

  if (hasGetByEmail) {
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);
    if (error) throw error;
    if (!data?.user) throw new Error(`User not found for ${email}`);
    return data.user;
  }

  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (!data?.users?.length) break;
    page++;
  }
  throw new Error(`User not found for ${email}`);
}

const user = await getUserByEmailOrList(email);
const uid = user.id;

let pk = 'id';
const { error: userIdColErr } = await supabase.from('profiles').select('user_id').limit(1);
if (!userIdColErr) pk = 'user_id';

const { error } = await supabase
  .from('profiles')
  .update({ loyalty_stamps: 0, free_drinks: 0 })
  .eq(pk, uid);
if (error) throw error;

console.log(`[SCRIPT] Reset free drinks and loyalty stamps for ${email}`);

