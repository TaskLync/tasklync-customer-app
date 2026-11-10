/**
 * Where the floating cart banner may appear. One pure rule, no React, unit tested.
 *
 * Visibility is DERIVED, never stored. The banner shows only when ALL hold:
 *   1. the session is restored and the customer is signed in (never on Splash / Welcome / Login /
 *      OTP / registration / any unauthenticated stack, and not while auth is still initializing);
 *   2. the active route is an allow-listed browsing screen where opening the cart is relevant;
 *   3. there is something in the cart.
 *
 * Cart DATA is untouched by this: the banner being hidden does not clear or change the cart.
 * An allow-list (not a deny-list) so a newly added screen never shows the banner by accident.
 */

/** First route segment of screens that may show the banner. */
export const CART_BANNER_ROUTES: readonly string[] = [
  '(tabs)', // home, explore, bookings, messages, profile
  'service',
  'category',
  'worker',
  'company',
];

export interface CartBannerInput {
  /** isSessionState(authState): restored AND signed in (also true while refreshing / briefly offline). */
  isSignedIn: boolean;
  /** expo-router useSegments(): ['(tabs)', 'explore'], ['(auth)', 'welcome'], [] ... */
  segments: readonly string[];
  itemCount: number;
}

export function isCartBannerVisible({ isSignedIn, segments, itemCount }: CartBannerInput): boolean {
  if (itemCount <= 0) return false;
  if (!isSignedIn) return false;
  const root = segments[0];
  return typeof root === 'string' && CART_BANNER_ROUTES.includes(root);
}
