import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/api/user.api';
import { useAuthStore } from '../store/auth.store';
import { Address, CreateAddressDTO, UpdateAddressDTO } from '../types/address.types';
import { generateUUID } from '../utils/uuid';

const ADDRESSES_QUERY_KEY = ['user-addresses'];

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
      const mapped: Address[] = raw.map((addr) => ({
        id: addr.id || generateUUID(),
        label: addr.label || 'Home',
        address_line: addr.address_line,
        city: addr.city || 'Faisalabad',
        country: addr.country || 'Pakistan',
        lat: addr.lat,
        lng: addr.lng,
        is_default: Boolean(addr.is_default),
      }));
      return sortAddressesWithDefaultFirst(mapped);
    },
    staleTime: 60_000,
    retry: 1,
  });

  // 2. Add Address mutation (Optimistic)
  const addMutation = useMutation({
    mutationFn: async (payload: CreateAddressDTO) => {
      const created = await userApi.createAddress({
        label: payload.label,
        address_line: payload.address_line,
        city: payload.city,
        country: payload.country,
        lat: payload.lat,
        lng: payload.lng,
        is_default: payload.is_default,
      });
      return created;
    },
    onMutate: async (newAddressPayload) => {
      await queryClient.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previousAddresses = queryClient.getQueryData<Address[]>(ADDRESSES_QUERY_KEY) || [];

      const optimisticItem: Address = {
        id: generateUUID(),
        label: newAddressPayload.label,
        custom_label: newAddressPayload.custom_label,
        address_line: newAddressPayload.address_line,
        city: newAddressPayload.city || 'Faisalabad',
        country: newAddressPayload.country || 'Pakistan',
        lat: newAddressPayload.lat,
        lng: newAddressPayload.lng,
        notes: newAddressPayload.notes,
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
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });

  // 3. Update Address mutation (Optimistic)
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateAddressDTO }) => {
      const updated = await userApi.updateAddress(id, payload);
      return updated;
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
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });

  // 4. Delete Address mutation (Optimistic)
  const deleteMutation = useMutation({
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
    onError: (_err, _variables, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(ADDRESSES_QUERY_KEY, context.previousAddresses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });

  // 5. Set Default Address mutation (Optimistic)
  const setDefaultMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
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
