#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const [email, freebies = '0', stamps = '0'] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node grant-rewards.js <email> <freeDrinks> <loyaltyStamps>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !serviceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function normalize(userId) {
  const { count: totalStamps = 0 } = await supabase
    .from('loyalty_stamps')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  const { count: vouchersTotal = 0 } = await supabase
    .from('drink_vouchers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  const { count: vouchersUnredeemed = 0 } = await supabase
    .from('drink_vouchers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('redeemed', false);

  const shouldExist = Math.floor(totalStamps / 8);
  const toMint = Math.max(0, shouldExist - vouchersTotal);
  if (toMint > 0) {
    const inserts = Array.from({ length: toMint }, () => ({ user_id: userId, code: randomUUID() }));
    await supabase.from('drink_vouchers').upsert(inserts, { onConflict: 'code' });
  }
  const remainder = totalStamps - shouldExist * 8;
  return { loyaltyStamps: remainder, freebiesLeft: (vouchersUnredeemed ?? 0) + toMint };
}

try {
  const { data: { user } } = await supabase.auth.admin.getUserByEmail(email);
  if (!user) throw new Error('User not found');
  const userId = user.id;

  const freeCount = parseInt(freebies, 10) || 0;
  const stampCount = parseInt(stamps, 10) || 0;

  if (stampCount > 0) {
    const rows = Array.from({ length: stampCount }, () => ({ user_id: userId }));
    await supabase.from('loyalty_stamps').insert(rows);
  }

  if (freeCount > 0) {
    const vouchers = Array.from({ length: freeCount }, () => ({ user_id: userId, code: randomUUID() }));
    await supabase.from('drink_vouchers').upsert(vouchers, { onConflict: 'code' });
  }

  const finalStats = await normalize(userId);
  console.log(JSON.stringify(finalStats, null, 2));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
