import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();
const STORAGE_KEY = 'tasklync_booking_draft_session';

export interface BookingAddress {
  id: string;
  label?: string; // "Home", "Office", "Other"
  street: string;
  unit?: string;
  city: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  isDefault?: boolean;
}

export interface BookingDraftState {
  selectedDate: string | null; // Format: YYYY-MM-DD
  selectedTimeSlot: string | null; // e.g. "09:00 AM"
  workerId: string | null;
  addressId: string | null;
  address: BookingAddress | null;
  note: string;

  // Actions
  setSelectedDate: (date: string | null) => void;
  setSelectedTimeSlot: (slot: string | null) => void;
  setWorkerId: (workerId: string | null) => void;
  setAddressId: (addressId: string | null) => void;
  setAddress: (address: BookingAddress | null) => void;
  setNote: (note: string) => void;
  resetDraft: () => void;
  hydrate: () => void;
}

export const useBookingDraftStore = create<BookingDraftState>((set, get) => ({
  selectedDate: null,
  selectedTimeSlot: null,
  workerId: null,
  addressId: null,
  address: null,
  note: '',

  setSelectedDate: (selectedDate) => {
    const updatedSlot = get().selectedDate === selectedDate ? get().selectedTimeSlot : null;
    const newState = { selectedDate, selectedTimeSlot: updatedSlot };
    set(newState);
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
    } catch (_e) {}
  },

  setSelectedTimeSlot: (selectedTimeSlot) => {
    const newState = { selectedTimeSlot };
    set(newState);
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
    } catch (_e) {}
  },

  setWorkerId: (workerId) => {
    const newState = { workerId };
    set(newState);
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
    } catch (_e) {}
  },

  setAddressId: (addressId) => {
    const newState = { addressId };
    set(newState);
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
    } catch (_e) {}
  },

  setAddress: (address) => {
    const newState = { address, addressId: address?.id || null };
    set(newState);
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
    } catch (_e) {}
  },

  setNote: (note) => {
    const newState = { note };
    set(newState);
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
    } catch (_e) {}
  },

  resetDraft: () => {
    try {
      storage.remove(STORAGE_KEY);
    } catch (_e) {}
    set({
      selectedDate: null,
      selectedTimeSlot: null,
      workerId: null,
      addressId: null,
      address: null,
      note: '',
    });
  },

  hydrate: () => {
    try {
      const dataStr = storage.getString(STORAGE_KEY);
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        set({
          selectedDate: parsed.selectedDate || null,
          selectedTimeSlot: parsed.selectedTimeSlot || null,
          workerId: parsed.workerId || null,
          addressId: parsed.addressId || null,
          address: parsed.address || null,
          note: parsed.note || '',
        });
      }
    } catch (_e) {}
  },
}));
