import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { X, RefreshCw, Clock, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { BottomSheet } from '../layout/BottomSheet';
import { radius, spacing } from '../../design';
import { formatRemainingTime } from '../../utils/verificationState.util';
import { useBookingVerificationQr } from '../../hooks/useBookingVerification';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingQRCodeSheetProps {
  bookingId: string;
  visible: boolean;
  isEligible: boolean;
  onClose: () => void;
}

export const BookingQRCodeSheet: React.FC<BookingQRCodeSheetProps> = ({
  bookingId,
  visible,
  isEligible,
  onClose,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const {
    svgData,
    remainingSeconds,
    isExpired,
    isLoading,
    isRefetching,
    error,
    refreshQr,
  } = useBookingVerificationQr(bookingId, isEligible, visible);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['auto']}
      contentPadding={true}
    >
      <View style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Show Your QR Code</Text>
            <Text style={styles.subtitle}>
              Ask your worker to scan this code to securely start your service.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.closeBtnPressed,
            ]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close QR Code sheet"
          >
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* QR Code Presentation Canvas */}
        <View style={styles.canvasContainer}>
          <View style={styles.qrCard}>
            {isLoading && !svgData ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={colors.primaryDark} />
                <Text style={styles.loadingText}>Generating secure QR code...</Text>
              </View>
            ) : error && !svgData ? (
              <View style={styles.centerBox}>
                <AlertCircle size={24} color={colors.danger} />
                <Text style={styles.errorText}>{error.message}</Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={refreshQr}
                  disabled={isRefetching}
                  accessibilityRole="button"
                >
                  {isRefetching ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <>
                      <RefreshCw size={14} color={colors.primaryDark} />
                      <Text style={styles.retryBtnText}>Try Again</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : isExpired ? (
              <View style={styles.centerBox}>
                <View style={styles.expiredBanner}>
                  <AlertCircle size={16} color={palette.amber700} />
                  <Text style={styles.expiredBannerText}>QR code expired</Text>
                </View>
                <Text style={styles.expiredSubtext}>
                  Verification codes expire periodically for your security.
                </Text>
                <Pressable
                  style={styles.refreshPrimaryBtn}
                  onPress={refreshQr}
                  disabled={isRefetching}
                  accessibilityRole="button"
                  accessibilityLabel="Generate a new QR code"
                >
                  {isRefetching ? (
                    <ActivityIndicator size="small" color={colors.pureWhite} />
                  ) : (
                    <>
                      <RefreshCw size={15} color={colors.pureWhite} />
                      <Text style={styles.refreshPrimaryBtnText}>Generate New QR</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : svgData ? (
              <View style={styles.svgWrapper}>
                <Svg
                  width={220}
                  height={220}
                  viewBox={`0 0 ${svgData.gridSize} ${svgData.gridSize}`}
                >
                  <Path d={svgData.path} fill={palette.gray900} />
                </Svg>
              </View>
            ) : (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={colors.primaryDark} />
              </View>
            )}
          </View>
        </View>

        {/* Validity & Expiry Status */}
        {Boolean(svgData) && !isExpired && (
          <View style={styles.timerRow}>
            <View style={styles.timerBadge}>
              <Clock size={13} color={colors.textSecondary} />
              <Text style={styles.timerText}>
                Valid for {formatRemainingTime(remainingSeconds)}
              </Text>
            </View>

            <Pressable
              style={styles.refreshLinkBtn}
              onPress={refreshQr}
              disabled={isRefetching}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Refresh QR Code"
            >
              <RefreshCw
                size={13}
                color={colors.textSecondary}
                style={isRefetching ? styles.rotatingIcon : undefined}
              />
              <Text style={styles.refreshLinkText}>Refresh</Text>
            </Pressable>
          </View>
        )}

        {/* Security & Privacy Explainer */}
        <View style={styles.securityRow}>
          <ShieldCheck size={14} color={colors.primaryDark} strokeWidth={2.2} />
          <Text style={styles.securityText}>
            Single-use code • Verifies job start without sharing phone number
          </Text>
        </View>

        {/* Done / Close CTA */}
        <Pressable
          style={styles.doneBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss QR sheet"
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  sheetContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeBtnPressed: {
    opacity: 0.7,
  },
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  qrCard: {
    width: 256,
    height: 256,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    marginTop: spacing.xs,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.amber50,
    borderWidth: 1,
    borderColor: palette.amber200,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  expiredBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.amber800,
  },
  expiredSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  refreshPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  refreshPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.pureWhite,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  refreshLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  refreshLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rotatingIcon: {
    opacity: 0.5,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  securityText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: palette.gray100,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
