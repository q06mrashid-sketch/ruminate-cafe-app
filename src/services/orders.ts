import { supabase } from '../lib/supabase';
import type { Receipt } from '../utils/receipt';

type VoidFn = () => void;
const listeners = new Set<VoidFn>();

export function onLocalOrdersChange(fn: VoidFn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitLocalOrdersChange() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export async function saveReceiptForUser(userId: string, receipt: Receipt) {
  const grandTotalCents = Math.round((receipt?.totals?.grandTotal || 0) * 100);
  const { error } = await supabase.from('orders').insert([{
    user_id: userId,
    order_id: receipt.orderId,
    pickup_code: receipt.pickupCode,
    status: 'pending',
    totals_cents: grandTotalCents,
    currency: receipt?.totals?.currency || 'GBP',
    channel: receipt.channel,
    payment_method: receipt.paymentMethod,
    time_slot: receipt.timeSlot,
    items: receipt.items,
    receipt,
  }]);
  if (error) throw error;
  emitLocalOrdersChange();
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
  const channel = supabase
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => onChange())
    .subscribe();
  return () => {
    try {
      channel.unsubscribe();
    } catch {}
  };
}
