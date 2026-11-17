import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/api/user.api';
import { useAuthStore } from '../store/auth.store';
import { useLocationStore } from '../store/location.store';
import { useBookingDraftStore } from '../store/bookingDraft.store';
import { Address, CreateAddressDTO, UpdateAddressDTO } from '../types/address.types';
import type { CreateAddressPayload, UpdateAddressPayload } from '../types/user.types';
import { generateUUID } from '../utils/uuid';
import { mapServerAddress, toAddressRequestBody } from '../utils/addressDetails';
import { reconcileActiveAddress, toBookingAddress } from '../utils/activeAddress';

const ADDRESSES_QUERY_KEY = ['user-addresses'];
const ADDRESS_MUTATION_KEY = ['user-addresses', 'mutation'];

/**
 * Sorts addresses so the default address is strictly at index 0 (Serial Position Effect)
 */
function sortAddressesWithDefaultFirst(items: Address[]): Address[] {
  return [...items].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return 0;
  });
}

/**
 * Keep the app's two copies of "the address the customer means" (location store selection and the
 * booking draft) in step with the server list: a deleted address stops being active, an edited one
 * is refreshed (audit LOC-006/017).
 */
function syncActiveAddressCopies(list: Address[]): void {
  const loc = useLocationStore.getState();
  const draft = useBookingDraftStore.getState();

  const sel = reconcileActiveAddress(list, loc.selectedAddress?.id ?? null);
  if (sel.action === 'clear') loc.setSelectedAddress(null);
  else if (sel.action === 'refresh' && sel.address && JSON.stringify(sel.address) !== JSON.stringify(loc.selectedAddress)) {
    loc.setSelectedAddress(sel.address);
  }

  const d = reconcileActiveAddress(list, draft.addressId);
  if (d.action === 'clear') draft.setAddress(null);
  else if (d.action === 'refresh' && d.address) {
    const next = toBookingAddress(d.address);
    if (JSON.stringify(next) !== JSON.stringify(draft.address)) draft.setAddress(next);
  }
}

/**
 * Custom hook for full CRUD operations on Saved Addresses
 * Includes optimistic updates and automatic cache synchronization
 */
export function useAddresses() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  // 1. Fetch addresses query
  const query = useQuery<Address[]>({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: async (): Promise<Address[]> => {
      if (!token) return [];
      const raw = await userApi.getAddresses();
      if (!raw || !Array.isArray(raw)) return [];
      // The API may serialise DECIMAL columns as strings; coerce, and drop rows with unusable
      // coordinates or no id rather than letting NaN/0 or a fabricated id reach maps or bookings.
      const mapped = raw.map(mapServerAddress).filter((a): a is Address => a !== null);
      const sorted = sortAddressesWithDefaultFirst(mapped);
      // Authoritative list from the server: reconcile what the app currently treats as active.
      syncActiveAddressCopies(sorted);
      return sorted;
    },
    staleTime: 60_000,
    retry: 1,
  });

  // 2. Add Address mutation (Optimistic)
  const addMutation = useMutation({
    mutationKey: ADDRESS_MUTATION_KEY,
    mutationFn: async (payload: CreateAddressDTO) => {
      // Send EVERY field the API accepts — the previous version dropped notes / details here.
      const created = await userApi.createAddress(toAddressRequestBody(payload) as unknown as CreateAddressPayload);
      const mapped = mapServerAddress(created);
      if (!mapped) {
        // Never treat an unconfirmed save as saved (no id = nothing the booking can reference).
        throw new Error('The server did not confirm the saved address.');
      }
      return mapped;
    },
    onMutate: async (newAddressPayload) => {
      await queryClient.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previousAddresses = queryClient.getQueryData<Address[]>(ADDRESSES_QUERY_KEY) || [];

      const optimisticItem: Address = {
        ...newAddressPayload,
        id: `optimistic-${generateUUID()}`,
        city: newAddressPayload.city || '',
        country: newAddressPayload.country || '',
        is_default: Boolean(newAddressPayload.is_default ?? previousAddresses.length === 0),
      };

      const updated = newAddressPayload.is_default
        ? [
            optimisticItem,
            ...previousAddresses.map((a) => ({ ...a, is_default: false })),
          ]
        : [...previousAddresses, optimisticItem];

      queryClient.setQueryData<Address[]>(
        ADDRESSES_QUERY_KEY,
        sortAddressesWithDefaultFirst(updated)
      );

      return { previousAddresses };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(ADDRESSES_QUERY_KEY, context.previousAddresses);
      }
    },
    onSettled: () => {
      // Refetch only after the LAST in-flight address mutation; an earlier refetch would return
      // server state that predates the others and make the optimistic UI flicker back.
      if (queryClient.isMutating({ mutationKey: ADDRESS_MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
      }
    },
  });

  // 3. Update Address mutation (Optimistic)
  const updateMutation = useMutation({
    mutationKey: ADDRESS_MUTATION_KEY,
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateAddressDTO }) => {
      const updated = await userApi.updateAddress(id, toAddressRequestBody(payload) as UpdateAddressPayload);
      return mapServerAddress(updated);
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previousAddresses = queryClient.getQueryData<Address[]>(ADDRESSES_QUERY_KEY) || [];

      const updatedList: Address[] = previousAddresses.map((addr) => {
        if (addr.id === id) {
          return {
            ...addr,
            ...payload,
            is_default:
              payload.is_default !== undefined ? payload.is_default : addr.is_default,
          };
        }
        if (payload.is_default) {
          return { ...addr, is_default: false };
        }
        return addr;
      });

      queryClient.setQueryData<Address[]>(
        ADDRESSES_QUERY_KEY,
        sortAddressesWithDefaultFirst(updatedList)
      );

      return { previousAddresses };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(ADDRESSES_QUERY_KEY, context.previousAddresses);
      }
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ADDRESS_MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
      }
    },
  });

  // 4. Delete Address mutation (Optimistic)
  const deleteMutation = useMutation({
    mutationKey: ADDRESS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      await userApi.deleteAddress(id);
    },
    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previousAddresses = queryClient.getQueryData<Address[]>(ADDRESSES_QUERY_KEY) || [];

      const filtered = previousAddresses.filter((a) => a.id !== idToDelete);
      queryClient.setQueryData<Address[]>(
        ADDRESSES_QUERY_KEY,
        sortAddressesWithDefaultFirst(filtered)
      );

      return { previousAddresses };
    },
    onSuccess: (_data, deletedId) => {
      // Whichever screen deleted it, a deleted address must stop being the active / booking
      // address (audit LOC-006: the list screen used to leave it selected and bookable).
      const loc = useLocationStore.getState();
      if (loc.selectedAddress?.id === deletedId) loc.setSelectedAddress(null);
      const draft = useBookingDraftStore.getState();
      if (draft.addressId === deletedId) draft.setAddress(null);
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(ADDRESSES_QUERY_KEY, context.previousAddresses);
      }
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ADDRESS_MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
      }
    },
  });

  // 5. Set Default Address mutation (Optimistic)
  const setDefaultMutation = useMutation({
    mutationKey: ADDRESS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const updated = await userApi.setDefaultAddress(id);
      return updated;
    },
    onMutate: async (defaultId) => {
      await queryClient.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previousAddresses = queryClient.getQueryData<Address[]>(ADDRESSES_QUERY_KEY) || [];

      const flipped: Address[] = previousAddresses.map((addr) => ({
        ...addr,
        is_default: addr.id === defaultId,
      }));

      queryClient.setQueryData<Address[]>(
        ADDRESSES_QUERY_KEY,
        sortAddressesWithDefaultFirst(flipped)
      );

      return { previousAddresses };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(ADDRESSES_QUERY_KEY, context.previousAddresses);
      }
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ADDRESS_MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
      }
    },
  });

  return {
    addresses: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    addAddress: addMutation.mutateAsync,
    updateAddress: updateMutation.mutateAsync,
    deleteAddress: deleteMutation.mutateAsync,
    setDefaultAddress: setDefaultMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
