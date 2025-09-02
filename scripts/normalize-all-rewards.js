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
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('loyalty_stamps, free_drinks')
    .eq(pk, uid)
    .maybeSingle();
  if (profileErr) throw profileErr;

  const currentStamps = profile?.loyalty_stamps ?? 0;
  const currentFree = profile?.free_drinks ?? 0;

  const { vouchersEarned, stampsRemainder } = applyStampAccrual(currentStamps, 0);

  if (vouchersEarned > 0 || stampsRemainder !== currentStamps) {
    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        loyalty_stamps: stampsRemainder,
        free_drinks: currentFree + vouchersEarned,
      })
      .eq(pk, uid);
    if (updErr) throw updErr;
  }

  console.log(`[SCRIPT] Normalized rewards for user ${uid}`);
}
