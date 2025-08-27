import assert from 'node:assert';
import test from 'node:test';
import { buildMenuData, computeItemTotal } from '../menuData.js';

test('buildMenuData parses CMS map', () => {
  const cms = {
    'menu.coffee.latte': 'Latte',
    'price.coffee.latte': '3.20',
    'desc.coffee.latte': 'Delicious',
    'alt.coffee.latte': '1',
    'syrups-on.coffee.latte': '1',
    'coffee-on.coffee.latte': '1',
    'extra.coffee.latte': '1',
    'syrups.vanilla': 'Vanilla',
    'syrups.hazelnut': 'Hazelnut',
    'coffee.single': 'Single Origin'
  };
  const data = buildMenuData(cms);
  assert.strictEqual(data.itemsByCategory.coffee.length, 1);
  const latte = data.itemsByCategory.coffee[0];
  assert.strictEqual(latte.name, 'Latte');
  assert.strictEqual(latte.price, 3.20);
  assert.deepStrictEqual(latte.flags, { alt: true, extra: true, syrups: true, coffee: true });
  assert.strictEqual(data.options.syrups.length, 2);
  assert.strictEqual(data.options.coffeeBlends.length, 2); // house + single
});

test('computeItemTotal sums modifiers', () => {
  const total = computeItemTotal(3.20, { syrupCount: 2, extraShots: 1 });
  assert.strictEqual(total, 5.69);
});

