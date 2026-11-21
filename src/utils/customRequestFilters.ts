import { CustomRequestStatus } from '../types/customRequest.types';

/**
 * Custom Quotes filters on the Bookings screen. Membership is unchanged from the original screen
 * logic; it lives here so the chip counts and the list can never disagree.
 * Note: "In Review" means "still open", so it also contains Quote Ready and Accepted requests.
 */
export type RequestFilter = 'ALL' | 'QUOTE_READY' | 'ACTIVE' | 'RESOLVED';

const OPEN = new Set<string>([
  CustomRequestStatus.SUBMITTED,
  CustomRequestStatus.UNDER_REVIEW,
  CustomRequestStatus.CLARIFICATION_REQUESTED,
  CustomRequestStatus.QUOTE_SENT,
  CustomRequestStatus.ACCEPTED,
]);

const CLOSED = new Set<string>([
  CustomRequestStatus.CONVERTED,
  CustomRequestStatus.DECLINED,
  CustomRequestStatus.CANCELLED,
  CustomRequestStatus.EXPIRED,
]);

export function matchesRequestFilter(status: string, filter: RequestFilter): boolean {
  switch (filter) {
    case 'ALL':
      return true;
    case 'QUOTE_READY':
      return status === CustomRequestStatus.QUOTE_SENT;
    case 'ACTIVE':
      return OPEN.has(status);
    case 'RESOLVED':
      return CLOSED.has(status);
  }
}

export function countByRequestFilter(items: { status: string }[]): Record<RequestFilter, number> {
  const counts: Record<RequestFilter, number> = { ALL: 0, QUOTE_READY: 0, ACTIVE: 0, RESOLVED: 0 };
  for (const r of items) {
    counts.ALL++;
    if (matchesRequestFilter(r.status, 'QUOTE_READY')) counts.QUOTE_READY++;
    if (matchesRequestFilter(r.status, 'ACTIVE')) counts.ACTIVE++;
    if (matchesRequestFilter(r.status, 'RESOLVED')) counts.RESOLVED++;
  }
  return counts;
}

export type BadgeTone = 'amber' | 'green' | 'neutral' | 'muted' | 'info' | 'danger';

/** Status → label + restrained tone. Labels are unchanged; EXPIRED (previously raw) is now "Expired". */
export function requestStatusBadge(status: string): { label: string; tone: BadgeTone } {
  switch (status) {
    case CustomRequestStatus.SUBMITTED:
      return { label: 'Submitted', tone: 'amber' };
    case CustomRequestStatus.UNDER_REVIEW:
      return { label: 'Under review', tone: 'neutral' };
    case CustomRequestStatus.CLARIFICATION_REQUESTED:
      return { label: 'Chat needed', tone: 'info' };
    case CustomRequestStatus.QUOTE_SENT:
      return { label: 'Quote ready', tone: 'green' };
    case CustomRequestStatus.ACCEPTED:
      return { label: 'Accepted', tone: 'green' };
    case CustomRequestStatus.CONVERTED:
      return { label: 'Booked', tone: 'green' };
    case CustomRequestStatus.DECLINED:
      return { label: 'Declined', tone: 'danger' };
    case CustomRequestStatus.CANCELLED:
      return { label: 'Cancelled', tone: 'muted' };
    case CustomRequestStatus.EXPIRED:
      return { label: 'Expired', tone: 'muted' };
    default:
      return { label: status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), tone: 'muted' };
  }
}
