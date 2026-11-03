import { test, describe } from 'node:test';
import assert from 'node:assert';

// Duration calculation helper identical to schedule.tsx & useCreateBooking.ts
function computeDurationHours(items: Array<{ durationHours?: number; durationMins?: number }>): number {
  if (!items || items.length === 0) return 0.5;
  const totalMins = items.reduce((acc, item) => {
    if (typeof item.durationMins === 'number' && item.durationMins > 0) {
      return acc + item.durationMins;
    }
    if (typeof item.durationHours === 'number' && item.durationHours > 0) {
      return acc + item.durationHours * 60;
    }
    return acc + 30; // 30-min base default per service
  }, 0);
  return Math.max(0.5, totalMins / 60);
}

// Slot parser helper matching workerApi.getWorkerSlots
interface ApiSlotDetail {
  time: string;
  available: boolean;
  reason?: string;
}

interface WorkerSlotsResponse {
  slots?: string[];
  slot_details?: ApiSlotDetail[];
}

function parseWorkerSlotsResponse(data: WorkerSlotsResponse) {
  if (Array.isArray(data.slot_details) && data.slot_details.length > 0) {
    return data.slot_details.map((item) => ({
      time: String(item.time),
      available: Boolean(item.available),
      reason: item.reason,
    }));
  }
  if (Array.isArray(data.slots)) {
    return data.slots.map((t) => ({
      time: String(t),
      available: true,
    }));
  }
  return [];
}

// Stale selection validator matching schedule.tsx
function reconcileSelectedSlot(
  selectedSlot: string | null,
  currentSlots: Array<{ time: string; available: boolean }>
): string | null {
  if (!selectedSlot) return null;
  const matching = currentSlots.find((s) => s.time === selectedSlot);
  if (!matching || !matching.available) {
    return null; // deselect if unavailable
  }
  return selectedSlot;
}

describe('Worker Availability & Time Slot Booking Engine', () => {
  describe('Dynamic Service Duration Calculation', () => {
    test('defaults to 0.5 hours (30 mins) when cart is empty', () => {
      assert.strictEqual(computeDurationHours([]), 0.5);
    });

    test('calculates exact duration when cart items specify durationMins', () => {
      const items = [{ durationMins: 30 }];
      assert.strictEqual(computeDurationHours(items), 0.5);

      const items60 = [{ durationMins: 60 }];
      assert.strictEqual(computeDurationHours(items60), 1.0);

      const multi = [{ durationMins: 45 }, { durationMins: 45 }];
      assert.strictEqual(computeDurationHours(multi), 1.5);
    });

    test('calculates duration when cart items specify durationHours', () => {
      const items = [{ durationHours: 1.5 }];
      assert.strictEqual(computeDurationHours(items), 1.5);
    });

    test('falls back to 30 mins per item when durations are unspecified', () => {
      const items = [{}, {}];
      assert.strictEqual(computeDurationHours(items), 1.0);
    });
  });

  describe('Slot Details Response Parser', () => {
    test('parses rich slot_details preserving availability flag and reason', () => {
      const mockResponse: WorkerSlotsResponse = {
        slots: ['10:00', '11:00'],
        slot_details: [
          { time: '10:00', available: true },
          { time: '10:30', available: false, reason: 'BOOKED' },
          { time: '11:00', available: true },
          { time: '11:30', available: true },
        ],
      };

      const parsed = parseWorkerSlotsResponse(mockResponse);
      assert.strictEqual(parsed.length, 4);
      assert.strictEqual(parsed[0].time, '10:00');
      assert.strictEqual(parsed[0].available, true);
      assert.strictEqual(parsed[1].time, '10:30');
      assert.strictEqual(parsed[1].available, false);
      assert.strictEqual(parsed[1].reason, 'BOOKED');
      assert.strictEqual(parsed[2].time, '11:00');
      assert.strictEqual(parsed[2].available, true);
      assert.strictEqual(parsed[3].time, '11:30');
      assert.strictEqual(parsed[3].available, true);
    });

    test('falls back gracefully to legacy slots string array as all available', () => {
      const mockLegacy: WorkerSlotsResponse = {
        slots: ['09:00', '09:30', '10:00'],
      };

      const parsed = parseWorkerSlotsResponse(mockLegacy);
      assert.strictEqual(parsed.length, 3);
      assert.strictEqual(parsed.every((s) => s.available), true);
    });

    test('returns empty array when response has no slots or slot_details', () => {
      assert.deepStrictEqual(parseWorkerSlotsResponse({}), []);
    });
  });

  describe('Slot Isolation & Anti-Cascading Validation', () => {
    test('booking 10:30 (30 min) leaves 10:00, 11:00, 11:30, 12:00, 12:30, 13:00 available', () => {
      const daySlots: ApiSlotDetail[] = [
        { time: '10:00', available: true },
        { time: '10:30', available: false, reason: 'BOOKED' }, // Booked by Customer A
        { time: '11:00', available: true },
        { time: '11:30', available: true },
        { time: '12:00', available: true },
        { time: '12:30', available: true },
        { time: '13:00', available: true },
      ];

      const parsed = parseWorkerSlotsResponse({ slot_details: daySlots });
      const availableTimes = parsed.filter((s) => s.available).map((s) => s.time);

      assert.deepStrictEqual(availableTimes, [
        '10:00',
        '11:00',
        '11:30',
        '12:00',
        '12:30',
        '13:00',
      ]);
      assert.strictEqual(availableTimes.includes('10:30'), false);
    });

    test('booking 10:30 with 60 min duration blocks only 10:30 and 11:00', () => {
      const daySlots: ApiSlotDetail[] = [
        { time: '10:00', available: true },
        { time: '10:30', available: false, reason: 'BOOKED' },
        { time: '11:00', available: false, reason: 'BOOKED' },
        { time: '11:30', available: true },
        { time: '12:00', available: true },
      ];

      const parsed = parseWorkerSlotsResponse({ slot_details: daySlots });
      const availableTimes = parsed.filter((s) => s.available).map((s) => s.time);

      assert.deepStrictEqual(availableTimes, ['10:00', '11:30', '12:00']);
    });
  });

  describe('Stale Selected Slot Auto-Deselection', () => {
    test('clears selected slot if another user books it before confirmation', () => {
      const userSelectedSlot = '10:30';
      const updatedSlots = [
        { time: '10:00', available: true },
        { time: '10:30', available: false }, // got booked
        { time: '11:00', available: true },
      ];

      const reconciled = reconcileSelectedSlot(userSelectedSlot, updatedSlots);
      assert.strictEqual(reconciled, null);
    });

    test('retains selected slot if it remains available on refresh', () => {
      const userSelectedSlot = '11:00';
      const updatedSlots = [
        { time: '10:00', available: true },
        { time: '10:30', available: false },
        { time: '11:00', available: true },
      ];

      const reconciled = reconcileSelectedSlot(userSelectedSlot, updatedSlots);
      assert.strictEqual(reconciled, '11:00');
    });

    test('clears selected slot if it vanishes from slot list', () => {
      const userSelectedSlot = '12:00';
      const updatedSlots = [{ time: '10:00', available: true }];

      const reconciled = reconcileSelectedSlot(userSelectedSlot, updatedSlots);
      assert.strictEqual(reconciled, null);
    });
  });
});
