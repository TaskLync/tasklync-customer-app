import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  AlertCircleIcon,
  ClockIcon,
  CloseIcon,
  RefreshIcon,
  ShieldCheckIcon,
} from '../ui/Icon/icons';
import { BottomSheet } from '../layout/BottomSheet';
import { formatRemainingTime } from '../../utils/verificationState.util';
import { useBookingVerificationQr } from '../../hooks/useBookingVerification';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingQRCodeSheetProps {
  bookingId: string;
  visible: boolean;
  isEligible: boolean;
  onClose: () => void;
}

/**
 * Scanners read dark modules on a light field. The code is always drawn dark-on-white,
 * in BOTH themes (theme tokens would invert it in Dark mode and hurt scan reliability).
 */
const QR_INK = '#0F172A';
const QR_PLATE = '#FFFFFF';

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
            <Text style={styles.title}>Your check-in QR code</Text>
            <Text style={styles.subtitle}>
              Ask your worker to scan this code to start the job.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close QR Code sheet"
          >
            <CloseIcon size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* QR plate (always white so the code scans reliably) */}
        <View style={styles.canvasContainer}>
          <View style={styles.qrCard}>
            {isLoading && !svgData ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={palette.green700Fixed} />
                <Text style={styles.plateText}>Generating secure QR code…</Text>
              </View>
            ) : error && !svgData ? (
              <View style={styles.centerBox}>
                <AlertCircleIcon size={22} color={colors.buttonDestructive} />
                <Text style={styles.plateErrorText}>{error.message}</Text>
                <Pressable
                  style={({ pressed }) => [styles.plateBtn, pressed && styles.plateBtnPressed]}
                  onPress={refreshQr}
                  disabled={isRefetching}
                  accessibilityRole="button"
                  accessibilityLabel="Try generating the QR code again"
                >
                  {isRefetching ? (
                    <ActivityIndicator size="small" color={QR_INK} />
                  ) : (
                    <>
                      <RefreshIcon size={14} color={QR_INK} />
                      <Text style={styles.plateBtnText}>Try again</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : isExpired ? (
              <View style={styles.centerBox}>
                <AlertCircleIcon size={22} color="#B45309" />
                <Text style={styles.plateTitle}>QR code expired</Text>
                <Text style={styles.plateText}>
                  Codes refresh periodically for your security.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  onPress={refreshQr}
                  disabled={isRefetching}
                  accessibilityRole="button"
                  accessibilityLabel="Generate a new QR code"
                >
                  {isRefetching ? (
                    <ActivityIndicator size="small" color={colors.pureWhite} />
                  ) : (
                    <>
                      <RefreshIcon size={15} color={colors.pureWhite} />
                      <Text style={styles.primaryBtnText}>Generate new QR</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : svgData ? (
              <Svg
                width={216}
                height={216}
                viewBox={`0 0 ${svgData.gridSize} ${svgData.gridSize}`}
                accessibilityLabel="Job check-in QR code"
              >
                <Path d={svgData.path} fill={QR_INK} />
              </Svg>
            ) : (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={palette.green700Fixed} />
              </View>
            )}
          </View>
        </View>

        {/* Validity */}
        {Boolean(svgData) && !isExpired && (
          <View style={styles.timerRow}>
            <View style={styles.inlineRow}>
              <ClockIcon size={13} color={colors.textMuted} />
              <Text style={styles.timerText}>
                Valid for {formatRemainingTime(remainingSeconds)}
              </Text>
            </View>

            <View style={styles.timerDivider} />

            <Pressable
              style={({ pressed }) => [styles.refreshLinkBtn, pressed && styles.refreshLinkBtnPressed]}
              onPress={refreshQr}
              disabled={isRefetching}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Refresh QR Code"
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <RefreshIcon size={13} color={colors.textSecondary} />
              )}
              <Text style={styles.refreshLinkText}>Refresh</Text>
            </Pressable>
          </View>
        )}

        {/* Privacy note */}
        <View style={styles.securityRow}>
          <ShieldCheckIcon size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.securityText}>
            Single-use code · your phone number stays private
          </Text>
        </View>

        {/* Dismiss */}
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
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

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  sheetContent: {
    paddingTop: 4,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    backgroundColor: colors.buttonSecondaryPressed,
  },

  // QR plate
  canvasContainer: {
    alignItems: 'center',
  },
  qrCard: {
    width: 248,
    height: 248,
    backgroundColor: QR_PLATE,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  plateTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: QR_INK,
  },
  plateText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: '#475569',
    textAlign: 'center',
  },
  plateErrorText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12.5,
    lineHeight: 17,
    color: '#B91C1C',
    textAlign: 'center',
  },
  plateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginTop: 4,
  },
  plateBtnPressed: {
    backgroundColor: '#E2E8F0',
  },
  plateBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: QR_INK,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    marginTop: 4,
  },
  primaryBtnPressed: {
    backgroundColor: colors.buttonPrimaryPressed,
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13.5,
    color: colors.pureWhite,
  },

  // Validity
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  timerDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  refreshLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  refreshLinkBtnPressed: {
    backgroundColor: colors.bgHover,
  },
  refreshLinkText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12.5,
    color: colors.textSecondary,
  },

  // Privacy + dismiss
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  securityText: {
    flexShrink: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  doneBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnPressed: {
    backgroundColor: colors.buttonSecondaryPressed,
  },
  doneBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
});
