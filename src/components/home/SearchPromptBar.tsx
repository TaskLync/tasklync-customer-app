import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SearchBar } from '../search/SearchBar';

/**
 * Home search entry: the shared SearchBar in "button" mode (identical look to Explore's field).
 * Opens Explore with `focus=1`, which focuses the real input there, so tapping here feels like
 * tapping straight into search.
 */
export const SearchPromptBar = () => {
  const router = useRouter();
  const openSearch = useCallback(() => {
    router.push({ pathname: '/explore', params: { focus: '1' } } as any);
  }, [router]);

  return <SearchBar mode="button" onPress={openSearch} />;
};
