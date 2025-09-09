import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceipt } from '../src/utils/receipt.js';

test('buildReceipt totals with syrups and extra shots', () => {
  const receipt = buildReceipt({
    cartItems: [
      {
        id: 'latte',
        name: 'Latte',
        quantity: 1,
        price: 3.2,
        modifiers: {
          altMilk: 'Oat',
          syrups: ['Vanilla', 'Hazelnut'],
          coffeeBlend: 'House blend',
          extraShots: 1,
        },
      },
    ],
    selectedTimeSlot: { start: new Date(0), end: new Date(600000) },
    rng: () => 0.4219,
    uuidGenerator: () => 'test-uuid',
  });
  assert.equal(receipt.items[0].unitModifierTotal, 2.49);
  assert.equal(receipt.items[0].unitFinalPrice, 5.69);
  assert.equal(receipt.totals.subtotal, 5.69);
  assert.equal(receipt.totals.discounts, 0);
  assert.equal(receipt.totals.grandTotal, 5.69);
});

test('pickupCode is 5 digits', () => {
  const receipt = buildReceipt({
    cartItems: [],
    selectedTimeSlot: { start: new Date(0), end: new Date(600000) },
    rng: () => 0.1,
    uuidGenerator: () => 'uuid2',
  });
  assert.match(receipt.pickupCode, /^\d{5}$/);
});

test('deterministic with fixed rng and uuid', () => {
  const rng = () => 0.12345;
  const uuid = () => 'fixed-uuid';
  const r1 = buildReceipt({ cartItems: [], selectedTimeSlot: { start: new Date(0), end: new Date(600000) }, rng, uuidGenerator: uuid });
  const r2 = buildReceipt({ cartItems: [], selectedTimeSlot: { start: new Date(0), end: new Date(600000) }, rng, uuidGenerator: uuid });
  assert.equal(r1.pickupCode, r2.pickupCode);
  assert.equal(r1.orderId, r2.orderId);
});

test('currency rounds to 2dp', () => {
  const receipt = buildReceipt({
    cartItems: [{ id: 't', name: 'Test', quantity: 1, price: 1.335 }],
    selectedTimeSlot: { start: new Date(0), end: new Date(600000) },
    rng: () => 0.2,
    uuidGenerator: () => 'uuid3',
  });
  assert.equal(receipt.items[0].unitBasePrice, 1.34);
  assert.equal(receipt.items[0].unitFinalPrice, 1.34);
  assert.equal(receipt.totals.subtotal, 1.34);
});

test('buildReceipt sets source to app', () => {
  const receipt = buildReceipt({
    cartItems: [],
    selectedTimeSlot: { start: new Date(0), end: new Date(600000) },
  });
  assert.equal(receipt.source, 'app');
});

test('applies membership discount when no vouchers used', () => {
  const receipt = buildReceipt({
    cartItems: [
      { id: 'coffee:latte', name: 'Latte', quantity: 2, price: 3 },
      { id: 'bagel', name: 'Bagel', quantity: 1, price: 2 },
    ],
    selectedTimeSlot: { start: new Date(0), end: new Date(600000) },
    vouchersApplied: 0,
    discountRate: 0.1,
    rng: () => 0.5,
    uuidGenerator: () => 'd1',
  });
  // only latte items (drinks) get discount: 2 * 3 * 0.1 = 0.6
  assert.equal(receipt.totals.discounts, 0.6);
  assert.equal(receipt.totals.grandTotal, 7.4);
});

test('membership discount ignored when voucher applied', () => {
  const receipt = buildReceipt({
    cartItems: [
      { id: 'coffee:latte', name: 'Latte', quantity: 1, price: 3 },
    ],
    selectedTimeSlot: { start: new Date(0), end: new Date(600000) },
    vouchersApplied: 1,
    discountRate: 0.1,
    rng: () => 0.6,
    uuidGenerator: () => 'd2',
  });
  // voucher covers the drink; membership discount not applied
  assert.equal(receipt.totals.discounts, 3);
  assert.equal(receipt.totals.grandTotal, 0);
});
