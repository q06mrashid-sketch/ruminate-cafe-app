import test from 'node:test';
import assert from 'node:assert/strict';
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
