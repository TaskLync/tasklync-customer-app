import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FilterSheetContent } from '../../src/components/search/FilterSheetContent';
import { useSearch } from '../../src/hooks/useSearch';
import { colors } from '../../src/design/colors';

export default function FiltersScreen() {
  const router = useRouter();
  const { filters, setFilters, resetFilters, total } = useSearch();

  const handleApply = (newFilters: any) => {
    setFilters(newFilters);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore' as any);
    }
  };

  const handleReset = () => {
    resetFilters();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FilterSheetContent
        filters={filters}
        onApply={handleApply}
        onReset={handleReset}
        resultCount={total}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
});
