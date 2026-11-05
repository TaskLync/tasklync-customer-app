import { View, StyleSheet } from 'react-native';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonGroup,
  SkeletonText,
  SKELETON,
} from '../ui/Skeleton/Skeleton';
import { colors } from '../../design';

/**
 * Mirrors BookingCard (flat row, 18px vertical padding, hairline divider):
 *   status pill ······················ price
 *   [48 avatar]  worker name / category
 *   date · time
 *   [ action ] [ action ]   (38px, r10)
 */
export function BookingCardSkeleton() {
  return (
    <SkeletonGroup style={styles.card} accessibilityLabel="Loading booking">
      <View style={styles.header}>
        <Skeleton width={84} height={24} borderRadius={SKELETON.radius.pill} />
        <SkeletonText fontSize={16} lineHeight={21} width={64} />
      </View>

      <View style={styles.workerRow}>
        <SkeletonCircle size={48} style={styles.avatar} />
        <View style={styles.workerText}>
          <SkeletonText fontSize={16} lineHeight={21} width="52%" />
          <SkeletonText fontSize={12.5} lineHeight={17} width="34%" style={styles.category} />
        </View>
      </View>

      <SkeletonText fontSize={12.5} lineHeight={17} width={150} style={styles.meta} />

      <View style={styles.actions}>
        <Skeleton height={38} borderRadius={10} style={styles.action} />
        <Skeleton height={38} borderRadius={10} style={styles.action} />
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  avatar: {
    marginRight: 12,
  },
  workerText: {
    flex: 1,
  },
  category: {
    marginTop: 2,
  },
  meta: {
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  action: {
    flex: 1,
  },
});
