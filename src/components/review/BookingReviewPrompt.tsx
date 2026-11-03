import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, Clock, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useReviewEligibility } from '../../hooks/useReview';
import { colors, palette, fontFamily, fontSize, radius, spacing, shadows } from '../../design';

export interface BookingReviewPromptProps {
  bookingId: string;
  workerId?: string;
}

export function BookingReviewPrompt({ bookingId, workerId }: BookingReviewPromptProps) {
  const router = useRouter();
  const { data: eligibility, isLoading } = useReviewEligibility(bookingId);

  if (isLoading || !eligibility) {
    return null;
  }

  // 1. Eligible for review (has not reviewed yet and within 14 days)
  if (eligibility.isEligible) {
    return (
      <View style={styles.bannerEligible}>
        <View style={styles.iconCircleAmber}>
          <Star size={20} color={colors.warningMedium} fill={colors.warning} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.titleAmber}>How was your service?</Text>
          <Text style={styles.subtitleAmber}>
            Rate your professional to help the community.
            {eligibility.formattedTimeLeft ? ` (${eligibility.formattedTimeLeft})` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.rateBtn}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/booking/[id]/review' as any,
              params: { id: bookingId, workerId: workerId || '' },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Rate service now"
        >
          <Text style={styles.rateBtnText}>Rate Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Already reviewed (offer to view / edit if within 48h edit window)
  if (eligibility.isReviewed) {
    return (
      <View style={styles.bannerReviewed}>
        <View style={styles.iconCircleGreen}>
          <CheckCircle2 size={20} color={colors.primary} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.titleGreen}>Review submitted</Text>
          <Text style={styles.subtitleGreen}>
            You rated this completed booking. You can edit your review within 48h.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/booking/[id]/review' as any,
              params: { id: bookingId, workerId: workerId || '' },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="View or edit your review"
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Expired review period (14 days past completion)
  if (eligibility.isExpired) {
    return (
      <View style={styles.bannerExpired}>
        <Clock size={16} color={palette.gray400} />
        <Text style={styles.expiredText}>Review window for this booking has closed (14 days passed).</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bannerEligible: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.amber200,
    ...shadows.xs,
  },
  iconCircleAmber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.amber50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  titleAmber: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2,
    color: palette.amber800,
  },
  subtitleAmber: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM - 0.5,
    color: palette.amber700,
    marginTop: 2,
  },
  rateBtn: {
    backgroundColor: colors.warningMedium,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    marginLeft: 8,
  },
  rateBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.white,
    fontSize: fontSize.dataSM,
  },

  bannerReviewed: {
    backgroundColor: palette.green50,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  iconCircleGreen: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleGreen: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2,
    color: colors.primaryDark,
  },
  subtitleGreen: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM - 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginLeft: 8,
  },
  editBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.primary,
    fontSize: fontSize.dataSM,
  },

  bannerExpired: {
    backgroundColor: palette.gray100,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: spacing.xs,
  },
  expiredText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM - 1,
    color: palette.gray500,
    flex: 1,
  },
});
