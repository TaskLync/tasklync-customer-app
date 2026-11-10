/**
 * "Book Now" on a worker profile: what should the tap do? Pure, no React, unit tested.
 *
 * It only DECIDES; the prices it carries are the worker's configured prices (WorkerServiceOffering),
 * used to fill the cart. The checkout (schedule -> address -> summary) asks the server for the real
 * price and the server re-prices every line, so nothing here is trusted as final.
 */
import type { WorkerAvailabilityStatus, WorkerServiceOffering } from '../types/worker.types';
import { isValidUUID } from './uuid';

export interface BookableService {
  /** id the cart and booking-service price against (services.id, else the offering id) */
  cartServiceId: string;
  name: string;
  price: number;
  priceType: 'fixed' | 'hourly';
  durationMins: number | null;
}

/**
 * A service can be booked directly when it has a real fixed/hourly price and a valid id.
 * Quote-priced services go through "Request a custom quote", never the cart.
 */
export function toBookableServices(services: readonly WorkerServiceOffering[] | null | undefined): BookableService[] {
  const out: BookableService[] = [];
  for (const s of services ?? []) {
    const id = s.serviceId || s.id;
    const price = Number(s.customPrice);
    if (s.priceType === 'quote') continue;
    if (!isValidUUID(id) || !Number.isFinite(price) || price <= 0) continue;
    out.push({
      cartServiceId: id,
      name: s.serviceName,
      price,
      priceType: s.priceType === 'hourly' ? 'hourly' : 'fixed',
      durationMins: s.durationMins ?? null,
    });
  }
  return out;
}

export type BookNowDecision =
  | { kind: 'SIGN_IN' }
  | { kind: 'UNAVAILABLE'; message: string }
  | { kind: 'NO_SERVICES'; message: string; canRequestQuote: boolean }
  /** The cart already holds this worker's services: go straight to scheduling. */
  | { kind: 'CONTINUE' }
  | { kind: 'ADD'; service: BookableService }
  | { kind: 'CHOOSE'; services: BookableService[] };

export interface BookNowInput {
  isSignedIn: boolean;
  workerName: string;
  availability: WorkerAvailabilityStatus;
  services: readonly WorkerServiceOffering[] | null | undefined;
  workerId: string;
  cartWorkerId: string | null | undefined;
  cartItemCount: number;
}

export function unavailableMessage(name: string, status: WorkerAvailabilityStatus): string {
  const who = name || 'This professional';
  switch (status) {
    case 'BUSY':
      return `${who} is on a job right now. Try again a little later.`;
    case 'OFFLINE':
      return `${who} is offline right now. Try again later.`;
    case 'PAUSED':
      return `${who} is not taking bookings at the moment.`;
    default:
      return `${who} is not available for booking right now.`;
  }
}

export function resolveBookNow(i: BookNowInput): BookNowDecision {
  if (!i.isSignedIn) return { kind: 'SIGN_IN' };
  if (i.availability !== 'AVAILABLE') {
    return { kind: 'UNAVAILABLE', message: unavailableMessage(i.workerName, i.availability) };
  }
  if (i.cartItemCount > 0 && i.cartWorkerId === i.workerId) return { kind: 'CONTINUE' };

  const bookable = toBookableServices(i.services);
  if (bookable.length === 0) {
    const hasQuote = (i.services ?? []).some((s) => s.priceType === 'quote');
    return {
      kind: 'NO_SERVICES',
      canRequestQuote: true,
      message: hasQuote
        ? `${i.workerName || 'This professional'} prices jobs by quote. Request a custom quote to continue.`
        : `${i.workerName || 'This professional'} has no bookable services yet. You can request a custom quote.`,
    };
  }
  if (bookable.length === 1) return { kind: 'ADD', service: bookable[0]! };
  return { kind: 'CHOOSE', services: bookable };
}

/**
 * Services chosen together must be priceable as ONE booking. The server bills hourly work as
 * rate x duration, so it can't combine hourly with fixed-price services, or hourly services with
 * different rates (see cart-pricing.service.ts). Returns the reason, or null when the set is fine.
 */
export function selectionProblem(selected: readonly BookableService[]): string | null {
  const hourly = selected.filter((s) => s.priceType === 'hourly');
  if (hourly.length === 0) return null;
  if (hourly.length !== selected.length) {
    return 'Hourly and fixed-price services need separate bookings. Choose one kind.';
  }
  if (hourly.some((s) => s.price !== hourly[0]!.price)) {
    return 'Hourly services with different rates need separate bookings. Choose one.';
  }
  return null;
}

/** Sum shown under the picker (display only; the server prices the booking). */
export function selectionSubtotal(selected: readonly BookableService[]): number {
  return selected.reduce((a, s) => a + s.price, 0);
}
