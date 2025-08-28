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
