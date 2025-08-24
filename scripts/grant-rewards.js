#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const [,, email, freeDrinksArg, stampsArg] = process.argv;
if (!email) {
  console.error('Usage: node scripts/grant-rewards.js <email> <freeDrinks=0> <loyaltyStamps=0>');
  process.exit(1);
}

const drinks = Number(freeDrinksArg || 0);
const stamps = Number(stampsArg || 0);

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

if (stamps > 0) {
  const rows = Array.from({ length: stamps }, () => ({
    user_id: user.id,
    stamps: 1,
  }));
  const { error } = await admin.from('loyalty_stamps').insert(rows);
  if (error) throw error;
}

if (drinks > 0) {
  const rows = Array.from({ length: drinks }, () => ({
    user_id: user.id,
    code: crypto.randomUUID(),
    redeemed: false,
  }));
  const { error } = await admin.from('drink_vouchers').insert(rows);
  if (error) throw error;
}

console.log(`[SCRIPT] Granted ${drinks} free drinks and ${stamps} loyalty stamps to ${email}`);

