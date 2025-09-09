import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildOrderRow, normalizeSource } from '../src/services/order-row.js';
import { calculateOrderTotals } from '../supabase/functions/create-order/calc.js';

test('buildOrderRow includes pickup_code and preserves normalized source_meta', () => {
  const { source, source_meta } = normalizeSource('legacy-web');
  const row = buildOrderRow({
    userId: 'u1',
    orderId: 'o1',
    totalsCents: 1234,
    items: [],
    receipt: { pickupCode: '54321', paymentMethod: 'card' } as any,
    timeSlot: null,
    source,
    source_meta,
  });
  assert.equal(row.pickup_code, '54321');
  assert.equal(row.source, 'app');
  assert.equal(row.source_meta, 'legacy-web');
});

test('saveReceiptForUser logs source app', async () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const libDir = resolve(dir, '../src/lib');
  mkdirSync(libDir, { recursive: true });
  writeFileSync(
    resolve(libDir, 'supabase.js'),
    "export const supabase = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'o1' }, error: null }) }) }) }) };"
  );
  // @ts-ignore
  const { saveReceiptForUser } = await import('../src/services/orders.js?test');

  const log = mock.method(console, 'log');
  await saveReceiptForUser('u1', {
    orderId: 'o1',
    pickupCode: '12345',
    createdAt: '2024-01-01',
    channel: 'click_and_collect',
    source: 'app',
    paymentMethod: 'test',
    timeSlot: { startISO: '', endISO: '' },
    items: [],
    totals: { currency: 'GBP', subtotal: 0, discounts: 0, pifContribution: 0, tax: 0, grandTotal: 0 },
  } as any);

  const call = log.mock.calls.find((c) => c.arguments[0] === '[ORDERS] normalizeSource');
  assert.equal(call?.arguments[1], 'app');
  assert.equal(call?.arguments[3], 'app');
  log.mock.restore();
});

test('calculateOrderTotals applies membership discount', () => {
  const { total } = calculateOrderTotals({
    items: [
      { sku: 'latte', qty: 2 },
      { sku: 'tea', qty: 1 },
    ],
    syrupShots: 0,
    payItForward: 0,
    redeemCount: 0,
    membershipTier: 'paid',
    freebies: 0,
  });
  // latte 350*2 + tea 250 = 950 -> 10% discount = 95 -> total 855
  assert.equal(total, 855);
});

test('calculateOrderTotals skips discount when freebie present', () => {
  const { total } = calculateOrderTotals({
    items: [{ sku: 'latte', qty: 1 }],
    syrupShots: 0,
    payItForward: 0,
    redeemCount: 0,
    membershipTier: 'paid',
    freebies: 1,
  });
  assert.equal(total, 350);
});
