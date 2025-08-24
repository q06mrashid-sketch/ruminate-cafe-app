import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function normalizeRewards(admin: SupabaseClient, userId: string) {

  const { data: stampAgg, error: stampErr } = await admin
    .from("loyalty_stamps")
    .select("sum:stamps")
    .eq("user_id", userId)
    .single();
  if (stampErr) throw stampErr;
  const totalStamps = stampAgg?.sum ?? 0;

  const { count: totalVouchers, error: voucherCountErr } = await admin
    .from("drink_vouchers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (voucherCountErr) throw voucherCountErr;

  let { data: unredeemed, error: unredeemedErr } = await admin
    .from("drink_vouchers")
    .select("code")
    .eq("user_id", userId)
    .eq("redeemed", false)
    .order("created_at", { ascending: true });
  if (unredeemedErr) throw unredeemedErr;

  const shouldExist = Math.floor(totalStamps / 8);
  const toMint = Math.max(0, shouldExist - (totalVouchers ?? 0));


  const shouldExist = Math.floor((totalStamps ?? 0) / 8);
  const toMint = Math.max(0, shouldExist - (totalVouchers ?? 0));
  if (toMint > 0) {
    const inserts = Array.from({ length: toMint }, () => ({
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
      .order("created_at", { ascending: true });
    if (refreshErr) throw refreshErr;
    unredeemed = refreshed ?? [];
  }


  const remainder = totalStamps % 8;

  console.log("[ME_STATS]", {
    totalStamps,
    totalVouchers: totalVouchers ?? 0,
    shouldExist,
    toMint,
    remainder,
    freebiesLeft: unredeemed?.length ?? 0,
  });

  return {
    loyaltyStamps: remainder,
    freebiesLeft: unredeemed?.length ?? 0,
    vouchers: (unredeemed ?? []).map(v => v.code),
  };
}
