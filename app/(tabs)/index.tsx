import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { HomeHeader } from '../../src/components/home/HomeHeader';
import { SearchPromptBar } from '../../src/components/home/SearchPromptBar';
import { CategoryGrid } from '../../src/components/home/CategoryGrid';
import { CompanyRow } from '../../src/components/home/CompanyRow';
import { NearbyWorkersList } from '../../src/components/home/NearbyWorkersList';
import { BannerCarousel } from '../../src/components/home/BannerCarousel';
import { AllWorkersSection } from '../../src/components/home/AllWorkersSection';
import { CustomRefreshControl } from '../../src/components/feedback/CustomRefreshControl';

import { useCategories } from '../../src/hooks/useCategories';
import { useCompanies } from '../../src/hooks/useCompanies';
import { useLocation } from '../../src/hooks/useLocation';

import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

export default function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const { refetch: refetchCategories } = useCategories();
  const { refetch: refetchCompanies } = useCompanies({ limit: 10 });
  const {
    getCurrentPosition,
    locationMode,
  } = useLocation({ autoFetch: false });

  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const promises: Promise<any>[] = [
        refetchCategories(),
        refetchCompanies(),
        queryClient.invalidateQueries({ queryKey: ['workers'] }),
        queryClient.invalidateQueries({ queryKey: ['companies'] }),
      ];
      if (locationMode === 'gps') {
        promises.push(getCurrentPosition(true));
      }
      await Promise.allSettled(promises);
    } catch (err) {
      // Absorb any unexpected errors so refreshing always terminates
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedStatusBar />
      
      <ScrollView
        bounces={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top || 44 }]}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <HomeHeader />
        
        <View style={styles.searchWrapper}>
          <SearchPromptBar />
        </View>
        
        {/* 3. Category Grid */}
        <View style={styles.sectionSpacer}>
          <CategoryGrid />
        </View>
        
        {/* 4. Promotional Banner */}
        <View style={styles.sectionSpacer}>
          <BannerCarousel />
        </View>

        {/* 5. Companies Section (Single Horizontal Row) */}
        <View style={styles.sectionSpacer}>
          <CompanyRow />
        </View>
        
        {/* 6. Nearby Workers Section */}
        <View style={styles.sectionSpacer}>
          <NearbyWorkersList />
        </View>

        {/* 7. All Workers Section */}
        <AllWorkersSection />
        
      </ScrollView>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  scrollContent: {
    paddingBottom: 120, // Space for tab bar + safe area padding
  },
  searchWrapper: {
    marginTop: 12,
    paddingHorizontal: 16,
    marginBottom: 20, // Clean, consistent spacing to next section
  },
  sectionSpacer: {
    marginBottom: 20,
  },
});
