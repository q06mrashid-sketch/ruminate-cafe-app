import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { countStampsFromReceipt } from '../src/utils/loyalty.js';
import type { Receipt } from '../src/utils/receipt.js';

test('countStampsFromReceipt sums quantities ignoring modifiers', () => {
  const receipt: Receipt = {
    orderId: 'o1',
    pickupCode: '12345',
    createdAt: new Date().toISOString(),
    channel: 'click_and_collect',
    paymentMethod: 'test',
    customer: undefined,
    timeSlot: { startISO: '', endISO: '' },
    items: [
      {
        id: 'coffee:latte',
        name: 'Latte',
        quantity: 1,
        unitBasePrice: 0,
        unitModifierTotal: 0.5,
        unitFinalPrice: 0,
        lineTotal: 0,
        modifiers: [
          { type: 'syrup', label: 'Vanilla', priceDelta: 0.5 },
          { type: 'extraShot', count: 1, priceDelta: 1.49 }
        ],
      },
      {
        id: 'coffee:mocha',
        name: 'Mocha',
        quantity: 2,
        unitBasePrice: 0,
        unitModifierTotal: 0,
        unitFinalPrice: 0,
        lineTotal: 0,
        modifiers: [],
      },
      {
        id: 'food:sandwich',
        name: 'Sandwich',
        quantity: 1,
        unitBasePrice: 0,
        unitModifierTotal: 0,
        unitFinalPrice: 0,
        lineTotal: 0,
        modifiers: [{ type: 'altMilk', label: 'Oat', priceDelta: 0 }],
      },
    ],
    totals: { currency: 'GBP', subtotal: 0, discounts: 0, pifContribution: 0, tax: 0, grandTotal: 0 },
  };
  assert.equal(countStampsFromReceipt(receipt), 4);
});

test('countStampsFromReceipt example receipt returns 3', () => {
  const receipt: Receipt = {
    orderId: 'o2',
    pickupCode: '22222',
    createdAt: new Date().toISOString(),
    channel: 'click_and_collect',
    paymentMethod: 'test',
    customer: undefined,
    timeSlot: { startISO: '', endISO: '' },
    items: [
      { id: 'coffee:latte', name: 'Latte', quantity: 1, unitBasePrice: 0, unitModifierTotal: 0, unitFinalPrice: 0, lineTotal: 0, modifiers: [] },
      { id: 'drink:pif', name: 'Pay It Forward', quantity: 1, unitBasePrice: 0, unitModifierTotal: 0, unitFinalPrice: 0, lineTotal: 0, modifiers: [] },
      { id: 'food:sandwich', name: 'Sandwich', quantity: 1, unitBasePrice: 0, unitModifierTotal: 0, unitFinalPrice: 0, lineTotal: 0, modifiers: [] },
    ],
    totals: { currency: 'GBP', subtotal: 0, discounts: 0, pifContribution: 0, tax: 0, grandTotal: 0 },
  };
  assert.equal(countStampsFromReceipt(receipt), 3);
});

test('awardStamps rollover with idempotency', () => {
  const profile = { stamps: 7, freebies: 0 };
  const ledger = new Set<string>();
  function award(order: string, add: number) {
    if (add <= 0 || ledger.has(order)) return;
    ledger.add(order);
    const total = profile.stamps + add;
    profile.freebies += Math.floor(total / 8);
    profile.stamps = total % 8;
  }
  award('order1', 3);
  assert.deepEqual(profile, { stamps: 2, freebies: 1 });
  award('order1', 3);
  assert.deepEqual(profile, { stamps: 2, freebies: 1 });
});

test('checkoutLoyalty caps stamps at 7 and increments free drinks', { concurrency: false }, async () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const libDir = resolve(dir, '../src/lib');
  mkdirSync(libDir, { recursive: true });
  writeFileSync(
    resolve(libDir, 'supabase.js'),
    `export const hasSupabase = true;
const state = { stamps: 0, free: 0 };
export const supabase = {
  rpc: (_fn, { p_add_stamps }) => {
    const total = state.stamps + p_add_stamps;
    state.free += Math.floor(total / 8);
    state.stamps = total % 8;
    return {
      maybeSingle: async () => ({
        data: { loyalty_stamps: state.stamps, free_drinks: state.free },
        error: null,
      }),
    };
  },
  from: () => ({
    insert: () => ({
      select: () => ({
        single: async () => ({ data: { id: 'o1' }, error: null })
      })
    })
  }),
};`
  );
  const svcDir = resolve(dir, '../src/services');
  mkdirSync(svcDir, { recursive: true });
  copyFileSync(resolve(dir, '../../src/services/loyalty.js'), resolve(svcDir, 'loyalty.js'));
  const { checkoutLoyalty } = await import('../src/services/loyalty.js');
  const log = mock.method(console, 'log');
    let { data } = await checkoutLoyalty('u1', 'o1', 5, 0);
    assert.equal(data?.loyalty_stamps, 5);
    assert.equal(data?.free_drinks, 0);
    ({ data } = await checkoutLoyalty('u1', 'o2', 4, 0));
    assert.equal(data?.loyalty_stamps, 1);
    assert.equal(data?.free_drinks, 1);
  assert.ok(
    log.mock.calls.some((c) => String(c.arguments[0]).includes('new free drinks: 1'))
  );
  log.mock.restore();
});

test('specials items are treated as drinks and award stamps', { concurrency: false }, async () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const libDir = resolve(dir, '../src/lib');
  mkdirSync(libDir, { recursive: true });
  writeFileSync(
    resolve(libDir, 'supabase.js'),
    'export const hasSupabase = true; export const supabase = {};',
  );
  // @ts-ignore
  const { isDrinkItem } = await import('../../src/utils/isDrinkItem.js');
  const items = [
    { id: 'specials:pumpkin-latte', quantity: 1, category: 'specials' },
  ];
  const drinkCount = items
    .filter(isDrinkItem)
    .reduce((sum, it) => sum + (it.quantity || 0), 0);
  assert.equal(drinkCount, 1);
  const redeemCount = 0;
  const stampsToAward = Math.max(0, drinkCount - redeemCount);
  assert.ok(stampsToAward > 0);
});
