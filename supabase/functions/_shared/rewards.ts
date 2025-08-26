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


  const { vouchersEarned, stampsRemainder } = applyStampAccrual(0, totalStamps);

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


  if (totalStamps !== stampsRemainder) {

    const { error: delErr } = await admin
      .from("loyalty_stamps")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw delErr;
    if (stampsRemainder > 0) {
      const { error: insErr } = await admin
        .from("loyalty_stamps")
        .insert({ user_id: userId, stamps: stampsRemainder });

      if (insErr) throw insErr;
    }
  }

  console.log("[ME_STATS]", {
    totalStamps,
    vouchersEarned,
    remainder: stampsRemainder,
    freebiesLeft: unredeemed?.length ?? 0,
  });

  return {
    loyaltyStamps: stampsRemainder,
    freebiesLeft: unredeemed?.length ?? 0,
    vouchers: (unredeemed ?? []).map(v => v.code),
  };
}
