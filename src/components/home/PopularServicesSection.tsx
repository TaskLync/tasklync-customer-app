import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Section } from '../layout/Section';
import { ServiceListItem } from '../service/ServiceListItem';
import { SkeletonServiceListItem } from '../ui/Skeleton';
import { usePopularServices } from '../../hooks/usePopularServices';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const PopularServicesSection = () => {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { data: services, isLoading, error } = usePopularServices();

  const handleSeeAll = () => {
    router.push('/search' as any); // Or appropriate path with filter
  };

  return (
    <Section
      title="Popular Services"
      actionLabel="See all →"
      onAction={handleSeeAll}
    >
      <View style={styles.container}>
        {error ? (
          <Text style={styles.errorText}>Services unavailable</Text>
        ) : isLoading ? (
          <>
            <View style={styles.gridItem}><SkeletonServiceListItem /></View>
            <View style={styles.gridItem}><SkeletonServiceListItem /></View>
            <View style={styles.gridItem}><SkeletonServiceListItem /></View>
            <View style={styles.gridItem}><SkeletonServiceListItem /></View>
          </>
        ) : (
          services?.map(service => (
            <View key={service.id} style={styles.gridItem}>
              <ServiceListItem {...service} />
            </View>
          ))
        )}
      </View>
    </Section>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: '50%',
  },
  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
