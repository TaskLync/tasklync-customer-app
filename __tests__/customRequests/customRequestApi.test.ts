import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  CustomRequestStatus,
  QuoteStatus,
  QuotePricingType,
} from '../../src/types/customRequest.types.ts';
import type {
  CreateCustomRequestDto,
  CreateBookingFromQuoteDto,
} from '../../src/types/customRequest.types.ts';

describe('Custom Service Request & Quote DTO Validation', () => {
  test('validates CreateCustomRequestDto shape matching backend schema', () => {
    const dto: CreateCustomRequestDto = {
      worker_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      category_id: 'electrician',
      title: 'Main circuit breaker tripping intermittently',
      description: 'Every time the AC turns on, the main DB breaker trips. Need full inspection.',
      address_id: '4a7b5d2e-1c3f-4e5a-8b9d-0f1e2d3c4b5a',
      address_text: 'House 42, Street 5, Gulberg III, Lahore',
      latitude: 31.5204,
      longitude: 74.3587,
      preferred_date: '2026-10-25',
      preferred_time_slot: '10:00-12:00',
      media: [
        {
          media_type: 'IMAGE',
          media_url: 'https://res.cloudinary.com/tasklync/image/upload/v1729240000/requests/db_breaker.jpg',
          cloudinary_public_id: 'requests/db_breaker',
          file_size_bytes: 1420500,
        },
      ],
    };

    assert.strictEqual(dto.worker_id, '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
    assert.strictEqual(dto.media?.length, 1);
    assert.strictEqual(dto.media?.[0].media_type, 'IMAGE');
    assert.ok(dto.title.length >= 5);
    assert.ok(dto.description.length >= 10);
  });

  test('validates CreateBookingFromQuoteDto payload', () => {
    const dto: CreateBookingFromQuoteDto = {
      quote_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      scheduled_at: '2026-10-26T05:00:00.000Z',
      duration_hours: 2.0,
      address_id: '4a7b5d2e-1c3f-4e5a-8b9d-0f1e2d3c4b5a',
      address_text: 'House 42, Street 5, Gulberg III, Lahore',
      latitude: 31.5204,
      longitude: 74.3587,
      payment_method: 'CASH_ON_DELIVERY',
    };

    assert.strictEqual(dto.payment_method, 'CASH_ON_DELIVERY');
    assert.strictEqual(dto.duration_hours, 2.0);
    assert.ok(dto.scheduled_at.endsWith('Z'));
  });

  test('verifies all CustomRequestStatus state transitions exist', () => {
    const states = [
      CustomRequestStatus.SUBMITTED,
      CustomRequestStatus.UNDER_REVIEW,
      CustomRequestStatus.CLARIFICATION_REQUESTED,
      CustomRequestStatus.QUOTE_SENT,
      CustomRequestStatus.ACCEPTED,
      CustomRequestStatus.CONVERTED,
      CustomRequestStatus.DECLINED,
      CustomRequestStatus.CANCELLED,
      CustomRequestStatus.EXPIRED,
    ];
    assert.strictEqual(states.length, 9);
  });

  test('verifies all QuoteStatus states exist', () => {
    const quoteStates = [
      QuoteStatus.SENT,
      QuoteStatus.ACCEPTED,
      QuoteStatus.REJECTED,
      QuoteStatus.SUPERSEDED,
      QuoteStatus.WITHDRAWN,
      QuoteStatus.EXPIRED,
    ];
    assert.strictEqual(quoteStates.length, 6);
  });
});
