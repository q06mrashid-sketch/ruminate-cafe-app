import type { Receipt } from '../utils/receipt.js';

type AllowedSource = 'app' | 'pos' | 'portal';
const ALLOWED: AllowedSource[] = ['app', 'pos', 'portal'];

export function normalizeSource(input?: string) {
  const raw = (input ?? '').trim();
  const s = raw.toLowerCase();
  return ALLOWED.includes(s as AllowedSource)
    ? { source: s as AllowedSource, source_meta: null as string | null }
    : { source: 'app' as AllowedSource, source_meta: raw || null };
}

export type OrdersInsert = {
  user_id: string;
  order_id: string;
  pickup_code?: string | null;
  status?: string;
  totals_cents?: number;
  currency?: string;
  channel?: string;
  source?: AllowedSource;
  source_meta?: string | null;
  time_slot?: any;
  time_slot_start?: string | null;
  time_slot_end?: string | null;
  items?: any;
  receipt?: any;
  created_at?: string;
  payment_method?: string | null;
};

export function buildOrderRow({
  userId,
  orderId,
  totalsCents,
  currency = 'GBP',
  items,
  receipt,
  timeSlot,
  source,
  source_meta,
}: {
  userId: string;
  orderId: string;
  totalsCents: number;
  currency?: string;
  items: any;
  receipt: Receipt;
  timeSlot?: any;
  source: AllowedSource;
  source_meta: string | null;
}): OrdersInsert {
  return {
    user_id: userId,
    order_id: orderId,
    status: 'pending',
    totals_cents: totalsCents,
    currency,
    channel: 'click_and_collect',
    source,
    source_meta,
    payment_method: (receipt as any)?.paymentMethod ?? null,
    pickup_code: receipt?.pickupCode ?? null,
    time_slot: timeSlot ?? null,
    items,
    receipt,
  };
}
