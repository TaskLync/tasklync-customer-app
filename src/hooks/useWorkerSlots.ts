import { useState, useEffect, useCallback } from 'react';
import { workerApi } from '../services/api/worker.api';

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
  durationHours: number = 2
) {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchSlots = useCallback(async () => {
    // Guard: skip the request if either precondition is missing so we never
    // emit a GET /workers/default/slots or /workers/undefined/slots request.
    if (!dateStr || !isValidWorkerId(workerId)) {
      setSlots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const fetchedSlots = await workerApi.getWorkerSlots(workerId, dateStr, durationHours);
      setSlots(fetchedSlots);
    } catch (err) {
      setIsError(true);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateStr, workerId, durationHours]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return {
    slots,
    isLoading,
    isError,
    refetch: fetchSlots,
  };
}
