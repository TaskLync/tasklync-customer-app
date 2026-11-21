import { test, describe } from 'node:test';
import assert from 'node:assert';
import { toSingleInstanceItems, toServiceLines } from '../../src/utils/cartItems.ts';

const line = (serviceId: string, price: number, quantity: number = 1) => ({
  serviceId,
  serviceName: `Service ${serviceId}`,
  price,
  quantity,
  workerId: 'w1',
});

describe('toSingleInstanceItems (saved carts from older builds)', () => {
  test('"× 44" quantities become one line each, quantity 1', () => {
    const out = toSingleInstanceItems([line('ac-install', 2500, 44), line('gas', 1200, 11)]);
    assert.deepStrictEqual(out.map((i) => [i.serviceId, i.quantity, i.price]), [
      ['ac-install', 1, 2500],
      ['gas', 1, 1200],
    ]);
  });

  test('the same service twice keeps only the first line', () => {
    const out = toSingleInstanceItems([line('ac', 2500), line('gas', 1200), line('ac', 9999, 3)]);
    assert.deepStrictEqual(out.map((i) => [i.serviceId, i.price]), [['ac', 2500], ['gas', 1200]]);
  });

  test('ten different services are all kept', () => {
    const ten = Array.from({ length: 10 }, (_, k) => line(`s${k}`, 100 * (k + 1)));
    assert.strictEqual(toSingleInstanceItems(ten).length, 10);
  });

  test('garbage or missing data gives an empty, safe cart', () => {
    assert.deepStrictEqual(toSingleInstanceItems(undefined), []);
    assert.deepStrictEqual(toSingleInstanceItems('x'), []);
    assert.deepStrictEqual(toSingleInstanceItems([null, 1, { price: 5 }]), []);
  });

  test('keeps duration info for the slot calculation', () => {
    const [i] = toSingleInstanceItems([{ ...line('a', 100, 3), durationHours: 2 }]);
    assert.strictEqual(i!.durationHours, 2);
    assert.strictEqual(i!.quantity, 1);
  });
});

describe('toServiceLines (what pricing and booking create receive)', () => {
  test('each service once, quantity 1, in cart order', () => {
    assert.deepStrictEqual(toServiceLines([line('ac', 2500, 44), line('gas', 1200), line('removal', 800)]), [
      { service_id: 'ac', quantity: 1 },
      { service_id: 'gas', quantity: 1 },
      { service_id: 'removal', quantity: 1 },
    ]);
  });

  test('a duplicate never reaches the server', () => {
    assert.deepStrictEqual(toServiceLines([line('ac', 1), line('ac', 1)]), [{ service_id: 'ac', quantity: 1 }]);
  });

  test('subtotal of unique services: 2,500 + 1,200 + 800 = 4,500', () => {
    const items = toSingleInstanceItems([line('ac', 2500, 44), line('gas', 1200, 11), line('removal', 800, 11)]);
    assert.strictEqual(items.reduce((s, i) => s + i.price, 0), 4500);
  });
});
