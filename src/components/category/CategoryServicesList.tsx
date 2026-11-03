import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Service } from '../../types/category.types';
import { ServiceListItem } from '../service/ServiceListItem';
import { SkeletonServiceListItem } from '../ui/Skeleton/SkeletonServiceListItem';
import { EmptyState } from '../feedback/EmptyState/EmptyState';
import { StickyListHeader } from '../ui/List/StickyListHeader';

import { formatCategoryName, getServicePrice } from '../../utils/formatters';

interface CategoryServicesListProps {
  categoryId: string;
  services: Service[];
  isLoading: boolean;
  workerId?: string | null;
}

const AnyFlashList = FlashList as any;

export const CategoryServicesList: React.FC<CategoryServicesListProps> = ({
  categoryId,
  services,
  isLoading,
}) => {
  const renderItem = ({ item }: { item: Service }) => {
    const rawCategoryId = item?.categoryId || (item as any)?.category_id || categoryId;
    const categoryName = formatCategoryName(rawCategoryId, categoryId || 'SERVICE');
    const price = getServicePrice(item, 500);

    return (
      <ServiceListItem
        id={item?.id || ''}
        name={item?.name || 'Service'}
        categoryName={categoryName}
        duration={`${item?.minDurationMins || 45} mins`}
        startingPrice={price}
        currency="Rs"
        iconName={categoryId === 'ac_repair' ? 'wind' : categoryId === 'electrician' ? 'zap' : 'wrench'}
        isHeader={false}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StickyListHeader
          title="Services"
          count={null}
        />
        <View style={styles.skeletonsContainer}>
          <View style={styles.rowWrapper}>
            <SkeletonServiceListItem />
            <SkeletonServiceListItem />
          </View>
          <View style={styles.rowWrapper}>
            <SkeletonServiceListItem />
            <SkeletonServiceListItem />
          </View>
        </View>
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <Animated.View style={styles.container} entering={FadeIn.duration(200)}>
        <StickyListHeader
          title="Services"
          count={0}
        />
        <EmptyState
          type="no-data"
          title="No services listed for this category yet"
          subtitle="Please check back later or choose another category."
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(200)}>
      <AnyFlashList
        data={services}
        renderItem={renderItem}
        keyExtractor={(item: Service) => item.id}
        estimatedItemSize={274}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <StickyListHeader
              title="Services"
              count={services.length}
            />
          </View>
        }
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  headerWrapper: {
    marginHorizontal: -10,
  },
  columnWrapper: {
    // Flex: 1 with marginHorizontal: 6 handles 2-column grid alignment
  },
  skeletonsContainer: {
    paddingHorizontal: 10,
  },
  rowWrapper: {
    flexDirection: 'row',
  },
});

