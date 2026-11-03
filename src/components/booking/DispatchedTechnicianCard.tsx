import { colors, palette } from '../../design';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import {
  Phone,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  User,
  Building2,
  Clock,
} from 'lucide-react-native';
import {
  parsePakistaniPhone,
  openPhoneDialer,
  openWhatsAppChat,
} from '../../utils/phone.utils';
import { companyTokens } from '../../theme/companyTokens';

interface DispatchedTechnicianCardProps {
  companyName: string | null;
  technicianName: string | null;
  technicianPhone: string | null;
  technicianPhoto?: string | null;
  bookingId?: string;
  onContactSupportOffice?: () => void;
}

export const DispatchedTechnicianCard: React.FC<DispatchedTechnicianCardProps> = ({
  companyName,
  technicianName,
  technicianPhone,
  technicianPhoto,
  bookingId,
  onContactSupportOffice,
}) => {
  const resolvedAgencyName = companyName || 'Service Agency';

  // Smart label helper: prevents duplicate "Office" and handles long agency names cleanly
  const getChatButtonLabel = () => {
    if (!companyName) return 'Chat with Agency Office';
    const trimmed = companyName.trim();
    if (trimmed.toLowerCase().endsWith('office')) {
      return `Chat with ${trimmed}`;
    }
    return `Chat with ${trimmed} Office`;
  };

  // ── STATE A: Technician NOT Assigned Yet ──
  if (!technicianName) {
    return (
      <View style={styles.cardContainer}>
        {/* Agency Header Row */}
        <View style={styles.agencyHeaderRow}>
          <View style={styles.agencyIconWrapper}>
            <Building2 size={18} color={colors.textInfo} />
          </View>
          <View style={styles.agencyHeaderInfo}>
            <Text style={styles.agencyName} numberOfLines={1}>
              {resolvedAgencyName}
            </Text>
            <View style={styles.agencyMetaRow}>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={11} color={colors.textGreen} strokeWidth={2.5} />
                <Text style={styles.verifiedBadgeText}>Verified Agency</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Technician Assignment Status (Clean, Minimalist, Full-Width) */}
        <View style={styles.unassignedStatusCard}>
          <View style={styles.unassignedIconWrap}>
            <Clock size={16} color={colors.warningMedium} />
          </View>
          <View style={styles.unassignedTextWrap}>
            <Text style={styles.unassignedTitle}>Technician not assigned yet</Text>
            <Text style={styles.unassignedSub}>
              The agency will dispatch a verified technician for your booking.
            </Text>
          </View>
        </View>

        {/* Primary CTA: Chat with Agency Office (100% Responsive, Zero-Clip, Dedicated Icon Wrap) */}
        {onContactSupportOffice && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryChatButton,
              pressed && styles.primaryChatButtonPressed,
            ]}
            onPress={onContactSupportOffice}
            accessibilityRole="button"
            accessibilityLabel={getChatButtonLabel()}
          >
            <View style={styles.chatIconWrapper}>
              <MessageSquare size={17} color={colors.white} strokeWidth={2.2} />
            </View>
            <Text
              style={styles.primaryChatButtonText}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {getChatButtonLabel()}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ── STATE B: Technician IS Assigned ──
  const parsedPhone = parsePakistaniPhone(technicianPhone);

  const handleCall = () => {
    openPhoneDialer(technicianPhone);
  };

  const handleWhatsApp = () => {
    const greeting = `Assalam-o-Alaikum ${technicianName}, I am contacting you regarding TaskLync booking #${
      bookingId ? bookingId.substring(0, 8).toUpperCase() : ''
    }. Are you on your way?`;
    openWhatsAppChat(technicianPhone, greeting);
  };

  // Resolve carrier styling
  const getCarrierBadgeStyle = (carrier: string) => {
    switch (carrier) {
      case 'JAZZ':
        return { bg: companyTokens.colors.jazzTint, text: companyTokens.colors.jazzRed };
      case 'ZONG':
        return { bg: companyTokens.colors.zongTint, text: companyTokens.colors.zongGreen };
      case 'TELENOR':
        return { bg: companyTokens.colors.telenorTint, text: companyTokens.colors.telenorBlue };
      case 'UFONE':
        return { bg: companyTokens.colors.ufoneTint, text: companyTokens.colors.ufoneOrange };
      default:
        return { bg: '#F1F5F9', text: companyTokens.colors.corporateMuted };
    }
  };

  const carrierStyle = getCarrierBadgeStyle(parsedPhone.carrier);

  return (
    <View style={styles.cardContainer}>
      {/* Agency Header Row */}
      <View style={styles.agencyHeaderRow}>
        <View style={styles.agencyIconWrapper}>
          <Building2 size={18} color={colors.textInfo} />
        </View>
        <View style={styles.agencyHeaderInfo}>
          <Text style={styles.agencyName} numberOfLines={1}>
            {resolvedAgencyName}
          </Text>
          <View style={styles.agencyMetaRow}>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={11} color={colors.textGreen} strokeWidth={2.5} />
              <Text style={styles.verifiedBadgeText}>Verified Agency</Text>
            </View>
          </View>
        </View>

        {onContactSupportOffice && (
          <Pressable
            style={({ pressed }) => [
              styles.officeChatPill,
              pressed && { opacity: 0.8 },
            ]}
            onPress={onContactSupportOffice}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${resolvedAgencyName} Office`}
          >
            <View style={styles.officeChatIconWrapper}>
              <MessageSquare size={13} color={colors.textInfo} strokeWidth={2.2} />
            </View>
            <Text style={styles.officeChatPillText}>Office Chat</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.divider} />

      {/* Dispatched Field Technician Section */}
      <View style={styles.technicianSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>ASSIGNED FIELD TECHNICIAN</Text>
          <View style={styles.assignedBadge}>
            <View style={styles.assignedDot} />
            <Text style={styles.assignedBadgeText}>Dispatched</Text>
          </View>
        </View>

        <View style={styles.technicianIdentityRow}>
          <View style={styles.avatarWrapper}>
            {technicianPhoto ? (
              <Image
                source={{ uri: technicianPhoto }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <User size={22} color={colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.technicianDetails}>
            <Text style={styles.technicianName} numberOfLines={1}>
              {technicianName}
            </Text>
            <Text style={styles.technicianRole}>Field Technician</Text>

            <View style={styles.phoneRow}>
              <Text style={styles.phoneText}>{parsedPhone.nationalFormat}</Text>
              {parsedPhone.carrier !== 'UNKNOWN' && (
                <View style={[styles.carrierPill, { backgroundColor: carrierStyle.bg }]}>
                  <Text style={[styles.carrierPillText, { color: carrierStyle.text }]}>
                    {parsedPhone.carrierDisplayName}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Direct Contact Actions (Call & WhatsApp) */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.callButton,
              pressed && { opacity: 0.88 },
            ]}
            onPress={handleCall}
            accessibilityRole="button"
            accessibilityLabel={`Call technician ${technicianName}`}
          >
            <View style={styles.actionBtnIconWrap}>
              <Phone size={15} color={colors.white} strokeWidth={2.2} />
            </View>
            <Text style={styles.callButtonText} numberOfLines={1}>Call Technician</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.whatsappButton,
              pressed && { opacity: 0.88 },
            ]}
            onPress={handleWhatsApp}
            accessibilityRole="button"
            accessibilityLabel={`WhatsApp message to ${technicianName}`}
          >
            <View style={styles.actionBtnIconWrap}>
              <MessageCircle size={16} color={colors.textGreen} strokeWidth={2.2} />
            </View>
            <Text style={styles.whatsappButtonText} numberOfLines={1}>WhatsApp</Text>
          </Pressable>
        </View>
      </View>

      {/* Doorstep Verification & Safety Note */}
      <View style={styles.safetyBox}>
        <ShieldCheck size={13} color={colors.textGreen} strokeWidth={2.2} style={{ marginTop: 1 }} />
        <Text style={styles.safetyBody}>
          <Text style={styles.safetyBold}>Doorstep Verification: </Text>
          Verify technician identity before service. Pay cash only after service completion.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bgHover,
    marginVertical: 12,
  },

  // Agency Header
  agencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.infoLight,
    borderWidth: 1,
    borderColor: colors.borderInfoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    flexShrink: 0,
  },
  agencyHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  agencyName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  agencyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: colors.lightGreen,
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  verifiedBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10.5,
    color: colors.textGreen,
  },
  officeChatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.infoLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderInfoLight,
    flexShrink: 0,
  },
  officeChatIconWrapper: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  officeChatPillText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11.5,
    color: colors.textInfo,
  },

  // Unassigned Status Card
  unassignedStatusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgSubtle,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unassignedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  unassignedTextWrap: {
    flex: 1,
  },
  unassignedTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  unassignedSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Primary Chat Button (100% Responsive, zero clipping, dedicated non-shrinking icon container)
  primaryChatButton: {
    marginTop: 12,
    minHeight: 48,
    backgroundColor: colors.infoMedium,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryChatButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  chatIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  primaryChatButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: colors.white,
    lineHeight: 18,
    flexShrink: 1,
    textAlign: 'center',
  },

  // Technician Section (Assigned)
  technicianSection: {
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assignedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primaryDark,
  },
  assignedBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: colors.primaryDark,
  },

  // Technician Identity
  technicianIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgHover,
  },
  technicianDetails: {
    flex: 1,
  },
  technicianName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 1,
  },
  technicianRole: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11.5,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  phoneText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  carrierPill: {
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  carrierPillText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 9.5,
    letterSpacing: 0.2,
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 12,
  },
  actionBtnIconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  callButton: {
    backgroundColor: '#0F172A',
  },
  callButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: colors.white,
  },
  whatsappButton: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  whatsappButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: colors.textGreen,
  },

  // Safety Guidance
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgSubtle,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  safetyBold: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: colors.textPrimary,
  },
  safetyBody: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
