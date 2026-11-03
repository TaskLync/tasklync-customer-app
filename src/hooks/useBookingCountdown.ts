import { useState, useEffect } from 'react';

export interface BookingCountdownResult {
  minutes: string;
  seconds: string;
  isExpired: boolean;
  formattedText: string;
}

export function useBookingCountdown(expiresAt: string | undefined): BookingCountdownResult {
  const calculate = (): BookingCountdownResult => {
    if (!expiresAt) {
      return {
        minutes: '00',
        seconds: '00',
        isExpired: true,
        formattedText: 'Expired',
      };
    }

    const expiryTime = new Date(expiresAt).getTime();
    if (isNaN(expiryTime)) {
      return {
        minutes: '00',
        seconds: '00',
        isExpired: true,
        formattedText: 'Expired',
      };
    }

    const now = Date.now();
    const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
    const isExpired = diff <= 0;
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    return {
      minutes: minsStr,
      seconds: secsStr,
      isExpired,
      formattedText: isExpired ? 'Expired' : `Expires in ${minsStr}:${secsStr}`,
    };
  };

  const [state, setState] = useState<BookingCountdownResult>(calculate);

  useEffect(() => {
    const initial = calculate();
    setState(initial);

    if (initial.isExpired || !expiresAt) {
      return;
    }

    const interval = setInterval(() => {
      const next = calculate();
      setState(next);
      if (next.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return state;
}
