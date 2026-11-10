import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonGroup,
  SkeletonText,
} from '../ui/Skeleton/Skeleton';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * Mirrors MapWorkerCard: static 270×146 white card (same shadow), 52px avatar, name (14),
 * rating · distance line, response-time line, and the 44px "Book" button on the right.
 */
export const MapSkeletonCard: FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
  <View style={styles.card}>
    <SkeletonGroup style={styles.row} accessibilityLabel="Loading worker">
      <SkeletonCircle size={52} />
      <View style={styles.info}>
        <SkeletonText fontSize={14} lineHeight={19} width="78%" style={styles.line} />
        <SkeletonText fontSize={12} lineHeight={16} width="64%" style={styles.line} />
        <SkeletonText fontSize={11} lineHeight={15} width="46%" />
      </View>
      <Skeleton width={68} height={44} borderRadius={12} />
    </SkeletonGroup>
  </View>
);
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    width: 270,
    height: 146,
    padding: 14,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  line: {
    marginBottom: 4,
  },
});
