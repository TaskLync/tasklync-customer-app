import { useState, useEffect, useCallback, useRef } from 'react';
import { workerApi } from '../services/api/worker.api';
import { normalizeDateToYYYYMMDD } from '../utils/timezone';
import { onAvailabilityInvalidated } from '../utils/availabilityEvents';

export interface SlotInfo {
  id: string;
  timeStr: string;
  available: boolean;
  isPeak?: boolean;
}

/** Validates that a string is a non-empty UUID v4 (or any UUID-shaped string). */
const isValidWorkerId = (id?: string | null): id is string =>
  typeof id === 'string' && id.trim().length > 0 && id !== 'default';

export function useWorkerSlots(
  dateStr: string | null,
  workerId?: string | null,
  durationHours: number = 0.5
) {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reqSequenceRef = useRef<number>(0);
  const lastKeyRef = useRef<string>('');

  const fetchSlots = useCallback(async () => {
    const formattedDate = normalizeDateToYYYYMMDD(dateStr);

    // Cancel any previous in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentSeq = ++reqSequenceRef.current;

    // Guard: skip request if precondition is missing
    if (!formattedDate || !isValidWorkerId(workerId)) {
      setSlots([]);
      setIsLoading(false);
      return;
    }

    // Never show another worker's (or another day's) slots while this one loads.
    const key = `${workerId}|${formattedDate}|${durationHours}`;
    if (lastKeyRef.current !== key) {
      lastKeyRef.current = key;
      setSlots([]);
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const fetchedSlots = await workerApi.getWorkerSlots(
        workerId,
        formattedDate,
        durationHours,
        controller.signal
      );

      // Only apply if this is still the latest request and not cancelled
      if (reqSequenceRef.current === currentSeq && fetchedSlots !== null) {
        setSlots(fetchedSlots);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (reqSequenceRef.current === currentSeq) {
        setIsError(true);
        setSlots([]);
        setIsLoading(false);
      }
    }
  }, [dateStr, workerId, durationHours]);

  useEffect(() => {
    fetchSlots();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSlots]);

  // Booking created / failed with a conflict for this worker -> pull fresh slots from the backend.
  useEffect(() => {
    return onAvailabilityInvalidated((id) => {
      if (id === null || id === workerId) fetchSlots();
    });
  }, [workerId, fetchSlots]);

  return {
    slots,
    isLoading,
    isError,
    refetch: fetchSlots,
  };
}
