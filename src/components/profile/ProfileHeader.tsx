import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserCheck } from 'lucide-react-native';
import { UserProfile } from '../../types/user.types';
import { AvatarUploadRing } from './AvatarUploadRing';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ProfileHeaderProps {
  user?: UserProfile | null | undefined;
  onEditPress: () => void;
}

/**
 * ProfileHeader Component
 *
 * Compact, balanced profile card with clean hierarchy:
 * - 68px balanced avatar
 * - Bold name & verified badge
 * - Contact info
 * - Sleek "Edit Profile" pill action
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  onEditPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const name = user?.name || 'Tasklync Customer';
  const phone = user?.phone || '+92 300 0000000';
  const isVerified = user?.is_verified ?? true;

  return (
    <View style={styles.container}>
      {/* Compact Avatar Anchor */}
      <AvatarUploadRing
        imageUri={user?.avatar_url}
        name={name}
        size={68}
        strokeWidth={3}
        onPress={onEditPress}
      />

      {/* User Info Block */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {name}
          </Text>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <UserCheck size={12} color={colors.primaryDark} strokeWidth={2.4} />
            </View>
          )}
        </View>

        <Text style={styles.userPhone}>{phone}</Text>

        {/* Compact Edit Profile CTA Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.editButton}
          onPress={onEditPress}
          accessibilityRole="button"
          accessibilityLabel="Edit Profile Details"
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  userName: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorderSubtle,
  },
  userPhone: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 2,
    gap: 5,
  },
  editButtonText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
});
