import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Banknote,
  Wrench,
} from 'lucide-react-native';
import { CustomServiceRequest, CustomRequestStatus } from '../../types/customRequest.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CustomRequestCardProps {
  request: CustomServiceRequest;
}

export function CustomRequestCard({ request }: CustomRequestCardProps) {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handlePress = () => {
    if (request.status === CustomRequestStatus.QUOTE_SENT) {
      router.push(`/custom-request/${request.id}/quote` as any);
    } else {
      router.push(`/custom-request/${request.id}` as any);
    }
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case CustomRequestStatus.SUBMITTED:
        return {
          label: 'Submitted',
          bgColor: colors.warningLight,
          textColor: colors.warningMedium,
        };
      case CustomRequestStatus.UNDER_REVIEW:
        return {
          label: 'Under Review',
          bgColor: colors.infoLight,
          textColor: colors.infoMedium,
        };
      case CustomRequestStatus.CLARIFICATION_REQUESTED:
        return {
          label: 'Chat Needed',
          bgColor: palette.purple50,
          textColor: palette.purple600,
        };
      case CustomRequestStatus.QUOTE_SENT:
        return {
          label: 'Quote Ready',
          bgColor: colors.primaryLight,
          textColor: colors.primaryDarker,
        };
      case CustomRequestStatus.ACCEPTED:
        return {
          label: 'Accepted',
          bgColor: colors.primaryLight,
          textColor: colors.primaryDarker,
        };
      case CustomRequestStatus.CONVERTED:
        return {
          label: 'Booked',
          bgColor: colors.primaryLight,
          textColor: colors.primaryDarker,
        };
      case CustomRequestStatus.DECLINED:
        return {
          label: 'Declined',
          bgColor: colors.dangerLight,
          textColor: colors.dangerMedium,
        };
      case CustomRequestStatus.CANCELLED:
        return {
          label: 'Cancelled',
          bgColor: colors.canvasGray,
          textColor: colors.textSecondary,
        };
      default:
        return {
          label: request.status,
          bgColor: colors.canvasGray,
          textColor: colors.textSecondary,
        };
    }
  };

  const badge = getStatusBadge();

  const dateStr = request.created_at
    ? new Date(request.created_at).toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <View style={styles.categoryPill}>
          <Wrench size={12} color={palette.green600} />
          <Text style={styles.categoryText}>
            {request.category_name || request.category_id || 'Custom Request'}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
          <Text style={[styles.statusBadgeText, { color: badge.textColor }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {request.title}
      </Text>

      <Text style={styles.workerText} numberOfLines={1}>
        {request.provider_type === 'COMPANY' ? 'Agency' : 'Professional'}:{' '}
        {request.provider_name || request.worker_name || 'Assigned Technician'}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.dateWrap}>
          <Clock size={12} color={palette.gray400} />
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {request.active_quote ? (
          <View style={styles.quotePill}>
            <Text style={styles.quotePillLabel}>Quoted:</Text>
            <Text style={styles.quotePillPrice}>
              PKR {request.active_quote.total_price.toLocaleString()}
            </Text>
          </View>
        ) : (
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={14} color={palette.gray400} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: palette.green600,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: palette.gray900,
    lineHeight: 20,
    marginBottom: 4,
  },
  workerText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.gray400,
    marginLeft: 4,
  },
  quotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBorderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quotePillLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: colors.textGreenDark,
    marginRight: 4,
  },
  quotePillPrice: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: colors.textGreen,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: palette.gray500,
  },
});
