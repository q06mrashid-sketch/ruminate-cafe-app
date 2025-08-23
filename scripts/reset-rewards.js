#!/usr/bin/env node
import { createAdminClient, findUserIdByEmail } from './_supabase.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/reset-rewards.js <email>');
  process.exit(1);
}

const supabase = createAdminClient();

const uid = await findUserIdByEmail(supabase, email);

let { error: e1 } = await supabase
  .from('loyalty_stamps')
  .delete()
  .eq('user_id', uid);
if (e1) throw e1;

let { error: e2 } = await supabase
  .from('drink_vouchers')
  .delete()
  .eq('user_id', uid)
  .eq('redeemed', false);
if (e2) throw e2;

console.log(`Reset free drinks and loyalty stamps for ${email}`);
