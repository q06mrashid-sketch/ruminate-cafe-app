#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const [,, email, freeDrinksArg, stampsArg] = process.argv;
if (!email) {
  console.error('Usage: node scripts/grant-rewards.js <email> <freeDrinks=0> <loyaltyStamps=0>');
  process.exit(1);
}

const freeDrinksToAdd = Number(freeDrinksArg || 0);
const stampsToAdd = Number(stampsArg || 0);

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

if (stampsToAdd > 0) {
  const { error } = await supabase
    .from('loyalty_stamps')
    .insert([{ user_id: uid, stamps: Number(stampsToAdd) }], { returning: 'minimal' });
  if (error) throw error;
}

if (freeDrinksToAdd > 0) {
  const rows = Array.from({ length: freeDrinksToAdd }, () => ({
    user_id: uid,
    code: crypto.randomUUID(),
    redeemed: false
  }));
  const { error } = await supabase
    .from('drink_vouchers')
    .insert(rows, { returning: 'minimal' });
  if (error) throw error;
}

console.log(`[SCRIPT] Granted ${freeDrinksToAdd} free drinks and ${stampsToAdd} loyalty stamps to ${email}`);

