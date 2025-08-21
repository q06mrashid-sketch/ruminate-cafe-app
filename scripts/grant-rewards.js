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
  const { data: listRes, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users.');
    process.exit(1);
  }
  const user = listRes?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
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

  console.log(`Granted ${freeCount} free drinks and ${stampCount} loyalty stamps to ${email}`);
})();
