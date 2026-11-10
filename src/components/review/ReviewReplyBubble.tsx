import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { format, parseISO } from 'date-fns';
import { fontFamily as fonts } from '../../design/typography';
import { radius } from '../../design/radius';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ReviewReplyBubbleProps {
  reply: string;
  workerName: string;
  repliedAt: string | null;
  workerAvatar?: string | null;
  style?: ViewStyle;
}

/**
 * Compact, lightly tinted provider response container with a thin green accent.
 * Completely hidden when no reply exists.
 */
export const ReviewReplyBubble: React.FC<ReviewReplyBubbleProps> = ({
  reply,
  workerName,
  repliedAt,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  if (!reply || !reply.trim()) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const parsedDate = parseISO(dateString);
      return format(parsedDate, 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  const formattedDate = formatDate(repliedAt);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText} numberOfLines={1}>
          Response from {workerName || 'Provider'}
        </Text>
        {formattedDate ? <Text style={styles.dateText}>{formattedDate}</Text> : null}
      </View>

      <Text style={styles.replyText}>{reply.trim()}</Text>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.sm, // 8
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderLeftWidth: 2.5,
    borderLeftColor: colors.primaryDark,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 11.5,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontFamily: fonts.inter.regular,
    fontSize: 10,
    color: palette.gray400,
  },
  replyText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 12.5,
    color: palette.gray700,
    lineHeight: 18,
  },
});
