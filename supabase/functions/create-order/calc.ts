export type MenuItem = { price: number; hot: boolean };

export const MENU: Record<string, MenuItem> = {
  latte: { price: 350, hot: true },
  cappuccino: { price: 350, hot: true },
  americano: { price: 300, hot: true },
  tea: { price: 250, hot: true },
  iced_latte: { price: 400, hot: false },
};

export const SYRUP_PRICE = 50;
export const PIF_PRICE = 300;
export const VOUCHER_VALUE = 300;

export function calculateOrderTotals({
  items,
  syrupShots,
  payItForward,
  redeemCount,
  membershipTier,
  freebies,
}: {
  items: Array<{ sku: string; qty: number }>;
  syrupShots: number;
  payItForward: number;
  redeemCount: number;
  membershipTier: string;
  freebies: number;
}): { total: number; hotCount: number } {
  let total = 0;
  let hotCount = 0;
  let drinkSubtotal = 0;
  for (const it of items) {
    const sku = String(it?.sku || "");
    const qty = Number(it?.qty) || 0;
    const def = MENU[sku];
    if (!def) throw new Error(`invalid item ${sku}`);
    const amount = def.price * qty;
    total += amount;
    drinkSubtotal += amount;
    if (def.hot) hotCount += qty;
  }

  total += SYRUP_PRICE * syrupShots;
  total += PIF_PRICE * payItForward;

  total -= VOUCHER_VALUE * redeemCount;

  if (membershipTier === "paid" && freebies === 0 && redeemCount === 0) {
    const discount = Math.round(drinkSubtotal * 0.1);
    total -= discount;
  }

  if (total < 0) total = 0;
  return { total, hotCount };
}
