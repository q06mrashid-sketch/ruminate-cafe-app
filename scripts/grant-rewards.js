#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const [email, freebies = '0', stamps = '0'] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node grant-rewards.js <email> <freeDrinks> <loyaltyStamps>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://eamewialuovzguldcdcf.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

(async () => {
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.admin.getUserByEmail(email);
  if (userErr || !user) {
    console.error('User not found.');
    process.exit(1);
  }
  const userId = user.id;

  const freeCount = parseInt(freebies, 10);
  const stampCount = parseInt(stamps, 10);

  if (freeCount > 0) {
    const vouchers = Array.from({ length: freeCount }, () => ({ user_id: userId, code: randomUUID() }));
    await admin.from('drink_vouchers').insert(vouchers);
  }

  if (stampCount > 0) {
    await admin.from('loyalty_stamps').insert({ user_id: userId, stamps: stampCount });
  }

  // Ensure the profile row exists and mirrors free drink rewards
  const { data: profile } = await admin
    .from('profiles')
    .select('free_drinks')
    .eq('user_id', userId)
    .maybeSingle();
  const freeDrinks = (profile?.free_drinks ?? 0) + freeCount;
  await admin.from('profiles').upsert({ user_id: userId, free_drinks: freeDrinks });

  console.log(`Granted ${freeCount} free drinks and ${stampCount} loyalty stamps to ${email}`);
})();
