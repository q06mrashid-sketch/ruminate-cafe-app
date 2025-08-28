import { supabase } from '../lib/supabase';
import type { Receipt } from '../utils/receipt';

export async function saveReceiptForUser(userId: string, receipt: Receipt) {
  const grandTotalCents = Math.round((receipt?.totals?.grandTotal || 0) * 100);
  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
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
      },
    ])
    .select('*');
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
