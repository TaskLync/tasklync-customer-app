import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveBookNow, toBookableServices, unavailableMessage } from '../../src/utils/bookNow.ts';
import type { WorkerServiceOffering } from '../../src/types/worker.types.ts';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const WORKER = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';

const svc = (over: Partial<WorkerServiceOffering>): WorkerServiceOffering => ({
  id: A, serviceId: A, serviceName: 'Fan Installation', serviceNameUr: null,
  customPrice: 500, priceType: 'fixed', isCustom: false, notes: null, ...over,
});

const base = {
  isSignedIn: true, workerName: 'Ali', availability: 'AVAILABLE' as const,
  workerId: WORKER, cartWorkerId: null, cartItemCount: 0, services: [svc({})],
};

describe('toBookableServices', () => {
  test('keeps fixed and hourly services with a real price and id', () => {
    const out = toBookableServices([svc({}), svc({ id: B, serviceId: B, priceType: 'hourly', customPrice: 800 })]);
    assert.deepStrictEqual(out.map((s) => [s.cartServiceId, s.price, s.priceType]), [[A, 500, 'fixed'], [B, 800, 'hourly']]);
  });
  test('drops quote-priced, zero/invalid price and non-UUID services', () => {
    const out = toBookableServices([
      svc({ priceType: 'quote' }),
      svc({ id: B, serviceId: B, customPrice: 0 }),
      svc({ id: 'not-a-uuid', serviceId: null }),
      svc({ id: B, serviceId: B, customPrice: Number.NaN }),
    ]);
    assert.strictEqual(out.length, 0);
  });
  test('a custom offering (no serviceId) is booked by its offering id', () => {
    assert.strictEqual(toBookableServices([svc({ serviceId: null, id: B })])[0]?.cartServiceId, B);
  });
});

describe('resolveBookNow', () => {
  test('signed out -> sign in first', () => {
    assert.strictEqual(resolveBookNow({ ...base, isSignedIn: false }).kind, 'SIGN_IN');
  });
  test('unavailable worker -> explained, never a booking', () => {
    for (const a of ['BUSY', 'OFFLINE', 'PAUSED', 'INACTIVE', 'UNAVAILABLE'] as const) {
      const d = resolveBookNow({ ...base, availability: a });
      assert.strictEqual(d.kind, 'UNAVAILABLE', a);
      assert.ok(d.kind === 'UNAVAILABLE' && d.message.includes('Ali'), a);
    }
  });
  test('no services at all -> offers a custom quote', () => {
    const d = resolveBookNow({ ...base, services: [] });
    assert.ok(d.kind === 'NO_SERVICES' && d.canRequestQuote);
  });
  test('only quote-priced services -> says so', () => {
    const d = resolveBookNow({ ...base, services: [svc({ priceType: 'quote' })] });
    assert.ok(d.kind === 'NO_SERVICES' && /quote/i.test(d.message));
  });
  test('missing/invalid price is not bookable', () => {
    assert.strictEqual(resolveBookNow({ ...base, services: [svc({ customPrice: 0 })] }).kind, 'NO_SERVICES');
  });
  test('exactly one bookable service -> added straight away', () => {
    const d = resolveBookNow(base);
    assert.ok(d.kind === 'ADD' && d.service.cartServiceId === A);
  });
  test('several -> the customer chooses', () => {
    const d = resolveBookNow({ ...base, services: [svc({}), svc({ id: B, serviceId: B })] });
    assert.ok(d.kind === 'CHOOSE' && d.services.length === 2);
  });
  test('cart already holds this worker -> continue to scheduling', () => {
    assert.strictEqual(resolveBookNow({ ...base, cartWorkerId: WORKER, cartItemCount: 2 }).kind, 'CONTINUE');
  });
  test("another worker's cart does not block choosing a service here (conflict is handled when adding)", () => {
    assert.strictEqual(resolveBookNow({ ...base, cartWorkerId: OTHER, cartItemCount: 1 }).kind, 'ADD');
  });
  test('an empty cart that remembers this worker still asks for a service', () => {
    assert.strictEqual(resolveBookNow({ ...base, cartWorkerId: WORKER, cartItemCount: 0 }).kind, 'ADD');
  });
  test('unavailable beats everything else (checked before the cart)', () => {
    assert.strictEqual(resolveBookNow({ ...base, availability: 'BUSY', cartWorkerId: WORKER, cartItemCount: 1 }).kind, 'UNAVAILABLE');
    assert.ok(unavailableMessage('', 'BUSY').startsWith('This professional'));
  });
});

import { selectionProblem, selectionSubtotal, type BookableService } from '../../src/utils/bookNow.ts';

const b = (id: string, price: number, priceType: 'fixed' | 'hourly' = 'fixed'): BookableService =>
  ({ cartServiceId: id, name: id, price, priceType, durationMins: null });

describe('multi-select rules', () => {
  test('several fixed-price services are fine', () => {
    assert.strictEqual(selectionProblem([b('a', 500), b('b', 700)]), null);
    assert.strictEqual(selectionSubtotal([b('a', 500), b('b', 700)]), 1200);
  });
  test('hourly + fixed cannot be booked together', () => {
    assert.ok(selectionProblem([b('a', 500), b('b', 800, 'hourly')]));
  });
  test('hourly services need the same rate', () => {
    assert.ok(selectionProblem([b('a', 800, 'hourly'), b('b', 900, 'hourly')]));
    assert.strictEqual(selectionProblem([b('a', 800, 'hourly'), b('b', 800, 'hourly')]), null);
  });
  test('nothing selected is not a problem (the button is simply disabled)', () => {
    assert.strictEqual(selectionProblem([]), null);
  });
});
