import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  QrCodeIcon,
  RefreshIcon,
  ShieldCheckIcon,
} from '../ui/Icon/icons';
import { formatRemainingTime } from '../../utils/verificationState.util';
import { useBookingVerificationOtp } from '../../hooks/useBookingVerification';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingVerificationCardProps {
  bookingId: string;
  isEligible: boolean;
  onOpenQr: () => void;
}

/**
 * Job verification: the six-digit start code and the contactless QR alternative, as one card.
 * Presentation only; the code lifecycle (fetch, expiry, regenerate) lives in useBookingVerificationOtp.
 */
export const BookingVerificationCard: React.FC<BookingVerificationCardProps> = ({
  bookingId,
  isEligible,
  onOpenQr,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.shieldBadge}>
          <ShieldCheckIcon size={18} color={colors.primaryDark} strokeWidth={2} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Job verification code</Text>
          <Text style={styles.subtitle}>
            Share this code with your worker when they arrive to start the job.
          </Text>
        </View>
      </View>

      {/* Code */}
      <View style={styles.otpSection}>
        {isLoading && !otp ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={styles.stateText}>Retrieving secure code…</Text>
          </View>
        ) : error && !otp ? (
          <View style={styles.stateBoxColumn}>
            <View style={styles.inlineRow}>
              <AlertCircleIcon size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
              onPress={refreshOtp}
              disabled={isRefetching}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading verification code"
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <RefreshIcon size={13} color={colors.textPrimary} />
                  <Text style={styles.ghostBtnText}>Retry</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : isExpired ? (
          <View style={styles.stateBoxColumn}>
            <View style={styles.inlineRow}>
              <AlertCircleIcon size={16} color={palette.amber700} />
              <Text style={styles.expiredText}>Code expired for your security</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={refreshOtp}
              disabled={isRefetching}
              accessibilityRole="button"
              accessibilityLabel="Generate a new verification code"
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={colors.pureWhite} />
              ) : (
                <>
                  <RefreshIcon size={15} color={colors.pureWhite} />
                  <Text style={styles.primaryBtnText}>Generate new code</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : digits.length > 0 ? (
          <View
            style={styles.digitsRow}
            accessible
            accessibilityLabel={`Verification code ${digits.join(' ')}`}
          >
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
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={styles.stateText}>Retrieving secure code…</Text>
          </View>
        )}
      </View>

      {/* Validity + actions (only while a live code is shown) */}
      {Boolean(otp) && !isExpired && (
        <View style={styles.metaRow}>
          <View style={styles.timerRow}>
            <ClockIcon size={13} color={colors.textMuted} />
            <Text style={styles.timerText}>
              Valid for {formatRemainingTime(remainingSeconds)}
            </Text>
          </View>

          <View style={styles.metaActions}>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
              onPress={refreshOtp}
              disabled={isRefetching}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Generate a new verification code"
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <RefreshIcon size={14} color={colors.textSecondary} />
              )}
              <Text style={styles.ghostBtnMutedText}>New code</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.copyBtn,
                copied && styles.copyBtnSuccess,
                pressed && !copied && styles.copyBtnPressed,
              ]}
              onPress={handleCopy}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Code copied' : 'Copy verification code'}
            >
              {copied ? (
                <>
                  <CheckIcon size={14} color={colors.textGreen} strokeWidth={2.5} />
                  <Text style={styles.copyTextSuccess}>Copied</Text>
                </>
              ) : (
                <>
                  <CopyIcon size={14} color={colors.textPrimary} />
                  <Text style={styles.copyText}>Copy code</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Contactless alternative: integrated inset row, opens the QR sheet */}
      <Pressable
        style={({ pressed }) => [styles.qrRow, pressed && styles.qrRowPressed]}
        onPress={onOpenQr}
        accessibilityRole="button"
        accessibilityLabel="Show QR code for your worker to scan"
      >
        <View style={styles.qrIconWrap}>
          <QrCodeIcon size={18} color={colors.textPrimary} strokeWidth={1.9} />
        </View>
        <View style={styles.qrTextCol}>
          <Text style={styles.qrTitle}>Contactless check-in</Text>
          <Text style={styles.qrSubtitle} numberOfLines={2}>
            Let your worker scan a QR code instead
          </Text>
        </View>
        <View style={styles.qrCta}>
          <Text style={styles.qrCtaText}>Show QR</Text>
          <ChevronRightIcon size={14} color={colors.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardRaised,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  shieldBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15.5,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Code
  otpSection: {
    marginTop: 16,
    minHeight: 58,
    justifyContent: 'center',
  },
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  digitBox: {
    flex: 1,
    maxWidth: 50,
    height: 58,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
  },
  stateBoxColumn: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
  },
  stateText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: colors.textSecondary,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  errorText: {
    flexShrink: 1,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: colors.textDanger,
  },
  expiredText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.amber800,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
  },
  primaryBtnPressed: {
    backgroundColor: colors.buttonPrimaryPressed,
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.pureWhite,
  },

  // Validity + actions
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    marginTop: 12,
  },
  timerRow: {
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
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  ghostBtnPressed: {
    backgroundColor: colors.bgHover,
  },
  ghostBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  ghostBtnMutedText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.bgHover,
  },
  copyBtnPressed: {
    backgroundColor: colors.buttonSecondaryPressed,
  },
  copyBtnSuccess: {
    backgroundColor: colors.primaryTint,
  },
  copyText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  copyTextSuccess: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.textGreen,
  },

  // QR alternative
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
  },
  qrRowPressed: {
    backgroundColor: colors.buttonSecondaryPressed,
  },
  qrIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTextCol: {
    flex: 1,
    minWidth: 0,
  },
  qrTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  qrSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 1,
  },
  qrCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 10,
    paddingRight: 6,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
  },
  qrCtaText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
  },
});
