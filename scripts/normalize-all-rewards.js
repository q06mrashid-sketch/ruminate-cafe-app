#!/usr/bin/env node
import 'dotenv/config';
import { createAdminClient } from './_supabase.js';
import { applyStampAccrual } from '../src/utils/rewards.js';

const supabase = createAdminClient();

async function listAllUserIds() {
  const ids = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users ?? [];
    if (!users.length) break;
    ids.push(...users.map(u => u.id));
    page++;
  }
  return ids;
}

const userIds = await listAllUserIds();

let pk = 'id';
const { error: userIdColErr } = await supabase.from('profiles').select('user_id').limit(1);
if (!userIdColErr) pk = 'user_id';

  for (const uid of userIds) {
    const { data: stampAgg, error: stampsErr } = await supabase
      .from('loyalty_stamps')
      .select('sum(stamps)')
      .eq('user_id', uid);
    if (stampsErr) throw stampsErr;
    const totalEarned = Number(stampAgg?.[0]?.sum ?? 0);

    const { data: redeemAgg, error: redeemErr } = await supabase
      .from('orders')
      .select('sum(free_drinks_redeemed)')
      .eq('user_id', uid);
    if (redeemErr) throw redeemErr;
    const redeemed = Number(redeemAgg?.[0]?.sum ?? 0);

    const availableStamps = Math.max(0, totalEarned - redeemed * 8);
    const { vouchersEarned: freebies, stampsRemainder } = applyStampAccrual(0, availableStamps);

    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        loyalty_stamps: stampsRemainder,
        free_drinks: freebies,
      })
      .eq(pk, uid);
    if (updErr) throw updErr;

    console.log(`[SCRIPT] Normalized rewards for user ${uid}`);
  }
