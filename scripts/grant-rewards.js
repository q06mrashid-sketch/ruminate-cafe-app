#!/usr/bin/env node
import crypto from 'node:crypto';
import { createAdminClient, findUserIdByEmail } from './_supabase.js';

const [,, email, freeDrinksArg, stampsArg] = process.argv;
if (!email) {
  console.error('Usage: node scripts/grant-rewards.js <email> <freeDrinks=0> <loyaltyStamps=0>');
  process.exit(1);
}

const freeDrinks = Number(freeDrinksArg || 0);
const addStamps = Number(stampsArg || 0);

const supabase = createAdminClient();
const uid = await findUserIdByEmail(supabase, email);

if (addStamps > 0) {
  const rows = Array.from({ length: addStamps }, () => ({ user_id: uid, stamps: 1 }));
  const { error } = await supabase.from('loyalty_stamps').insert(rows);
  if (error) throw error;
}

if (freeDrinks > 0) {
  const rows = Array.from({ length: freeDrinks }, () => ({
    user_id: uid,
    code: crypto.randomUUID()
  }));
  const { error } = await supabase
    .from('drink_vouchers')
    .insert(rows, { count: 'exact' });
  if (error) throw error;
}

const functionsUrl = process.env.FUNCTIONS_URL || process.env.EXPO_PUBLIC_FUNCTIONS_URL;
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (functionsUrl) {
  await fetch(`${functionsUrl}/me-stats`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${svcKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId: uid, normalize: true })
  }).catch(() => {});
}

console.log(`Granted ${freeDrinks} free drinks and ${addStamps} loyalty stamps to ${email}`);
