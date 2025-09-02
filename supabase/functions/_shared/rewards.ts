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

  // Sum all earned stamps
  const { data: stampAgg, error: stampsErr } = await admin
    .from("loyalty_stamps")
    .select("sum(stamps)")
    .eq("user_id", userId);
  if (stampsErr) throw stampsErr;
  const totalEarned = Number(stampAgg?.[0]?.sum ?? 0);

  // Sum all redeemed free drinks to avoid double counting
  const { data: redeemAgg, error: redeemErr } = await admin
    .from("orders")
    .select("sum(free_drinks_redeemed)")
    .eq("user_id", userId);
  if (redeemErr) throw redeemErr;
  const redeemed = Number(redeemAgg?.[0]?.sum ?? 0);

  // Determine new stamps to apply beyond those already recorded on the profile
  const processed = currentStamps + (currentFree + redeemed) * 8;
  const pending = Math.max(0, totalEarned - processed);

  // Convert new stamps into vouchers
  const { vouchersEarned, stampsRemainder } = applyStampAccrual(currentStamps, pending);

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
    totalStamps: totalEarned,
    pending,
    vouchersEarned,
    remainder: stampsRemainder,
    freebiesLeft: newFree,
  });

  return {
    loyaltyStamps: stampsRemainder,
    vouchers: newFree,
  };
}
