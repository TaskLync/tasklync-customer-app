import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '../services/api/booking.api';
import { VerificationOtpData, VerificationQrData } from '../types/booking.types';
import { mapVerificationError, VerificationErrorState } from '../utils/verificationState.util';
import { generateQrSvgPath, QrSvgPathData } from '../utils/qrCode.util';

interface UseVerificationOtpResult {
  otpData: VerificationOtpData | null;
  otp: string | null;
  remainingSeconds: number;
  isExpired: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  error: VerificationErrorState | null;
  refreshOtp: () => Promise<void>;
}

interface UseVerificationQrResult {
  qrData: VerificationQrData | null;
  qrToken: string | null;
  svgData: QrSvgPathData | null;
  remainingSeconds: number;
  isExpired: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  error: VerificationErrorState | null;
  refreshQr: () => Promise<void>;
}

/**
 * Calculates remaining seconds between now and an ISO date string
 */
function calculateRemainingSeconds(expiresAtIso?: string, fallbackSecs?: number): number {
  if (expiresAtIso) {
    const diff = Math.floor((new Date(expiresAtIso).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }
  return typeof fallbackSecs === 'number' && Number.isFinite(fallbackSecs) ? Math.max(0, fallbackSecs) : 0;
}

/**
 * Production-grade hook for managing booking start OTP verification.
 * Automatically synchronizes with server expiration and handles countdowns cleanly.
 */
export function useBookingVerificationOtp(
  bookingId: string | undefined,
  isEligible: boolean
): UseVerificationOtpResult {
  const lastRefreshTimestamp = useRef<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const query = useQuery({
    queryKey: ['booking-verification-otp', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await bookingApi.getVerificationOtp(bookingId);
    },
    enabled: Boolean(bookingId) && isEligible,
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      const err = mapVerificationError(error);
      if (err.isFatal || err.isAlreadyStarted) return false;
      return failureCount < 2;
    },
  });

  const otpData = query.data ?? null;

  // Sync remaining countdown when new data arrives
  useEffect(() => {
    if (otpData) {
      const initialSecs = calculateRemainingSeconds(otpData.expires_at, otpData.expires_in);
      setRemainingSeconds(initialSecs);
    }
  }, [otpData]);

  // Tick countdown timer every second
  useEffect(() => {
    if (!otpData || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [otpData, remainingSeconds]);

  const isExpired = Boolean(otpData && remainingSeconds <= 0);

  // Debounced refresh handler to prevent rapid spamming (min 2.5s between requests)
  const refreshOtp = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTimestamp.current < 2500) {
      return;
    }
    lastRefreshTimestamp.current = now;
    await query.refetch();
  }, [query]);

  const errorState = query.error ? mapVerificationError(query.error) : null;

  return {
    otpData,
    otp: otpData?.otp ?? null,
    remainingSeconds,
    isExpired,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: errorState,
    refreshOtp,
  };
}

/**
 * Production-grade hook for managing booking start QR verification.
 * Pre-computes crisp SVG vector paths and handles expiration tickers.
 */
export function useBookingVerificationQr(
  bookingId: string | undefined,
  isEligible: boolean,
  isSheetOpen: boolean
): UseVerificationQrResult {
  const lastRefreshTimestamp = useRef<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Enabled only when the parent booking is eligible AND the customer opens the QR sheet
  const query = useQuery({
    queryKey: ['booking-verification-qr', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await bookingApi.getVerificationQr(bookingId);
    },
    enabled: Boolean(bookingId) && isEligible && isSheetOpen,
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      const err = mapVerificationError(error);
      if (err.isFatal || err.isAlreadyStarted) return false;
      return failureCount < 2;
    },
  });

  const qrData = query.data ?? null;

  // Synchronize countdown timer
  useEffect(() => {
    if (qrData) {
      const initialSecs = calculateRemainingSeconds(qrData.expires_at, qrData.expires_in);
      setRemainingSeconds(initialSecs);
    }
  }, [qrData]);

  // Tick countdown timer
  useEffect(() => {
    if (!qrData || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData, remainingSeconds]);

  const isExpired = Boolean(qrData && remainingSeconds <= 0);

  // Generate crisp vector SVG path from the real backend token
  const svgData: QrSvgPathData | null = qrData?.qr_token
    ? generateQrSvgPath(qrData.qr_token, 2)
    : null;

  // Debounced refresh handler
  const refreshQr = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTimestamp.current < 2500) {
      return;
    }
    lastRefreshTimestamp.current = now;
    await query.refetch();
  }, [query]);

  const errorState = query.error ? mapVerificationError(query.error) : null;

  return {
    qrData,
    qrToken: qrData?.qr_token ?? null,
    svgData,
    remainingSeconds,
    isExpired,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: errorState,
    refreshQr,
  };
}
