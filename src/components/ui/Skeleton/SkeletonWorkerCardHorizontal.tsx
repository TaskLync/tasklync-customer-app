import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonGroup, SkeletonText, SKELETON } from './Skeleton';
import { radius } from '../../../design/radius';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

/**
 * Mirrors WorkerCardHorizontal: same 228px shell (static), with avatar, favourite, name,
 * profession, rating/distance line, price and the mint "Book" pill as placeholders.
 */
export const SkeletonWorkerCardHorizontal: React.FC<{ cardWidth?: number }> = ({ cardWidth }) => {
  const styles = useThemedStyles(createStyles);
  const { width: windowWidth } = useWindowDimensions();
  const width = cardWidth ?? Math.min(Math.round(windowWidth * 0.72), 300);

  return (
    <View style={[styles.card, { width }]}>
      <SkeletonGroup style={styles.fill} accessibilityLabel="Loading worker">
        <View>
          <View style={styles.topArea}>
            <SkeletonCircle size={56} />
            <View style={styles.favorite}>
              <SkeletonCircle size={22} />
            </View>
          </View>
          <View style={styles.info}>
            <SkeletonText fontSize={15.5} lineHeight={21} width={140} />
            <SkeletonText fontSize={13} lineHeight={18} width={96} style={styles.profession} />
            <SkeletonText fontSize={12.5} lineHeight={17} width={168} style={styles.meta} />
          </View>
        </View>
        <View style={styles.bottomRow}>
          <SkeletonText fontSize={17} lineHeight={22} width={84} />
          <Skeleton width={92} height={38} borderRadius={SKELETON.radius.pill} />
        </View>
      </SkeletonGroup>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    height: 228,
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: colors.bgCard,
  },
  fill: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  favorite: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    marginTop: 10,
  },
  profession: {
    marginTop: 2,
  },
  meta: {
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
