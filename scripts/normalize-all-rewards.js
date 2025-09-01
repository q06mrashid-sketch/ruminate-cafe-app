#!/usr/bin/env node
import 'dotenv/config';
import crypto from 'node:crypto';
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

for (const uid of userIds) {
  const { data: stampAgg, error: stampErr } = await supabase
    .from('loyalty_stamps')
    .select('sum:stamps')
    .eq('user_id', uid)
    .single();
  if (stampErr) throw stampErr;
  const totalStamps = stampAgg?.sum ?? 0;

  const { data: vouchers, error: vouchersErr } = await supabase
    .from('drink_vouchers')
    .select('id')
    .eq('user_id', uid);
  if (vouchersErr) throw vouchersErr;
  const existing = vouchers?.length ?? 0;

  const { vouchersEarned, stampsRemainder } = applyStampAccrual(0, totalStamps);
  const toAdd = vouchersEarned - existing;
  if (toAdd > 0) {
    const rows = Array.from({ length: toAdd }, () => ({
      user_id: uid,
      code: crypto.randomUUID(),
    }));
    const { error: insErr } = await supabase.from('drink_vouchers').insert(rows);
    if (insErr) throw insErr;
  }

  if (totalStamps !== stampsRemainder) {
    const { error: delErr } = await supabase.from('loyalty_stamps').delete().eq('user_id', uid);
    if (delErr) throw delErr;
    if (stampsRemainder > 0) {
      const { error: insErr2 } = await supabase
        .from('loyalty_stamps')
        .insert({ user_id: uid, stamps: stampsRemainder });
      if (insErr2) throw insErr2;
    }
  }

  const { data: unredeemed, error: unredeemedErr } = await supabase
    .from('drink_vouchers')
    .select('id')
    .eq('user_id', uid)
    .eq('redeemed', false);
  if (unredeemedErr) throw unredeemedErr;

  let pk = 'id';
  const { error: userIdColErr } = await supabase.from('profiles').select('user_id').limit(1);
  if (!userIdColErr) pk = 'user_id';

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ loyalty_stamps: stampsRemainder, free_drinks: unredeemed.length })
    .eq(pk, uid);
  if (profileErr) throw profileErr;

  console.log(`[SCRIPT] Normalized rewards for user ${uid}`);
}

