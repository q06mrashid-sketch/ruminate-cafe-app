#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const [email] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node reset-rewards.js <email>');
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
    data: { users },
    error: userErr,
  } = await admin.auth.admin.listUsers({ email });
  const user = users && users.length ? users[0] : null;
  if (userErr || !user) {
    console.error('User not found.');
    process.exit(1);
  }
  const userId = user.id;

  await admin.from('drink_vouchers').delete().eq('user_id', userId);
  await admin.from('loyalty_stamps').delete().eq('user_id', userId);
  await admin.from('profiles').upsert({ user_id: userId, free_drinks: 0 });

  console.log(`Reset free drinks and loyalty stamps for ${email}`);
})();
