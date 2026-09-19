import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserCheck, Edit3 } from 'lucide-react-native';
import { UserProfile } from '../../types/user.types';
import { AvatarUploadRing } from './AvatarUploadRing';
import { colors, fontFamily, radius } from '../../design';

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
          <Edit3 size={12} color={colors.primaryDark} strokeWidth={2.2} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
    color: '#0F172A',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  userPhone: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  editButtonText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
});
