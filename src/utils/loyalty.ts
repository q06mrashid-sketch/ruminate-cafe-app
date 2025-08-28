import type { Receipt } from './receipt.js';

// Counts qualifying stamps from a Receipt (exclude modifiers)
export function countStampsFromReceipt(receipt: Receipt): number {
  return Array.isArray(receipt?.items)
    ? receipt.items.reduce((sum, it) => sum + Math.max(0, Number(it.quantity || 0)), 0)
    : 0;
}
