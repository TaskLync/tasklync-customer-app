import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { HomeHeader } from '../../src/components/home/HomeHeader';
import { SearchPromptBar } from '../../src/components/home/SearchPromptBar';
import { CategoryGrid } from '../../src/components/home/CategoryGrid';
import { NearbyWorkersList } from '../../src/components/home/NearbyWorkersList';
import { BannerCarousel } from '../../src/components/home/BannerCarousel';
import { AllWorkersSection } from '../../src/components/home/AllWorkersSection';
import { CustomRefreshControl } from '../../src/components/feedback/CustomRefreshControl';

import { useCategories } from '../../src/hooks/useCategories';
import { useNearbyWorkers } from '../../src/hooks/useNearbyWorkers';
import { useLocation } from '../../src/hooks/useLocation';

import { colors } from '../../src/design/colors';

export default function HomeScreen() {
  const { refetch: refetchCategories } = useCategories();
  const { refetch: refetchWorkers } = useNearbyWorkers();
  const { getCurrentPosition, locationMode } = useLocation({ autoFetch: false });

  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const promises: Promise<any>[] = [
        refetchCategories(),
        refetchWorkers(),
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
      <StatusBar style="dark" />
      
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
        
        <View style={styles.sectionSpacer}>
          <CategoryGrid />
        </View>
        
        <View style={styles.sectionSpacer}>
          <BannerCarousel />
        </View>
        
        <View style={styles.nearbySectionWrapper}>
          <NearbyWorkersList />
        </View>

        {/* All Workers — replaces Popular Services with a full scalable list */}
        <View style={styles.sectionSpacer}>
          <AllWorkersSection />
        </View>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 24, // Spacing to next section
  },
  sectionSpacer: {
    marginBottom: 24,
  },
  nearbySectionWrapper: {
    marginBottom: 14, // 14px margin + 10px internal bottom padding = 24px visual rhythm to All Workers
    zIndex: 10,
    elevation: 10,
  },
});
