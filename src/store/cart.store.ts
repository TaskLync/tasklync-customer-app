import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

export interface CartItem {
  serviceId: string;
  serviceName: string;
  price: number;
  quantity: number;
  workerId: string;
  durationMins?: number | undefined;
  durationHours?: number | undefined;
}

export interface WorkerInfo {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avgRating?: number;
  category?: string;
  isVerified?: boolean;
  businessName?: string | null;
  isCompany?: boolean;
  providerType?: 'INDIVIDUAL' | 'COMPANY';
}

export interface CartState {
  items: CartItem[];
  worker: WorkerInfo | null;
  note: string;
  addItem: (
    item: {
      serviceId: string;
      serviceName: string;
      price: number;
      workerId: string;
      workerName?: string;
      workerAvatar?: string | null;
      workerRating?: number;
      workerCategory?: string;
      isVerified?: boolean;
      businessName?: string | null;
      isCompany?: boolean;
      providerType?: 'INDIVIDUAL' | 'COMPANY';
      durationMins?: number | undefined;
      durationHours?: number | undefined;
    },
    quantity?: number
  ) => { success: boolean; hasConflict?: boolean };
  removeItem: (serviceId: string) => void;
  updateQuantity: (serviceId: string, quantity: number) => void;
  setNote: (note: string) => void;
  clearCart: () => void;
  replaceCart: (item: {
    serviceId: string;
    serviceName: string;
    price: number;
    workerId: string;
    workerName?: string;
    workerAvatar?: string | null;
    workerRating?: number;
    workerCategory?: string;
    isVerified?: boolean;
    businessName?: string | null;
    isCompany?: boolean;
    providerType?: 'INDIVIDUAL' | 'COMPANY';
  }) => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'tasklync_cart_session';

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  worker: null,
  note: '',

  addItem: (item, quantity = 1) => {
    const { items, worker } = get();

    // Check single-worker conflict rule
    if (worker && worker.id !== item.workerId && items.length > 0) {
      return { success: false, hasConflict: true };
    }

    const existingIndex = items.findIndex((i) => i.serviceId === item.serviceId);
    let updatedItems: CartItem[];

    if (existingIndex !== -1) {
      updatedItems = items.map((i, idx) =>
        idx === existingIndex ? { ...i, quantity: i.quantity + quantity } : i
      );
    } else {
      updatedItems = [
        ...items,
        {
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          price: item.price,
          quantity,
          workerId: item.workerId,
          ...(item.durationMins !== undefined ? { durationMins: item.durationMins } : {}),
          ...(item.durationHours !== undefined ? { durationHours: item.durationHours } : {}),
        },
      ];
    }

    // Always keep worker info fully synchronized with the selected professional or company
    const isCompany =
      item.isCompany !== undefined
        ? item.isCompany
        : item.providerType === 'COMPANY' || Boolean(item.businessName) || Boolean(worker?.isCompany);
    const updatedWorker: WorkerInfo = {
      id: item.workerId,
      name: item.workerName || worker?.name || 'Selected Professional',
      avatarUrl: item.workerAvatar ?? worker?.avatarUrl ?? null,
      avgRating: item.workerRating ?? worker?.avgRating ?? 4.9,
      category: item.workerCategory || worker?.category || 'Professional Service',
      isVerified: item.isVerified ?? worker?.isVerified ?? false,
      businessName: item.businessName || worker?.businessName || null,
      isCompany,
      providerType: isCompany ? 'COMPANY' : 'INDIVIDUAL',
    };

    const newState = { items: updatedItems, worker: updatedWorker };
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...newState, note: get().note }));
    } catch (_e) {}

    set(newState);
    return { success: true };
  },

  removeItem: (serviceId) => {
    const { items } = get();
    const updatedItems = items.filter((i) => i.serviceId !== serviceId);
    const updatedWorker = updatedItems.length === 0 ? null : get().worker;

    const newState = { items: updatedItems, worker: updatedWorker };
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ ...newState, note: get().note }));
    } catch (_e) {}

    set(newState);
  },

  updateQuantity: (serviceId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(serviceId);
      return;
    }

    const { items } = get();
    const updatedItems = items.map((i) =>
      i.serviceId === serviceId ? { ...i, quantity } : i
    );

    const newState = { items: updatedItems };
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ items: updatedItems, worker: get().worker, note: get().note }));
    } catch (_e) {}

    set(newState);
  },

  setNote: (note) => {
    const newState = { note };
    try {
      storage.set(STORAGE_KEY, JSON.stringify({ items: get().items, worker: get().worker, note }));
    } catch (_e) {}

    set(newState);
  },

  clearCart: () => {
    try {
      storage.remove(STORAGE_KEY);
    } catch (_e) {}
    set({ items: [], worker: null, note: '' });
  },

  replaceCart: (item) => {
    const newItem: CartItem = {
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      price: item.price,
      quantity: 1,
      workerId: item.workerId,
    };
    const isCompany =
      item.isCompany !== undefined
        ? item.isCompany
        : item.providerType === 'COMPANY' || Boolean(item.businessName);
    const newWorker: WorkerInfo = {
      id: item.workerId,
      name: item.workerName || 'Selected Professional',
      avatarUrl: item.workerAvatar ?? null,
      avgRating: item.workerRating ?? 4.9,
      category: item.workerCategory || 'Professional Service',
      isVerified: item.isVerified ?? false,
      businessName: item.businessName || null,
      isCompany,
      providerType: isCompany ? 'COMPANY' : 'INDIVIDUAL',
    };

    const newState = { items: [newItem], worker: newWorker, note: '' };
    try {
      storage.set(STORAGE_KEY, JSON.stringify(newState));
    } catch (_e) {}

    set(newState);
  },

  hydrate: () => {
    try {
      const dataStr = storage.getString(STORAGE_KEY);
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        set({
          items: parsed.items || [],
          worker: parsed.worker || null,
          note: parsed.note || '',
        });
      }
    } catch (_e) {}
  },
}));
