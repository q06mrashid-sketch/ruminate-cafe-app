
export type ReceiptItemModifier =
  | { type: 'altMilk'; label: string; priceDelta: number }
  | { type: 'syrup'; label: string; priceDelta: number }
  | { type: 'coffeeBlend'; label: string; priceDelta: number }
  | { type: 'extraShot'; count: number; priceDelta: number };

export type ReceiptItem = {
  id: string;
  name: string;
  quantity: number;
  unitBasePrice: number;
  unitModifierTotal: number;
  unitFinalPrice: number;
  lineTotal: number;
  modifiers: ReceiptItemModifier[];
  notes?: string;
};

export type ReceiptTotals = {
  currency: 'GBP';
  subtotal: number;
  discounts: number;
  pifContribution: number;
  tax: number;
  grandTotal: number;
};

export type Receipt = {
  orderId: string;
  pickupCode: string;
  createdAt: string;
  channel: 'click_and_collect';
  paymentMethod: 'apple_pay' | 'card' | 'cash' | 'test';
  customer?: { id?: string; email?: string };
  timeSlot: { startISO: string; endISO: string };
  items: ReceiptItem[];
  totals: ReceiptTotals;
  vouchersRedeemed?: number;
  freeDrinksUsed?: number;
  meta?: Record<string, any>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatISO(d: Date): string {
  return d.toISOString();
}

export function buildReceipt({
  cartItems,
  selectedTimeSlot,
  customer,
  pifContribution = 0,
  vouchersApplied = 0,
  paymentMethod = 'test',
  rng = Math.random,
  uuidGenerator = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2)),
}: {
  cartItems: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: {
      altMilk?: string;
      syrups?: string[];
      coffeeBlend?: string;
      extraShots?: number;
    };
    notes?: string;
  }>;
  selectedTimeSlot: { start: Date; end: Date };
  customer?: { id?: string; email?: string } | null;
  pifContribution?: number;
  vouchersApplied?: number;
  paymentMethod?: 'apple_pay' | 'card' | 'cash' | 'test';
  rng?: () => number;
  uuidGenerator?: () => string;
}): Receipt {
  const items: ReceiptItem[] = cartItems.map((item) => {
    const mods: ReceiptItemModifier[] = [];
    let unitModifierTotal = 0;
    const m = item.modifiers || {};
    if (m.altMilk) {
      mods.push({ type: 'altMilk', label: m.altMilk, priceDelta: 0 });
    }
    if (m.syrups) {
      m.syrups.forEach((s) => {
        mods.push({ type: 'syrup', label: s, priceDelta: 0.5 });
      });
      unitModifierTotal += 0.5 * m.syrups.length;
    }
    if (m.coffeeBlend) {
      mods.push({ type: 'coffeeBlend', label: m.coffeeBlend, priceDelta: 0 });
    }
    if (typeof m.extraShots === 'number' && m.extraShots > 0) {
      mods.push({ type: 'extraShot', count: m.extraShots, priceDelta: 1.49 });
      unitModifierTotal += 1.49 * m.extraShots;
    }
    unitModifierTotal = round2(unitModifierTotal);
    const unitBasePrice = round2(item.price);
    const unitFinalPrice = round2(unitBasePrice + unitModifierTotal);
    const lineTotal = round2(unitFinalPrice * item.quantity);
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitBasePrice,
      unitModifierTotal,
      unitFinalPrice,
      lineTotal,
      modifiers: mods,
      notes: item.notes,
    };
  });

  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  let discounts = 0;
  let vouchersLeft = vouchersApplied;
  for (const item of items) {
    if (vouchersLeft <= 0) break;
    const redeem = Math.min(vouchersLeft, item.quantity);
    discounts += redeem * item.unitBasePrice;
    vouchersLeft -= redeem;
  }
  discounts = round2(discounts);
  const tax = 0;
  const pif = round2(pifContribution);
  const grandTotal = round2(subtotal - discounts + pif + tax);

  const orderId = uuidGenerator();
  const pickupCode = String(Math.floor(rng() * 100000)).padStart(5, '0');
  const createdAt = formatISO(new Date());

  return {
    orderId,
    pickupCode,
    createdAt,
    channel: 'click_and_collect',
    paymentMethod,
    customer: customer || undefined,
    timeSlot: {
      startISO: formatISO(selectedTimeSlot.start),
      endISO: formatISO(selectedTimeSlot.end),
    },
    items,
    totals: {
      currency: 'GBP',
      subtotal,
      discounts,
      pifContribution: pif,
      tax,
      grandTotal,
    },
    vouchersRedeemed: vouchersApplied || undefined,
  };
}

function formatTimeRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} ` +
    `${pad(start.getHours())}:${pad(start.getMinutes())}–${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export function printReceiptToConsole(receipt: Receipt): void {
  const lines: string[] = [];
  lines.push('=== RECEIPT (TEST LOG) ===');
  lines.push('Ruminate — Click & Collect');
  lines.push(`Order: ${receipt.orderId}   Code: ${receipt.pickupCode}`);
  lines.push(`When: ${formatTimeRange(receipt.timeSlot.startISO, receipt.timeSlot.endISO)}`);
  lines.push('');
  receipt.items.forEach((item) => {
    lines.push(`${item.quantity} × ${item.name}  £${item.unitFinalPrice.toFixed(2)}`);
    item.modifiers.forEach((m) => {
      if (m.type === 'altMilk') lines.push(`   • ${m.label}`);
      if (m.type === 'syrup') lines.push(`   • ${m.label} (+£${m.priceDelta.toFixed(2)})`);
      if (m.type === 'coffeeBlend') lines.push(`   • ${m.label}`);
      if (m.type === 'extraShot') lines.push(`   • +${m.count} shot${m.count > 1 ? 's' : ''} (+£${(m.priceDelta * m.count).toFixed(2)})`);
    });
    lines.push(`   = £${item.lineTotal.toFixed(2)}`);
    lines.push('');
  });
  lines.push(`Subtotal: £${receipt.totals.subtotal.toFixed(2)}`);
  if (receipt.vouchersRedeemed) {
    lines.push(`Vouchers used: ${receipt.vouchersRedeemed} (−£${receipt.totals.discounts.toFixed(2)})`);
  }
  if (receipt.totals.pifContribution) {
    lines.push(`PIF: £${receipt.totals.pifContribution.toFixed(2)}`);
  }
  lines.push(`Tax: £${receipt.totals.tax.toFixed(2)}`);
  lines.push(`TOTAL: £${receipt.totals.grandTotal.toFixed(2)}`);
  console.log(lines.join('\n'));
  console.log('=== RECEIPT JSON ===');
  console.log(JSON.stringify(receipt, null, 2));
}

export async function sendReceiptToPOS(receipt: Receipt): Promise<void> {
  const endpoint = process.env.EXPO_PUBLIC_POS_ENDPOINT;

  if (!endpoint) return;

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receipt),
    });
  } catch (err) {
    console.error('Failed to send receipt to POS', err);

  }
}

