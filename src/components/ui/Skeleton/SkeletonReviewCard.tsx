import { StyleSheet, View } from 'react-native';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from './Skeleton';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

/** Mirrors ReviewCard: 36px avatar + name/meta (ReviewMetaRow "md"), then a 3-line comment. */
export const SkeletonReviewCard = () => {
  const styles = useThemedStyles(createStyles);
  return (
  <View style={styles.card}>
    <SkeletonGroup accessibilityLabel="Loading review">
      <View style={styles.metaRow}>
        <SkeletonCircle size={36} />
        <View style={styles.metaText}>
          <SkeletonText fontSize={13.5} lineHeight={18} width={112} />
          <SkeletonText fontSize={11.5} lineHeight={16} width={132} style={styles.metaLine} />
        </View>
      </View>
      <SkeletonText
        fontSize={14}
        lineHeight={20}
        width="96%"
        lines={3}
        lastLineWidth="58%"
        style={styles.comment}
      />
    </SkeletonGroup>
  </View>
);
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    flex: 1,
    marginLeft: 10,
  },
  metaLine: {
    marginTop: 2,
  },
  comment: {
    marginTop: 8,
  },
});
