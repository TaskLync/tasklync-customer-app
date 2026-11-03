import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MessageSquare,
} from 'lucide-react-native';
import { DisputeDetails, DisputeStatus } from '../../types/booking.types';
import { colors, palette, fontFamily, fontSize, radius, spacing } from '../../design';
import { DISPUTE_REASONS } from './DisputeReasonRadioGroup';

export interface BookingDisputeCardProps {
  dispute?: DisputeDetails | null;
  bookingId?: string;
  onContactSupport?: () => void;
  style?: StyleProp<ViewStyle>;
}

type DisputeStateKind = 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';

function resolveDisputeState(status?: DisputeStatus): DisputeStateKind {
  switch (status) {
    case 'OPEN':
    case 'SUBMITTED':
    case 'PENDING':
      return 'SUBMITTED';

    case 'UNDER_REVIEW':
    case 'UNDER_INVESTIGATION':
    case 'WORKER_RESPONDED':
      return 'UNDER_REVIEW';

    case 'RESOLVED':
    case 'REFUNDED':
      return 'RESOLVED';

    case 'REJECTED':
    case 'CLOSED':
      return 'CLOSED';

    default:
      return 'UNDER_REVIEW';
  }
}

function formatDisputeReason(reasonKey?: string): string {
  if (!reasonKey) return 'Service Issue';
  const found = DISPUTE_REASONS.find((r) => r.key === reasonKey);
  if (found) return found.label;

  // Format snake_case to human Title Case
  if (reasonKey.includes('_')) {
    return reasonKey
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return reasonKey;
}

/**
 * BookingDisputeCard Component
 *
 * Implements world-class Uber/Foodpanda/Careem minimalist UX standards:
 * 1. Strict Conditional Rendering: Hides completely when dispute is null/undefined.
 * 2. 4 Canonical States:
 *    - Dispute Submitted (OPEN / SUBMITTED / PENDING)
 *    - Under Review (WORKER_RESPONDED / UNDER_INVESTIGATION)
 *    - Dispute Resolved (RESOLVED / REFUNDED)
 *    - Dispute Closed (REJECTED / CLOSED)
 * 3. High-Trust Clarity: Transparently shows case number, user's claim, provider reply, and resolution notes.
 * 4. Ergonomic Next Actions: Compact, accessible touch targets for customer support.
 */
export const BookingDisputeCard: React.FC<BookingDisputeCardProps> = ({
  dispute,
  onContactSupport,
  style,
}) => {
  // Rule 1: Never render if no genuine dispute record exists
  if (!dispute || !dispute.id || !dispute.status) {
    return null;
  }

  const stateKind = resolveDisputeState(dispute.status);
  const formattedReason = formatDisputeReason(dispute.reason);
  const caseId = dispute.id.replace(/^d-/, '').slice(-6).toUpperCase();

  // State configurations: Title, Badge styles, and semantic iconography
  const stateConfig = {
    SUBMITTED: {
      title: 'Dispute Submitted',
      badgeLabel: 'Submitted',
      badgeBg: palette.blue50,
      badgeText: palette.blue700,
      badgeDot: colors.info,
      cardBorder: palette.blue100,
      icon: <Clock size={16} color={colors.textInfo} strokeWidth={2.2} />,
      statusNote: 'Our Trust & Safety team is reviewing your report. Typical turnaround is within 24 hours.',
    },
    UNDER_REVIEW: {
      title: 'Under Review',
      badgeLabel: 'Under Review',
      badgeBg: colors.warningLight,
      badgeText: palette.amber700,
      badgeDot: colors.warning,
      cardBorder: palette.amber200,
      icon: <ShieldAlert size={16} color={colors.warningMedium} strokeWidth={2.2} />,
      statusNote: 'Our dispute specialists are actively investigating this case and reviewing evidence.',
    },
    RESOLVED: {
      title: 'Dispute Resolved',
      badgeLabel: 'Resolved',
      badgeBg: colors.primaryLight,
      badgeText: colors.primaryDarker,
      badgeDot: colors.primaryDark,
      cardBorder: palette.emerald200,
      icon: <CheckCircle2 size={16} color={colors.primaryDark} strokeWidth={2.2} />,
      statusNote: 'This dispute has been resolved in your favor.',
    },
    CLOSED: {
      title: 'Dispute Closed',
      badgeLabel: 'Closed',
      badgeBg: colors.canvasGray,
      badgeText: colors.textSecondary,
      badgeDot: colors.textMuted,
      cardBorder: colors.border,
      icon: <AlertCircle size={16} color={colors.textSecondary} strokeWidth={2.2} />,
      statusNote: 'This dispute review has concluded.',
    },
  }[stateKind];

  return (
    <View
      style={[styles.container, { borderColor: stateConfig.cardBorder }, style]}
      accessibilityRole="region"
      accessibilityLabel={`Dispute status: ${stateConfig.title}, Case #${caseId}`}
    >
      {/* Top Header Row: Status Badge & Case Reference */}
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: stateConfig.badgeBg }]}>
          <View style={[styles.badgeDot, { backgroundColor: stateConfig.badgeDot }]} />
          <Text style={[styles.badgeText, { color: stateConfig.badgeText }]}>
            {stateConfig.badgeLabel}
          </Text>
        </View>

        <Text style={styles.caseIdText}>Case #{caseId}</Text>
      </View>

      {/* Title & Core Claim */}
      <View style={styles.titleRow}>
        <View style={styles.iconCircle}>{stateConfig.icon}</View>
        <View style={styles.titleTextWrap}>
          <Text style={styles.title}>{stateConfig.title}</Text>
          <Text style={styles.reasonText} numberOfLines={1}>
            {formattedReason}
          </Text>
        </View>
      </View>

      {/* Description / Customer Statement (if provided) */}
      {dispute.description && dispute.description.trim().length > 0 ? (
        <Text style={styles.descriptionText} numberOfLines={3}>
          "{dispute.description.trim()}"
        </Text>
      ) : null}

      {/* Worker Reply Quote (When Under Review or Responded) */}
      {dispute.worker_response ? (
        <View style={styles.workerReplyBox}>
          <Text style={styles.workerReplyLabel}>Professional's Response</Text>
          <Text style={styles.workerReplyText}>
            "{dispute.worker_response.trim()}"
          </Text>
        </View>
      ) : null}

      {/* Resolution Notes (When Resolved or Closed) */}
      {dispute.resolution_notes ? (
        <View
          style={[
            styles.resolutionBox,
            stateKind === 'RESOLVED' ? styles.resolutionBoxResolved : styles.resolutionBoxClosed,
          ]}
        >
          <Text
            style={[
              styles.resolutionLabel,
              stateKind === 'RESOLVED' ? styles.resolutionLabelResolved : styles.resolutionLabelClosed,
            ]}
          >
            {stateKind === 'RESOLVED' ? 'Resolution Summary' : 'Closure Reason'}
          </Text>
          <Text style={styles.resolutionText}>
            {dispute.resolution_notes.trim()}
          </Text>
        </View>
      ) : null}

      {/* Footnote / Next Expected Step */}
      <Text style={styles.statusNote}>{stateConfig.statusNote}</Text>

      {/* Next Action: Contact Support */}
      {onContactSupport && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onContactSupport}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Contact TaskLync customer support regarding this dispute"
          >
            <MessageSquare size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>
              {stateKind === 'RESOLVED' || stateKind === 'CLOSED'
                ? 'Need Help? Contact Support'
                : 'Chat with Dispute Support'}
            </Text>
            <ChevronRight size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    padding: spacing.base,
    marginVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.nano + 1,
    letterSpacing: 0.2,
  },
  caseIdText: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.caption - 1,
    color: colors.textMuted,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  titleTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2 + 1,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  reasonText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  descriptionText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: palette.gray700,
    lineHeight: 18,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  workerReplyBox: {
    backgroundColor: palette.gray50,
    borderLeftWidth: 3,
    borderLeftColor: palette.warning,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  workerReplyLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.nano + 1,
    color: palette.warningDark,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  workerReplyText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: palette.gray800,
    lineHeight: 17,
  },
  resolutionBox: {
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
  },
  resolutionBoxResolved: {
    backgroundColor: palette.green50,
    borderLeftColor: palette.green500,
  },
  resolutionBoxClosed: {
    backgroundColor: palette.gray100,
    borderLeftColor: palette.gray400,
  },
  resolutionLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.nano + 1,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  resolutionLabelResolved: {
    color: palette.green800,
  },
  resolutionLabelClosed: {
    color: palette.gray700,
  },
  resolutionText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: palette.gray800,
    lineHeight: 17,
  },
  statusNote: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption - 1,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  actionRow: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  actionBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
    flex: 1,
  },
});
