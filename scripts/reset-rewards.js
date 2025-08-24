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
const admin = createClient(url, key, { auth: { persistSession: false } });

async function getUserByEmailOrList(email) {
  const hasGetByEmail =
    admin?.auth?.admin && typeof admin.auth.admin.getUserByEmail === 'function';

  if (hasGetByEmail) {
    const { data, error } = await admin.auth.admin.getUserByEmail(email);
    if (error) throw error;
    if (!data?.user) throw new Error(`User not found for ${email}`);
    return data.user;
  }

  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (!data?.users?.length) break;
    page++;
  }
  throw new Error(`User not found for ${email}`);
}

const user = await getUserByEmailOrList(email);

const { error: e1, count: sCount } = await admin
  .from('loyalty_stamps')
  .delete({ count: 'exact' })
  .eq('user_id', user.id);
if (e1) throw e1;

const { error: e2, count: vCount } = await admin
  .from('drink_vouchers')
  .delete({ count: 'exact' })
  .eq('user_id', user.id);
if (e2) throw e2;

console.log(`[SCRIPT] Reset free drinks and loyalty stamps for ${email} (removed ${vCount || 0} vouchers, ${sCount || 0} stamps)`);

