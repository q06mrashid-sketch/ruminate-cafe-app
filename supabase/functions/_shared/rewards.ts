import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function normalizeRewards(admin: SupabaseClient, userId: string) {

  const { data: stampAgg, error: stampErr } = await admin
    .from("loyalty_stamps")
    .select("sum:stamps")
    .eq("user_id", userId)
    .single();
  if (stampErr) throw stampErr;
  const totalStamps = stampAgg?.sum ?? 0;

  let { data: unredeemed, error: unredeemedErr } = await admin
    .from("drink_vouchers")
    .select("code")
    .eq("user_id", userId)
    .eq("redeemed", false)
    .order("created_at", { ascending: false });
  if (unredeemedErr) throw unredeemedErr;

  const vouchersEarned = Math.floor((totalStamps ?? 0) / 8);
  const remainder = totalStamps % 8;

  if (vouchersEarned > 0) {
    const inserts = Array.from({ length: vouchersEarned }, () => ({

      user_id: userId,
      code: crypto.randomUUID(),
    }));

    const { error: insertErr } = await admin.from("drink_vouchers").insert(inserts);
    if (insertErr) throw insertErr;

    const { data: refreshed, error: refreshErr } = await admin
      .from("drink_vouchers")
      .select("code")
      .eq("user_id", userId)
      .eq("redeemed", false)
      .order("created_at", { ascending: false });
    if (refreshErr) throw refreshErr;
    unredeemed = refreshed ?? [];
  }

  if (totalStamps !== remainder) {
    const { error: delErr } = await admin
      .from("loyalty_stamps")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw delErr;
    if (remainder > 0) {
      const { error: insErr } = await admin
        .from("loyalty_stamps")
        .insert({ user_id: userId, stamps: remainder });
      if (insErr) throw insErr;
    }
  }

  console.log("[ME_STATS]", {
    totalStamps,
    vouchersEarned,
    remainder,
    freebiesLeft: unredeemed?.length ?? 0,
  });

  return {
    loyaltyStamps: remainder,
    freebiesLeft: unredeemed?.length ?? 0,
    vouchers: (unredeemed ?? []).map(v => v.code),
  };
}
