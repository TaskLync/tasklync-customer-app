import { useState, useMemo, useCallback, useEffect } from 'react';
import { useBookingDraftStore } from '../store/bookingDraft.store';
import { workerApi } from '../services/api/worker.api';
import { getPKTTodayDateString } from '../utils/timezone';
import { onAvailabilityInvalidated } from '../utils/availabilityEvents';

export interface CalendarDayItem {
  dateStr: string; // Format: YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean; // Before today's date
  isSunday: boolean;
  isAvailable: boolean; // Real-time DB availability
  month: number; // 0-indexed (0 = Jan)
  year: number;
}

export function formatYYYYMMDD(year: number, monthZeroIndexed: number, day: number): string {
  const m = String(monthZeroIndexed + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  const daysPerMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysPerMonth[monthZeroIndexed];
}

export function useCalendarMonth(initialDateStr?: string, workerId?: string | null) {
  // Derive current calendar date strictly in Pakistan Standard Time (PKT, Asia/Karachi, UTC+5)
  const todayStr = useMemo(() => getPKTTodayDateString(), []);
  const [todayYear, todayMonth] = useMemo(() => {
    const [y, m] = todayStr.split('-').map((num) => parseInt(num, 10));
    return [y, m - 1];
  }, [todayStr]);

  // Read selected date from store
  const storeSelectedDate = useBookingDraftStore((s) => s.selectedDate);
  const setSelectedDateInStore = useBookingDraftStore((s) => s.setSelectedDate);

  // Parse initial visible month
  const initialYear = initialDateStr
    ? parseInt(initialDateStr.split('-')[0], 10)
    : storeSelectedDate
    ? parseInt(storeSelectedDate.split('-')[0], 10)
    : todayYear;

  const initialMonth = initialDateStr
    ? parseInt(initialDateStr.split('-')[1], 10) - 1
    : storeSelectedDate
    ? parseInt(storeSelectedDate.split('-')[1], 10) - 1
    : todayMonth;

  const [visibleYear, setVisibleYear] = useState<number>(initialYear);
  const [visibleMonth, setVisibleMonth] = useState<number>(initialMonth);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // Month availability state
  const [availableDatesSet, setAvailableDatesSet] = useState<Set<string>>(new Set());
  const [isAvailabilityLoaded, setIsAvailabilityLoaded] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // A different worker has a different calendar: never keep showing the previous worker's dates.
  useEffect(() => {
    setAvailableDatesSet(new Set());
    setIsAvailabilityLoaded(false);
  }, [workerId]);

  useEffect(() => {
    return onAvailabilityInvalidated((id) => {
      if (id === null || id === workerId) setRefreshTick((t) => t + 1);
    });
  }, [workerId]);

  // Fetch month availability when visible month/year or workerId changes.
  // Only runs when a valid UUID workerId is provided — never falls back to a
  // placeholder string so we don't emit 400s to /workers/default/…
  useEffect(() => {
    // Guard: require a non-empty workerId that is not the literal 'default'
    if (!workerId || workerId === 'default') {
      setAvailableDatesSet(new Set());
      setIsAvailabilityLoaded(false);
      return;
    }

    let isMounted = true;
    const fetchMonthAvail = async () => {
      try {
        const res = await workerApi.getWorkerMonthAvailability(
          workerId,
          visibleYear,
          visibleMonth + 1
        );
        if (isMounted) {
          setAvailableDatesSet(new Set(res.availableDates));
          setIsAvailabilityLoaded(true);
        }
      } catch {
        if (isMounted) {
          setAvailableDatesSet(new Set());
          setIsAvailabilityLoaded(false);
        }
      }
    };

    fetchMonthAvail();

    return () => {
      isMounted = false;
    };
  }, [workerId, visibleYear, visibleMonth, refreshTick]);

  // Check if we can navigate to previous month (cannot go prior to current month)
  const canGoPrev = useMemo(() => {
    if (visibleYear > todayYear) return true;
    if (visibleYear === todayYear && visibleMonth > todayMonth) return true;
    return false;
  }, [visibleYear, visibleMonth, todayYear, todayMonth]);

  const nextMonth = useCallback(() => {
    setSlideDirection('next');
    if (visibleMonth === 11) {
      setVisibleMonth(0);
      setVisibleYear((y) => y + 1);
    } else {
      setVisibleMonth((m) => m + 1);
    }
  }, [visibleMonth]);

  const prevMonth = useCallback(() => {
    if (!canGoPrev) return;
    setSlideDirection('prev');
    if (visibleMonth === 0) {
      setVisibleMonth(11);
      setVisibleYear((y) => y - 1);
    } else {
      setVisibleMonth((m) => m - 1);
    }
  }, [visibleMonth, canGoPrev]);

  const selectDate = useCallback(
    (dateStr: string) => {
      setSelectedDateInStore(dateStr);
    },
    [setSelectedDateInStore]
  );

  // Generate day items for the grid
  const daysArray = useMemo<CalendarDayItem[]>(() => {
    const days: CalendarDayItem[] = [];

    // 1st day of the visible month
    const firstDayInstance = new Date(visibleYear, visibleMonth, 1);
    const startWeekday = firstDayInstance.getDay(); // 0 = Sun, 1 = Mon ...

    const totalDaysInVisibleMonth = getDaysInMonth(visibleYear, visibleMonth);

    // Previous month padding
    const prevYear = visibleMonth === 0 ? visibleYear - 1 : visibleYear;
    const prevMonthIdx = visibleMonth === 0 ? 11 : visibleMonth - 1;
    const totalDaysInPrevMonth = getDaysInMonth(prevYear, prevMonthIdx);

    for (let i = startWeekday - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const dateStr = formatYYYYMMDD(prevYear, prevMonthIdx, dayNum);
      const isPast = dateStr < todayStr;
      const isSunday = (startWeekday - 1 - i) % 7 === 0;

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast,
        isSunday,
        isAvailable: false,
        month: prevMonthIdx,
        year: prevYear,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInVisibleMonth; dayNum++) {
      const dateStr = formatYYYYMMDD(visibleYear, visibleMonth, dayNum);
      const dayOfWeek = (startWeekday + dayNum - 1) % 7;
      const isPast = dateStr < todayStr;

      // Available if in current month, not past, and in real-time availableDatesSet (when loaded)
      const isAvailable = !isPast && (!isAvailabilityLoaded || availableDatesSet.has(dateStr));

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isPast,
        isSunday: dayOfWeek === 0,
        isAvailable,
        month: visibleMonth,
        year: visibleYear,
      });
    }

    // Next month padding to reach a multiple of 7 (35 or 42 cells total)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remainingCells = totalCells - days.length;
    const nextYear = visibleMonth === 11 ? visibleYear + 1 : visibleYear;
    const nextMonthIdx = visibleMonth === 11 ? 0 : visibleMonth + 1;

    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const dateStr = formatYYYYMMDD(nextYear, nextMonthIdx, dayNum);
      const isPast = dateStr < todayStr;
      const dayOfWeek = (days.length) % 7;

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast,
        isSunday: dayOfWeek === 0,
        isAvailable: false,
        month: nextMonthIdx,
        year: nextYear,
      });
    }

    return days;
  }, [visibleYear, visibleMonth, todayStr, availableDatesSet, isAvailabilityLoaded]);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const monthLabel = `${monthNames[visibleMonth]} ${visibleYear}`;

  return {
    visibleYear,
    visibleMonth,
    monthLabel,
    daysArray,
    selectedDate: storeSelectedDate,
    slideDirection,
    canGoPrev,
    nextMonth,
    prevMonth,
    selectDate,
  };
}
