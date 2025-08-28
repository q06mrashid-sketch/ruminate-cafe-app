import { supabase } from '../lib/supabase';
import type { Receipt } from '../utils/receipt';

export function buildOrderRow({
  userId,
  orderId,
  totalsCents,
  currency = 'GBP',
  items,
  receipt,
  timeSlot,
}: {
  userId: string;
  orderId: string;
  totalsCents: number;
  currency?: string;
  items: any;
  receipt: any;
  timeSlot?: any;
}) {
  return {
    user_id: userId,
    order_id: orderId,
    status: 'pending',
    totals_cents: totalsCents,
    currency,
    channel: 'click_and_collect',
    source: 'app',
    payment_method: receipt?.paymentMethod ?? null,
    time_slot: timeSlot ?? null,
    items,
    receipt,
  };
}

export async function saveReceiptForUser(userId: string, receipt: Receipt) {
  const totalsCents = Math.round((receipt?.totals?.grandTotal || 0) * 100);

  const row = buildOrderRow({
    userId,
    orderId: receipt.orderId,
    totalsCents,
    currency: receipt?.totals?.currency || 'GBP',
    items: receipt.items,
    receipt,
    timeSlot: receipt.timeSlot,
  });

  if (!row.source) {
    console.error('[ORDERS] source missing before insert');
    throw new Error('orders.source required');
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([row])
    .select('*')
    .single();

  if (error) throw error;
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
