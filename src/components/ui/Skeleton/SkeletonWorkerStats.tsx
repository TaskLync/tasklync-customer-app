import { StyleSheet, View } from 'react-native';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from './Skeleton';
import { colors } from '../../../design/colors';

/** Availability line + the 3-column stats strip (WorkerAvailabilityCard + WorkerStats). */
export const SkeletonWorkerStats = () => (
  <SkeletonGroup accessibilityLabel="Loading availability">
    <View style={styles.availability}>
      <SkeletonCircle size={14} />
      <SkeletonText fontSize={13.5} lineHeight={18} width={110} style={styles.availabilityText} />
    </View>
    <View style={styles.strip}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.col}>
          <SkeletonText fontSize={16} lineHeight={21} width={44} />
          <SkeletonText fontSize={11.5} lineHeight={15} width={58} style={styles.label} />
        </View>
      ))}
    </View>
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    marginLeft: 8,
  },
  strip: {
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.bgSection,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    marginTop: 2,
  },
});
