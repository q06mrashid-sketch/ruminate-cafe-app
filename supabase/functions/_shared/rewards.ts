import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function normalizeRewards(admin: SupabaseClient, userId: string) {
  const { count: totalStamps, error: stampErr } = await admin
    .from("loyalty_stamps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (stampErr) throw stampErr;

  const { count: totalVouchers, error: voucherCountErr } = await admin
    .from("drink_vouchers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (voucherCountErr) throw voucherCountErr;

  let { data: unredeemed, error: unredErr } = await admin
    .from("drink_vouchers")
    .select("code, created_at")
    .eq("user_id", userId)
    .eq("redeemed", false)
    .order("created_at", { ascending: true });
  if (unredErr) throw unredErr;

  const shouldExist = Math.floor((totalStamps || 0) / 8);
  const toMint = Math.max(0, shouldExist - (totalVouchers || 0));

  if (toMint > 0) {
    const inserts = Array.from({ length: toMint }, () => ({
      user_id: userId,
      code: crypto.randomUUID(),
    }));
    const { error: insErr } = await admin.from("drink_vouchers").insert(inserts);
    if (insErr) throw insErr;
    const { data: refreshed, error: refErr } = await admin
      .from("drink_vouchers")
      .select("code, created_at")
      .eq("user_id", userId)
      .eq("redeemed", false)
      .order("created_at", { ascending: true });
    if (refErr) throw refErr;
    unredeemed = refreshed ?? [];
  }

  const remainder = (totalStamps || 0) % 8;
  console.log('[ME_STATS]', {
    totalStamps,
    shouldExist,
    toMint,
    remainder,
    vouchers: unredeemed?.length ?? 0,
  });

  return {
    loyaltyStamps: remainder,
    freebiesLeft: unredeemed?.length ?? 0,
    vouchers: (unredeemed || []).map(v => v.code),
  };
}
