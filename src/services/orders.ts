import { supabase } from '../lib/supabase';
import type { Receipt } from '../utils/receipt';

type AllowedSource = 'app' | 'pos' | 'portal';
const ALLOWED: AllowedSource[] = ['app', 'pos', 'portal'];

function normalizeSource(input?: string) {
  const raw = (input ?? '').trim();
  const s = raw.toLowerCase();
  if ((ALLOWED as string[]).includes(s)) {
    return { source: s as AllowedSource, source_meta: null as string | null };
  }
  return { source: 'app' as AllowedSource, source_meta: raw || null };
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
  receipt: any;
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
    payment_method: receipt?.paymentMethod ?? null,
    pickup_code: receipt?.pickupCode ?? null,
    time_slot: timeSlot ?? null,
    items,
    receipt,
  };
}

export async function saveReceiptForUser(userId: string, receipt: Receipt) {
  const totalsCents = Math.round((receipt?.totals?.grandTotal || 0) * 100);
  const { source, source_meta } = normalizeSource((receipt as any)?.source);
  console.log('[ORDERS] normalizeSource in', (receipt as any)?.source, '→', source, source_meta);

  const row = buildOrderRow({
    userId,
    orderId: receipt.orderId,
    totalsCents,
    currency: receipt?.totals?.currency || 'GBP',
    items: receipt.items,
    receipt,
    timeSlot: receipt.timeSlot,
    source,
    source_meta,
  });

  const { data, error } = await supabase
    .from('orders')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.warn('[ORDERS] insert failed', error);
    throw error;
  } else {
    console.log('[ORDERS] saved', {
      order_id: row.order_id,
      source: row.source,
      source_meta: row.source_meta,
    });
  }
  return data;
}

export async function fetchUserOrders() {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export function subscribeUserOrders(onChange: () => void) {
  let channel: any;
  supabase.auth.getSession().then(({ data }) => {
    const uid = data?.session?.user?.id;
    channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: uid ? `user_id=eq.${uid}` : undefined },
        () => onChange(),
      )
      .subscribe();
  });
  return () => {
    try {
      channel?.unsubscribe();
    } catch {}
  };
}
