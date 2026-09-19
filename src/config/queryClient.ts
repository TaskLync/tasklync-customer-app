import {
  QueryClient,
  onlineManager,
  dehydrate,
  hydrate,
  DehydratedState,
} from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { createMMKV } from 'react-native-mmkv';
import { NETWORK_CONFIG } from './networkConfig';

const storage = createMMKV();
const QUERY_CACHE_KEY = NETWORK_CONFIG.STORAGE_KEYS.PERSISTED_QUERY_CACHE;

// ----------------------------------------------------
// 1. TanStack Query Online Manager Integration
// ----------------------------------------------------
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    const isOnline =
      Boolean(state.isConnected) && state.isInternetReachable !== false;
    setOnline(isOnline);
  });
});

// ----------------------------------------------------
// 2. Query Client Configuration with Granular Policies
// ----------------------------------------------------
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default fallback: 5 minutes stale time, 30 minutes gc time
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, NETWORK_CONFIG.MAX_RETRY_DELAY_MS),
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // Mutation retries handled deterministically via offline request queue
      networkMode: 'offlineFirst',
    },
  },
});

// ----------------------------------------------------
// 3. Sensitive Key Allowlist / Exclusion Security Filter
// Excludes payment secrets, card tokens, or sensitive PII
// ----------------------------------------------------
const SENSITIVE_QUERY_KEYS = [
  'payment',
  'card',
  'token',
  'secret',
  'auth_tokens',
  'cvv',
  'password',
];

function isPersistableQuery(queryKey: readonly unknown[]): boolean {
  if (!queryKey || queryKey.length === 0) return false;
  const firstKey = String(queryKey[0]).toLowerCase();
  
  // Exclude live/sensitive queries
  for (const sensitive of SENSITIVE_QUERY_KEYS) {
    if (firstKey.includes(sensitive)) {
      return false;
    }
  }

  // Active bookings are live data and should not be persisted statically
  if (firstKey === 'active_booking' || firstKey === 'live_tracking') {
    return false;
  }

  return true;
}

// ----------------------------------------------------
// 4. Synchronous MMKV Query Cache Persister
// ----------------------------------------------------
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

export function persistQueryCacheToMMKV(): void {
  try {
    const dehydrated = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => {
        // Only dehydrate successful queries that pass the security filter
        return (
          query.state.status === 'success' &&
          isPersistableQuery(query.queryKey)
        );
      },
    });

    storage.set(QUERY_CACHE_KEY, JSON.stringify(dehydrated));
  } catch (error) {
    console.warn('[QueryPersist] Error persisting query cache to MMKV:', error);
  }
}

export function restoreQueryCacheFromMMKV(): boolean {
  try {
    const raw = storage.getString(QUERY_CACHE_KEY);
    if (!raw) return false;

    const parsed: DehydratedState = JSON.parse(raw);
    hydrate(queryClient, parsed);
    return true;
  } catch (error) {
    console.warn('[QueryPersist] Error restoring query cache from MMKV:', error);
    return false;
  }
}

export function clearPersistedQueryCache(): void {
  try {
    storage.remove(QUERY_CACHE_KEY);
  } catch (_e) {}
}

// Subscribe to cache updates to debounce save to MMKV
queryClient.getQueryCache().subscribe((event) => {
  if (
    event.type === 'updated' &&
    event.action.type === 'success' &&
    isPersistableQuery(event.query.queryKey)
  ) {
    if (persistTimeout) clearTimeout(persistTimeout);
    persistTimeout = setTimeout(() => {
      persistQueryCacheToMMKV();
    }, 1000);
  }
});

// Restore on module import
restoreQueryCacheFromMMKV();
