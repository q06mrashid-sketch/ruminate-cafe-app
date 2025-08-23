import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function normalizeRewards(admin: SupabaseClient, userId: string) {
  const { data: stampRows, error: stampErr } = await admin
    .from("loyalty_stamps")
    .select("stamps")
    .eq("user_id", userId);
  if (stampErr) throw stampErr;
  const totalStamps = (stampRows ?? []).reduce((sum, r) => sum + (r.stamps || 0), 0);

  let { data: vouchers, error } = await admin
    .from("drink_vouchers")
    .select("code, redeemed, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  let vouchersTotal = vouchers?.length ?? 0;
  let vouchersUnredeemed = vouchers?.filter(v => !v.redeemed).length ?? 0;

  const shouldExist = Math.floor((totalStamps || 0) / 8);
  const toMint = Math.max(0, shouldExist - vouchersTotal);

  if (toMint > 0) {
    const inserts = Array.from({ length: toMint }, () => ({
      user_id: userId,
      code: crypto.randomUUID(),
    }));
    await admin.from("drink_vouchers").insert(inserts);
    const { data: refreshed, error: refErr } = await admin
      .from("drink_vouchers")
      .select("code, redeemed, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (refErr) throw refErr;
    vouchers = refreshed ?? [];
    vouchersTotal = vouchers.length;
    vouchersUnredeemed = vouchers.filter(v => !v.redeemed).length;
  }

  const remainder = (totalStamps || 0) - shouldExist * 8;

  return {
    loyaltyStamps: remainder,
    freebiesLeft: vouchersUnredeemed,
    vouchers: vouchers?.map(v => ({ code: v.code, redeemed: v.redeemed })) ?? [],
  };
}
