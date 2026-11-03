import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { colors, palette, radius, spacing } from '../../design';
import { formatRemainingTime } from '../../utils/verificationState.util';
import { useBookingVerificationOtp } from '../../hooks/useBookingVerification';

interface BookingVerificationCardProps {
  bookingId: string;
  isEligible: boolean;
  onOpenQr: () => void;
}

export const BookingVerificationCard: React.FC<BookingVerificationCardProps> = ({
  bookingId,
  isEligible,
  onOpenQr,
}) => {
  const {
    otp,
    remainingSeconds,
    isExpired,
    isLoading,
    isRefetching,
    error,
    refreshOtp,
  } = useBookingVerificationOtp(bookingId, isEligible);

  const [copied, setCopied] = useState(false);

  if (!isEligible) {
    return null;
  }

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    if (!otp) return;
    await Clipboard.setStringAsync(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split OTP into individual digits (typically 6 digits from backend)
  const digits = otp ? otp.trim().split('') : [];

  return (
    <View style={styles.card}>
      {/* Header with verification badge */}
      <View style={styles.headerRow}>
        <View style={styles.shieldBadge}>
          <ShieldCheck size={18} color={colors.primaryDark} strokeWidth={2.4} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Your Job Verification Code</Text>
          <Text style={styles.subtitle}>
            Share this code with your worker when they arrive to start the service.
          </Text>
        </View>
      </View>

      {/* Main OTP Container */}
      <View style={styles.otpSection}>
        {isLoading && !otp ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Text style={styles.loadingText}>Retrieving secure code...</Text>
          </View>
        ) : error && !otp ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error.message}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={refreshOtp}
              disabled={isRefetching}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <>
                  <RefreshCw size={13} color={colors.primaryDark} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : isExpired ? (
          <View style={styles.expiredContainer}>
            <View style={styles.expiredBanner}>
              <AlertCircle size={16} color={palette.amber700} />
              <Text style={styles.expiredText}>Code expired for security</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshPrimaryBtn}
              onPress={refreshOtp}
              disabled={isRefetching}
              accessibilityRole="button"
              accessibilityLabel="Generate a new verification code"
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <RefreshCw size={15} color={colors.white} />
                  <Text style={styles.refreshPrimaryBtnText}>Generate New Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : digits.length > 0 ? (
          <View style={styles.digitsRow}>
            {digits.map((digit, index) => (
              <View key={`otp-${index}`} style={styles.digitBox}>
                <Text
                  style={styles.digitText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {digit}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Text style={styles.loadingText}>Retrieving secure code...</Text>
          </View>
        )}
      </View>

      {/* Expiry status & Copy action row (only when active OTP is present) */}
      {Boolean(otp) && !isExpired && (
        <View style={styles.metaRow}>
          <View style={styles.timerBadge}>
            <Clock size={13} color={colors.textSecondary} />
            <Text style={styles.timerText}>
              Valid for {formatRemainingTime(remainingSeconds)}
            </Text>
          </View>

          <View style={styles.metaActions}>
            <TouchableOpacity
              style={styles.iconRefreshBtn}
              onPress={refreshOtp}
              disabled={isRefetching}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Refresh verification code"
            >
              <RefreshCw
                size={14}
                color={colors.textSecondary}
                style={isRefetching ? styles.rotatingIcon : undefined}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
              onPress={handleCopy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Code copied' : 'Copy verification code'}
            >
              {copied ? (
                <>
                  <Check size={13} color={colors.textGreen} strokeWidth={2.5} />
                  <Text style={styles.copyTextSuccess}>Copied</Text>
                </>
              ) : (
                <>
                  <Copy size={13} color={colors.textSecondary} />
                  <Text style={styles.copyText}>Copy Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Subtle Separator */}
      <View style={styles.divider} />

      {/* Secondary Alternative Action: Show QR Code */}
      <TouchableOpacity
        style={styles.qrActionRow}
        onPress={onOpenQr}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Show QR code for worker to scan"
      >
        <View style={styles.qrActionLeft}>
          <View style={styles.qrIconWrap}>
            <QrCode size={18} color={palette.gray800} strokeWidth={2} />
          </View>
          <View style={styles.qrTextCol}>
            <Text style={styles.qrActionTitle}>Prefer contactless scan?</Text>
            <Text style={styles.qrActionSubtitle}>Show QR Code to your worker</Text>
          </View>
        </View>
        <View style={styles.qrActionPill}>
          <Text style={styles.qrActionPillText}>Show QR</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  shieldBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  otpSection: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    marginTop: spacing.xs,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  expiredContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    width: '100%',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.amber50,
    borderWidth: 1,
    borderColor: palette.amber200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  expiredText: {
    fontSize: 13,
    fontWeight: '500',
    color: palette.amber800,
  },
  refreshPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  refreshPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingVertical: spacing.xs,
  },
  digitBox: {
    flex: 1,
    maxWidth: 46,
    minWidth: 32,
    height: 50,
    borderRadius: 10,
    backgroundColor: palette.gray50,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    textAlign: 'center',
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: palette.gray50,
    flexShrink: 1,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  iconRefreshBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingIcon: {
    opacity: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
    justifyContent: 'center',
  },
  copyBtnSuccess: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryBorderSubtle,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  copyTextSuccess: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textGreen,
  },
  divider: {
    height: 1,
    backgroundColor: palette.gray100,
    marginVertical: spacing.md,
  },
  qrActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.gray50,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    gap: spacing.sm,
  },
  qrActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  qrIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  qrTextCol: {
    flex: 1,
    minWidth: 0,
  },
  qrActionTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  qrActionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  qrActionPill: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    flexShrink: 0,
  },
  qrActionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
