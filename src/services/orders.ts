import { supabase } from '../lib/supabase';
import type { Receipt } from '../utils/receipt';
import { buildOrderRow, normalizeSource } from './order-row';


export async function saveReceiptForUser(userId: string, receipt: Receipt, freeDrinksRedeemed = 0) {
  const totalsCents = Math.round((receipt?.totals?.grandTotal || 0) * 100);
  const { source, source_meta } = normalizeSource((receipt as any)?.source);

  console.log('[ORDERS] normalizeSource', (receipt as any)?.source, '→', source, source_meta);


  const row = buildOrderRow({
    userId,
    orderId: receipt.orderId,
    totalsCents,
    currency: receipt?.totals?.currency || 'GBP',
    items: receipt.items,
    receipt,

    free_drinks_redeemed: freeDrinksRedeemed,
  };


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
