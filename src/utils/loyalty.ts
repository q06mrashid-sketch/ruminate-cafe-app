import type { Receipt } from './receipt.js';

// Counts qualifying stamps from a Receipt (exclude modifiers)
export function countStampsFromReceipt(receipt: Receipt): number {
  if (!receipt?.items?.length) return 0;
  return receipt.items.reduce(
    (sum, it) => sum + Math.max(0, Number(it.quantity || 0)),
    0
  );
}
