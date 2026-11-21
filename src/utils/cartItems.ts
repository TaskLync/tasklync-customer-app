/**
 * Single-instance service selection. TaskLync books each service once: a cart may hold many DIFFERENT
 * services, but never the same service twice and never a "quantity". Pure helpers (no React, no storage)
 * shared by the cart store, the pricing quote and booking creation, so all of them agree.
 */
import type { CartItem } from '../store/cart.store';

/**
 * One line per service, quantity 1. Used when a saved cart is loaded: carts stored by older app builds
 * may hold "× 44" quantities or the same service twice. The first line of each service is kept.
 */
export function toSingleInstanceItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CartItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const i = r as Partial<CartItem>;
    if (typeof i.serviceId !== 'string' || !i.serviceId || seen.has(i.serviceId)) continue;
    seen.add(i.serviceId);
    out.push({
      serviceId: i.serviceId,
      serviceName: String(i.serviceName ?? ''),
      price: Number(i.price) || 0,
      quantity: 1,
      workerId: String(i.workerId ?? ''),
      ...(i.durationMins !== undefined ? { durationMins: i.durationMins } : {}),
      ...(i.durationHours !== undefined ? { durationHours: i.durationHours } : {}),
    });
  }
  return out;
}

/** The `items` the booking / pricing APIs receive: each selected service once, quantity 1. */
export function toServiceLines(items: ReadonlyArray<{ serviceId: string }>): { service_id: string; quantity: 1 }[] {
  const seen = new Set<string>();
  const out: { service_id: string; quantity: 1 }[] = [];
  for (const i of items) {
    if (!i.serviceId || seen.has(i.serviceId)) continue;
    seen.add(i.serviceId);
    out.push({ service_id: i.serviceId, quantity: 1 });
  }
  return out;
}
