#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const [email] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node reset-rewards.js <email>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !serviceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

try {
  const { data: { user } } = await supabase.auth.admin.getUserByEmail(email);
  if (!user) throw new Error('User not found');
  const userId = user.id;

  await supabase.from('loyalty_stamps').delete().eq('user_id', userId);
  await supabase.from('drink_vouchers').delete().eq('user_id', userId).eq('redeemed', false);

  console.log(JSON.stringify({ stamps: 0, vouchersUnredeemed: 0 }, null, 2));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
