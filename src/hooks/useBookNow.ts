import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore, isSessionState } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import {
  resolveBookNow,
  type BookableService,
} from '../utils/bookNow';
import type { WorkerPublicProfile, WorkerServiceOffering } from '../types/worker.types';

export interface BookNowNotice {
  text: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}

/**
 * Book Now for a worker profile. Reuses the existing booking flow end to end:
 *   cart (worker + service) -> /booking/schedule -> /booking/address -> /booking/summary -> payment.
 * Nothing is created here; the booking itself is created by the summary screen via useCreateBooking.
 */
export function useBookNow(worker: WorkerPublicProfile | undefined, services: WorkerServiceOffering[]) {
  const router = useRouter();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserServices, setChooserServices] = useState<BookableService[]>([]);
  const [conflictServices, setConflictServices] = useState<BookableService[] | null>(null);
  const [notice, setNotice] = useState<BookNowNotice | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  // Synchronous guard: two taps in the same frame must not both navigate / add.
  const busy = useRef(false);

  const release = useCallback(() => {
    // keep the lock a moment past navigation so a double tap on the old screen is absorbed
    setTimeout(() => {
      busy.current = false;
      setIsStarting(false);
    }, 700);
  }, []);

  const goToSchedule = useCallback(() => {
    router.push('/booking/schedule' as any);
    release();
  }, [router, release]);

  const itemFor = useCallback(
    (s: BookableService) => ({
      serviceId: s.cartServiceId,
      serviceName: s.name,
      price: s.price,
      workerId: worker!.id,
      workerName: worker!.name,
      workerAvatar: worker!.avatarUrl ?? null,
      workerRating: worker!.avgRating,
      ...(worker!.categories?.[0] ? { workerCategory: worker!.categories[0] } : {}),
      isVerified: worker!.isVerified,
      ...(s.durationMins ? { durationMins: s.durationMins } : {}),
    }),
    [worker]
  );

  /** Services were chosen (or there was only one): put them in the cart and continue. */
  const addAndContinue = useCallback(
    (chosen: BookableService[]) => {
      if (!worker || chosen.length === 0 || busy.current) return;
      busy.current = true;
      setIsStarting(true);
      const cart = useCartStore.getState();
      const [first, ...rest] = chosen as [BookableService, ...BookableService[]];
      const res = cart.addItem(itemFor(first));
      if (res.hasConflict) {
        // the cart holds another professional's services: ask before replacing it
        setChooserOpen(false);
        setConflictServices(chosen);
        busy.current = false;
        setIsStarting(false);
        return;
      }
      for (const s of rest) cart.addItem(itemFor(s));
      setChooserOpen(false);
      goToSchedule();
    },
    [worker, itemFor, goToSchedule]
  );

  const start = useCallback(() => {
    if (!worker || busy.current) return;
    busy.current = true;
    setIsStarting(true);
    setNotice(null);

    const cart = useCartStore.getState();
    const decision = resolveBookNow({
      isSignedIn: isSessionState(useAuthStore.getState().authState),
      workerName: worker.name,
      availability: worker.availabilityStatus,
      services,
      workerId: worker.id,
      cartWorkerId: cart.worker?.id,
      cartItemCount: cart.items.length,
    });

    const stop = () => {
      busy.current = false;
      setIsStarting(false);
    };

    switch (decision.kind) {
      case 'SIGN_IN':
        stop();
        router.push('/(auth)/phone' as any);
        return;
      case 'UNAVAILABLE':
        stop();
        setNotice({ text: decision.message });
        return;
      case 'NO_SERVICES':
        stop();
        setNotice({
          text: decision.message,
          actionLabel: decision.canRequestQuote ? 'Request quote' : undefined,
          onAction: () =>
            router.push({
              pathname: '/custom-request/new' as any,
              params: { workerId: worker.id, categoryId: worker.categories?.[0] || '' },
            }),
        });
        return;
      case 'CONTINUE':
        goToSchedule();
        return;
      case 'ADD':
        busy.current = false;
        addAndContinue([decision.service]);
        return;
      case 'CHOOSE':
        setChooserServices(decision.services);
        setChooserOpen(true);
        stop();
        return;
    }
  }, [worker, services, router, goToSchedule, addAndContinue]);

  const confirmReplaceCart = useCallback(() => {
    const chosen = conflictServices;
    setConflictServices(null);
    if (!chosen || chosen.length === 0 || !worker || busy.current) return;
    busy.current = true;
    setIsStarting(true);
    const [first, ...rest] = chosen as [BookableService, ...BookableService[]];
    const cart = useCartStore.getState();
    cart.replaceCart(itemFor(first));
    for (const s of rest) cart.addItem(itemFor(s));
    goToSchedule();
  }, [conflictServices, worker, itemFor, goToSchedule]);

  return {
    start,
    isStarting,
    notice,
    dismissNotice: () => setNotice(null),
    chooser: {
      visible: chooserOpen,
      services: chooserServices,
      onConfirm: addAndContinue,
      onClose: () => setChooserOpen(false),
    },
    conflict: {
      visible: conflictServices !== null,
      onCancel: () => setConflictServices(null),
      onReplace: confirmReplaceCart,
    },
  };
}
