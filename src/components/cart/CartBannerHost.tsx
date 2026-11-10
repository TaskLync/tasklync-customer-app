import { useEffect } from 'react';
import { useSegments } from 'expo-router';
import { useAuthStore, isSessionState } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { isCartBannerVisible } from './cartBannerVisibility';
import { FloatingCartBar } from './FloatingCartBar';

/**
 * The single place that decides whether the cart banner exists. Mounted once in the root layout.
 * Visibility comes from (auth status, active route group, cart contents); the banner is not
 * rendered at all otherwise, so it cannot flash on Welcome / login screens or during startup.
 * Cart persistence is separate: it is restored here regardless of visibility so totals are
 * correct the moment the customer reaches an eligible screen.
 */
export function CartBannerHost() {
  const segments = useSegments();
  const isSignedIn = useAuthStore((s) => isSessionState(s.authState));
  const itemCount = useCartStore((s) => s.items.length);

  useEffect(() => {
    useCartStore.getState().hydrate();
  }, []);

  if (!isCartBannerVisible({ isSignedIn, segments, itemCount })) return null;
  return <FloatingCartBar />;
}
