import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderRow, normalizeSource } from '../src/services/order-row.js';

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
