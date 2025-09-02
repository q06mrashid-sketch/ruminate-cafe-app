import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function applyStampAccrual(prevStamps: number, delta: number) {
  const start = Math.max(0, Number(prevStamps || 0));
  const inc = Math.max(0, Number(delta || 0));
  const total = start + inc;
  return {
    vouchersEarned: Math.floor(total / 8),
    stampsRemainder: total % 8,
  };
}

export async function normalizeRewards(admin: SupabaseClient, userId: string) {

  // Determine profiles primary key column
  let pk = "id";
  const { error: userIdColErr } = await admin
    .from("profiles")
    .select("user_id")
    .limit(1);
  if (!userIdColErr) {
    pk = "user_id";
  } else {
    const { error: idColErr } = await admin
      .from("profiles")
      .select("id")
      .limit(1);
    if (idColErr) throw idColErr;
  }

  // Fetch current profile totals
  const { data: profile, error: fetchErr } = await admin
    .from("profiles")
    .select("loyalty_stamps, free_drinks")
    .eq(pk, userId)
    .single();
  if (fetchErr) throw fetchErr;

  const currentStamps = Number(profile?.loyalty_stamps ?? 0);
  const currentFree = Number(profile?.free_drinks ?? 0);

  // Convert any excess stamps into free drinks
  const { vouchersEarned, stampsRemainder } = applyStampAccrual(0, currentStamps);

  const newFree = currentFree + vouchersEarned;

  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      loyalty_stamps: stampsRemainder,
      free_drinks: newFree,
    })
    .eq(pk, userId);
  if (updateErr) throw updateErr;

  console.log("[ME_STATS]", {
    totalStamps: currentStamps,
    vouchersEarned,
    remainder: stampsRemainder,
    freebiesLeft: newFree,
  });

  return {
    loyaltyStamps: stampsRemainder,
    vouchers: newFree,
  };
}
