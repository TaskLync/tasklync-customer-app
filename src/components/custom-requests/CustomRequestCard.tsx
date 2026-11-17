import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { CustomServiceRequest, CustomRequestStatus } from '../../types/customRequest.types';
import { requestStatusBadge, type BadgeTone } from '../../utils/customRequestFilters';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CustomRequestCardProps {
  request: CustomServiceRequest;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
};

/**
 * Custom quote card: category + status, title, professional, then date and the next action.
 * Press feedback is a soft neutral fill on the rounded surface itself (no opacity fade, no ripple).
 */
export const CustomRequestCard = React.memo(function CustomRequestCard({ request }: CustomRequestCardProps) {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const isQuoteReady = request.status === CustomRequestStatus.QUOTE_SENT;
  const handlePress = () => {
    router.push((isQuoteReady ? `/custom-request/${request.id}/quote` : `/custom-request/${request.id}`) as any);
  };

  const badge = requestStatusBadge(request.status);
  const toneStyle = toneStyles(badge.tone, colors, palette);
  const provider = request.provider_name || request.worker_name || 'Assigned Technician';
  const providerKind = request.provider_type === 'COMPANY' ? 'Agency' : 'Professional';
  const category = request.category_name || request.category_id || 'Custom request';
  const quote = request.active_quote;
  const dateStr = formatDate(request.created_at);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${request.title}. ${category}. ${badge.label}. ${providerKind} ${provider}.${
        quote ? ` Quoted PKR ${quote.total_price.toLocaleString()}.` : ''
      }`}
      accessibilityHint={isQuoteReady ? 'Opens the quote' : 'Opens the request details'}
    >
      <View style={styles.topRow}>
        <Text style={styles.category} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {category}
        </Text>
        <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
          <Text style={[styles.badgeText, { color: toneStyle.fg }]} maxFontSizeMultiplier={1.2}>
            {badge.label}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.3}>
        {request.title}
      </Text>
      <Text style={styles.provider} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {providerKind} · {provider}
      </Text>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.date}>
          <CalendarDays size={14} strokeWidth={2} color={colors.textMuted} />
          <Text style={styles.dateText} maxFontSizeMultiplier={1.3}>
            {dateStr}
          </Text>
        </View>

        <View style={styles.action}>
          {quote ? (
            <Text style={[styles.price, isQuoteReady && styles.priceReady]} maxFontSizeMultiplier={1.3}>
              PKR {quote.total_price.toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.actionText} maxFontSizeMultiplier={1.3}>
              View details
            </Text>
          )}
          <ChevronRight size={16} strokeWidth={2} color={isQuoteReady ? palette.green700 : colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
});

function toneStyles(tone: BadgeTone, colors: AppTheme['colors'], palette: AppTheme['palette']) {
  switch (tone) {
    case 'amber':
      return { bg: palette.amber50, fg: palette.amber800 };
    case 'green':
      return { bg: colors.primaryTint, fg: palette.green700 };
    case 'info':
      return { bg: palette.blue50, fg: palette.blue700 };
    case 'danger':
      return { bg: palette.red50, fg: palette.red700 };
    case 'neutral':
      return { bg: colors.searchFieldBg, fg: colors.textSecondary };
    case 'muted':
    default:
      return { bg: colors.searchFieldBg, fg: colors.textMuted };
  }
}

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardRaised,
      borderRadius: 16,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
      padding: 16,
      marginBottom: 12,
    },
    cardPressed: {
      backgroundColor: colors.bgHover,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    category: {
      flexShrink: 1,
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 12.5,
      letterSpacing: 0.2,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    badge: {
      height: 24,
      paddingHorizontal: 9,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 11.5,
      includeFontPadding: false,
    },
    title: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.2,
      color: colors.textPrimary,
    },
    provider: {
      marginTop: 4,
      fontFamily: typography.fontFamily.jakarta.regular,
      fontSize: 13.5,
      color: colors.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginTop: 14,
      marginBottom: 12,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    date: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dateText: {
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 12.5,
      color: colors.textMuted,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    actionText: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    price: {
      fontFamily: typography.fontFamily.inter.semiBold,
      fontSize: 14,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    priceReady: {
      color: palette.green700,
    },
  });
